import { check } from 'meteor/check';
import { Students, TasksCollection, GatherFacts, GatherFactsAnswers, AudioFiles, DrawConclusions, Users, LessonHistory, WordList, Definitions, WordPoints } from '/imports/db/Collections';
import * as lib from './lib';

var Future = Npm.require("fibers/future");
import { fetch, Headers } from "meteor/fetch";
import { getNextLesson, getEasierGFLesson, getEasierDCLesson, saveLessonHistory, dcSaveLessonHistory, addPoints } from "../../server/lessons"
import { backupToText, restoreFromText } from '../../server/backup';
import { checkS3 } from '../../server/utils';
import { getObject, uploadS3 } from '../../server/aws';
import { openAiQuestion, getKeywords, getHardestWords } from "../../server/openai"
import { getAssemblyAIToken } from '../../server/assemblyai';

const fs = require('fs');
const mailgun = require("mailgun-js");
const util = require('util');
const textToSpeech = require('@google-cloud/text-to-speech');

const trim = function(arg){
  let w = arg.replace(/,/g,'');
  return w.replace(/\./g,'');
};

const getPastWords = function(op,id){
  // Get the # of past words requested
  const count = 8 - op.length;
  const recs = WordList.find( { student_id: id, active: false }, { sort: { created: -1 }}).fetch();
  let past = [];
  for ( let i=0; i < recs.length; i++ ) {
    const w = trim( recs[i].word );
    if ( w && op.indexOf(w) < 0 ) past.push(w);
    if ( past.length >= count ) break;
  }
  if ( past.length < count ) {
    // we need more words
    const recs = WordList.find( { active: false }, { sort: { created: -1 }}).fetch();
    for ( let i=0; i < recs.length; i++ ) {
      const w = trim( recs[i].word );
      if ( w && op.indexOf(w) < 0 ) past.push(w);
      if ( past.length >= count ) break;
    }
  }
  return past;
};

Meteor.methods({
  pastWords: function(student_id,currentWords){
    return getPastWords(currentWords,student_id);
  },
  checkStudyWords: function(id){
    // Before starting a regular lesson, see if the student has study words to review
    let op = [];

    let recs = WordList.find( { student_id: id, active: true }).fetch();
    recs.sort( function(a,b){
      // put the words the don't know on top
      aKnows = 0;
      if ( a.knowsDef ) aKnows += 1;
      if ( a.knowsWord ) aKnows += 1;
      bKnows = 0;
      if ( b.knowsDef ) bKnows += 1;
      if ( b.knowsWord ) bKnows += 1;
      if ( aKnows < bKnows ) return -1;
      if ( aKnows > bKnows ) return 1;

      // then put the oldest first
      let aDate = a.created;
      if ( a.updated ) aDate = a.updated;
      let bDate = b.created;
      if ( b.updated ) bDate = b.updated;
      if ( aDate < bDate ) return -1;
      if ( aDate > bDate ) return 1;
      return 0;
    });

    // just the words
    for ( let i=0; i < recs.length; i++ ) {
      const r = recs[i];
      const w = trim(r.word);
      if ( w === r.word ) {
        if ( w && op.indexOf(w) < 0 ) op.push(w);
      } else {
        // word stored in collection has period or comma.  This was saved in error
        // so remove this from collection
        WordList.remove(r._id);
      }
    }
    if ( op.length === 0 ) {
      return { active: false };
    } else if ( op.length >= 8 ) {
      return { active: true, list: op, pastWords: {} };
    } else {
      // we need to add some past words so we have some alternate definitions to choose from
      const past = getPastWords(op,id);
      let pastWords = {};
      for ( let i=0; i < past.length; i++ ) {
        const w = past[i];
        pastWords[w] = true;
        op.push(w);
      }
      return { active: true, list: op, pastWords: pastWords };
    }
    return op;
  },
  removeWordsWeKnow: function( wordList, student_id ){
    // return a list of words we already know
    let obj = {};
    for ( let i=0; i < wordList.length; i++ ) {
      obj[ wordList[i] ] = true;
    }
    let op = [];
    const recs = WordList.find( { student_id: student_id, active: false }).fetch();
    for ( let i2=0; i2 < recs.length; i2++ ) {
      const r = recs[i2];
      if ( obj[r.raw_word] ) {
        op.push(r.raw_word);
      } else if ( obj[r.word] ) {
        op.push(r.word);
      }
    }
    return op;
  },
  saveWord: function( raw_word, type, success, student_id ){
    /*
    success = false - Student doesn't know the word - add it to the word list.  Points already accounted for.
    success = true - student knows either the def or word - mark success that that part
                     if both successful, mark work not active
    type = 'word' or 'def' depending on what they don't know
    record: { active: true, points: 0, raw_word: "enough", student_id: "SEhvA5hbk2Tgo5fZs",
              when: "2022-12-13 20:30:31", word: "enough", _id: "S4JstH4J46vC8RCrK" }
    */
    // WordList.remove({ student_id: student_id }); // jones temp
    const word = trim( raw_word.toLowerCase() );
    if ( ! word ) return; // ignore if blank word
    let retObj = { word: raw_word, type: type, student_id: student_id };
    retObj.WordList = WordList.find( { student_id: student_id, word: word }).fetch();
    let doc = {};
    if ( retObj.WordList.length > 0 ) {
      const r = retObj.WordList[0];
      doc.updated = lib.today();
      doc.knowsWord = r.knowsWord;
      doc.knowsDef = r.knowsDef;
      if ( type === 'def' ) {
        doc.knowsDef = success;
      } else {
        doc.knowsWord = success;
      }
      doc.active = true;
      if ( doc.knowsWord && doc.knowsDef ) doc.active = false;
      WordList.update(r._id, { $set: doc });
      retObj.updated = true;
    } else {
      doc.word = word;
      doc.raw_word = raw_word;
      doc.created = lib.today();
      doc.active = true;
      doc.student_id = student_id;
      doc.knowsWord = false;
      doc.knowsDef = false;
      if ( type === 'def' ) {
        doc.knowsDef = success;
      } else {
        doc.knowsWord = success;
      }
      retObj.inserted = true;
      WordList.insert(doc);
    }
    retObj.doc = doc;
    return retObj;
  },
  addToWordPoints: function( student, word, definition, points ){
    // definition: if true, then the points were awarded for the definition selected correctly
    let retObj = { student: student, word: word, definition: definition, points: points };
    const recs = WordPoints.find( { word: word, student_id: student._id }).fetch();
    retObj.recs = recs;
    let doc = {};
    if ( recs.length === 0 ) {
      doc.student_id = student._id;
      doc.word = word;
      doc.knowsDefinition = definition;
      doc.points = points;
      doc.created = lib.today();
      retObj.doc = doc;
      retObj.inserted = true;
      WordPoints.insert(doc);
    } else {
      const r = recs[0]; // should only be one record
      if ( ! r.knowsDefinition ) doc.knowsDefinition = definition;
      doc.points = r.points + points;
      doc.updated = lib.today();
      retObj.doc = doc;
      retObj.inserted = false;
      WordPoints.update(r._id, { $set: doc });
    }
    return { success: true };
  },
  testVocabulary: function( word, wordList ){
    let retObj = { word: word, wordList: wordList };

    const stripWord = function(r){
      // strip the word from the definition.  Sometimes the word is included even though we asked that it be omitted
      const lcText = r.text.toLowerCase();
      const ix = lcText.indexOf( r.word );
      if ( ix >= 0 ) {
        return sprintf('%s__________%s',r.text.substr(0,ix), r.text.substring(ix + r.word.length ));
      }
      return r.text;
    };

    const formList = function(){
      let op = [];
      let obj = {};
      // first creat the entry for the "word"
      for ( let i=0; i < retObj.recs.length; i++ ) {
        const r = retObj.recs[i];
        if ( r.word === word ) {
          op.push( { word: r.word, definition: stripWord(r), random: Math.floor(Math.random() * 100) } );
          obj[ r.word ] = true;
          break;
        }
      }
      // now fill in the rest
      let count = 0;
      while ( true ) {
        count += 1;
        if ( count > 100 ) break; // prevents infinite loop - shouldn't happen
        const ix = Math.floor(Math.random() * retObj.recs.length );
        const r = retObj.recs[ix];
        if ( ! obj[ r.word ] ) {
          obj[ r.word ] = true;
          op.push( { word: r.word, definition: stripWord(r), random: Math.floor(Math.random() * 100) } );
          if ( op.length >= 4 ) break;
        }
      }
      op.sort( function(a,b){
        if ( a.random < b.random ) return -1;
        if ( a.random > b.random ) return 1;
        return 0;
      });
      return op;
    };

    retObj.recs = Definitions.find( { word: { $in: wordList }}).fetch();
    retObj.list = formList();
    return retObj.list;
  },
  getHardestWords: function( text ){
    let future=new Future();

    getHardestWords(text,function(results){
      future.return( results );
    });

    return future.wait();
  },
  burned: function(){
    const doc = { uploaded: false };
    Definitions.update("atrjvXCPWnNSBohLJ", { $set: doc });
    return Definitions.find({ word: 'burned'}).fetch();
  },
  getKeywords: function(){
    let future=new Future();

    getKeywords( function( results ){
      future.return( results );
    });

    return future.wait();
  },
  getAssemblyAIKey: function(){
    return Meteor.settings.AssemblyAI;
  },
  getAssemblyAIToken: function(){
    let future=new Future();

    getAssemblyAIToken( function( results ){
      future.return( results );
    });

    return future.wait();
  },
  openAiQuestion: function(){
    // AudioFiles has all words in GF and DC lessons

    let future=new Future();

    let retObj = { added: 0, updated: 0 , errors: [] };

    const defs = Definitions.find().fetch();
    let defObj = {};
    for ( let i=0; i < defs.length; i++ ) {
      const d = defs[i];
      if ( d.text ) {
        if ( typeof(d.text) === 'string' && d.text ) {
          // we already have this definition - no need to repeat
          defObj[ d.word ] = 1;
        } else if ( d.text.txt && ! d.error ) {
          // Not normal case - text should just be a string.
          defObj[ d.word ] = 1;
        } else {
          defObj[ d.word ] = d._id; // indicates which record should be changed
        }
      }
    }

    const addDef = function( list, ix, callback ){
      if ( ix < list.length ) { // jones
        // if ( ix < list.length && retObj.added < 1 && retObj.updated < 1 ) { // jones
        const r = list[ix];
        if ( ix % 100 === 0 ) console.log('%s of %s errors:%s',ix,list.length,retObj.errors.length );
        const v = defObj[ r.word ];
        if ( v && v === 1 ) {
          // ignore and go to next word - we already have this one
          addDef( list, ix+1, callback );
        // } else if ( r.word === 'enter' || r.word === 'entered') {
        //   console.log('jones41 skipped %s',r.word);
        //   addDef( list, ix+1, callback );
        } else {
          const prompt = sprintf('Q: Can you define the word "%s" suitable for a small child without using the word "%s" in the definition?\nA:\nA:',r.word,r.word);
          openAiQuestion( prompt, function( ret ){
            if ( ret.error || ! ret.txt ) {
              // error
              ret.word = r.word;
              ret.success = false;
              retObj.errors.push( ret );
              callback( ret );
            } else {
              let doc = {};
              doc.word = r.word;
              doc.text = ret.txt;
              doc.needsSpeech = true; // needs text to speech
              if ( v ) {
                Definitions.update(v, { $set: doc });
                retObj.updated += 1;
              } else {
                Definitions.insert(doc);
                retObj.added += 1;
              }
              console.log('added:%s updated:%s %s: %s',retObj.added,retObj.updated,doc.word,doc.text);
              addDef( list, ix+1, callback );
            }
          });
        }
      } else {
        callback( { success: true });
      }
    };

    const recs = AudioFiles.find().fetch();
    // get rid of words already defined in recs list
    let recs2 = [];
    for ( let i=0; i < recs.length; i++ ) {
      const r = recs[i];
      const v = defObj[ r.word ];
      if ( ! v || typeof(v) === 'string' ) recs2.push(r);
    }
    addDef( recs2, 0, function(){
      future.return( retObj );
    });

    return future.wait();
  },
  isPinValid: function( v, user ){
    return v === user.pin;
  },
  special: function(){
    // special purpose - run by master

    let retObj = {};

    retObj.Definitions = Definitions.find({},{ fields: { word: 1, text: 1 }}).fetch();
    retObj.bad = [];
    for ( let i=0; i < retObj.Definitions.length; i++ ) {
      let d = retObj.Definitions[i];
      if ( typeof(d.text) !== 'string' ) {
        if ( ! d.text.txt || d.text.error ) retObj.bad.push(d);
      }
    }
    return retObj;

    // Users.remove("EvYA7tLewwHZLa9iJ")
    // Students.remove("kCWcXtyTm3usskdW8")
    // retObj.users = Users.find().fetch();
    // retObj.students = Students.find().fetch();
    // retObj.history = LessonHistory.find({ student_id: 'kCWcXtyTm3usskdW8'}).fetch();
    // for ( let i=0; i < retObj.history.length; i++ ) {
    //   LessonHistory.remove(retObj.history[i]._id);
    // }
    // return retObj;

    // Users.remove("NbLsEmJTJZjoxRZSs");
    // return Users.find().fetch();

    return 'Special is not active';
  },
  sendEmail: function( data ){
    // data = { from: to: subject: text: }

    let future=new Future();

    const settings = Meteor.settings.mailgun;
    const mg = mailgun({apiKey: settings.apiKey, domain: settings.domain});
    mg.messages().send(data, function (error, body) {
      future.return( { error: error, body: body } );
    });

    return future.wait();
  },
  'S3getObject': function( file ){
    let future=new Future();

    // Check amazon s3 to see which files are missing
    getObject( file, function( results ){
      future.return( results );
    });

    return future.wait();
  },
  'checkS3': function(){
    let future=new Future();

    // Check amazon s3 to see which files are missing
    checkS3( function( results ){
      future.return( results );
    });

    return future.wait();
  },
  'restoreFromText': function(){
    return restoreFromText();
  },
  'backupToText': function(){
    return backupToText();
  },
  'eraseReviewed': function(){
    // erase reviewed from lesson history
    const recs = LessonHistory.find({}).fetch();
    let op = [];
    for ( let i=0; i < recs.length; i++ ) {
      let r = recs[i];
      if ( r.reviewed ) {
        let doc;
        if ( r.lesson_type === 'gf' ) {
          doc = { reviewed: false };
        } else {
          doc = { reviewed: {} };
        }
        LessonHistory.update(r._id, { $set: doc });
        op.push(r);
      }
    }
    return op;
  },
  'knowsWord': function( word, knows, studentId ){
    let retObj = { word: word, knows: knows, studentId: studentId, points: 0, wordCount: 0 };
    retObj.WordList = WordList.find( { student_id: studentId }).fetch();
    const lc_word = word.toLowerCase();
    let found = false;
    for ( let i=0; i < retObj.WordList.length; i++ ) {
      const r = retObj.WordList[i];
      if ( r.active ) retObj.wordCount += 1; // count active words only
      if ( r.word === lc_word ) {
        found = true;
        if ( knows && r.active ) {
          // give them points and mark inactive
          if ( r.points ) {
            // We already have points from a previous session with this word
            retObj.points = 5; // give them 1/2 points
          } else {
            retObj.points = 10;
          }
          retObj.action = { task: 'update', id: r._id, doc: { active: false, points: retObj.points }};
          retObj.wordCount -= 1; // count active words only
        } else if ( knows && ! r.active ) {
          // nothing needs to change
        } else if ( r.active ) {
          // active and does not know - nothing to do
        } else {
          // not active and does not know - make active again
          retObj.action = { task: 'update', id: r._id, doc: { active: true }};
          retObj.wordCount += 1; // count active words only
        }
      }
    }

    if ( ! found && ! knows ) {
      // need to add
      let doc = {};
      doc.student_id = studentId;
      doc.word = lc_word;
      doc.raw_word = word;
      doc.when = lib.today();
      doc.active = true;
      doc.points = 0;
      retObj.action = { task: 'insert', doc: doc };
      retObj.wordCount += 1; // count active words only
    }

    if ( retObj.action ) {
      if ( retObj.action.task === 'insert' ) WordList.insert( retObj.action.doc );
      if ( retObj.action.task === 'update' ) WordList.update(retObj.action.id, { $set: retObj.action.doc });
    }

    return { wordCount: retObj.wordCount, points: retObj.points };
  },
  'loadHistory': function( studentId ){
    // information for student progress screen
    let retObj = {};
    retObj.LessonHistory = LessonHistory.find( { student_id: studentId }, { sort: { when: 1 }}).fetch();
    let words = WordList.find( { student_id: studentId }, { sort: { created: 1 }}).fetch();
    retObj.wordList = words;
    return retObj;
  },
  'dcSaveLessonHistory': function( lesson, studentId ){
    return dcSaveLessonHistory( lesson, studentId );
  },
  'saveLessonHistory': function( doc ){
    return saveLessonHistory( doc );
  },
  'getEasierDCLesson': function( lesson_id, student_id, GradeLevel, direction ){
    return getEasierDCLesson( lesson_id, student_id, GradeLevel, direction );
  },
  'getEasierGFLesson': function( lesson_id, student_id, GradeLevel, direction ){
    return getEasierGFLesson( lesson_id, student_id, GradeLevel, direction );
  },
  'getNextLesson': function( StudentId ){
    return getNextLesson( StudentId );
  },
  'restoreInactiveStudents': function(user){
    const addInactive = function(list){
      let op = [];
      for ( let i=0; i < list.length; i++ ) {
        let r = list[i];
        const doc = { inactive: false };
        if ( r.inactive ) {
          r.inactive = false;
          Students.update(r._id, { $set: doc });
        }
        op.push(r);
      }
      return op;
    };
    let recs = addInactive( Students.find( { user_id: user._id }, { sort: { name: 1 }}).fetch() );
    addPoints( recs );
    return recs;
  },
  'loadStudents': function(user ){
    const removeInactive = function(list){
      let op = [];
      for ( let i=0; i < list.length; i++ ) {
        const r = list[i];
        if ( ! r.inactive ) op.push(r);
      }
      return op;
    };
    // let recs = removeInactive( Students.find( { user_id: user._id }, { sort: { name: 1 }}).fetch() );
    let recs = Students.find( { user_id: user._id }, { sort: { name: 1 }}).fetch();
    addPoints( recs );
    return recs;
  },
  'loadAllStudents': function(){
    return Students.find( {}, { sort: { name: 1 }}).fetch();
  },
  'historyLessonRemove': function(id){
    // given student id - erase all history for that student
    let retObj = { id: id, removed: 0 };
    const recs = LessonHistory.find({ student_id: id },{ fields: { student_id: 1 }}).fetch();
    for ( let i=0; i < recs.length; i++ ) {
      const r = recs[i];
      LessonHistory.remove(r._id);
      retObj.removed += 1;
    }
    return retObj;
  },
  'historyLessonCount': function(){
    const recs = LessonHistory.find({},{ fields: { student_id: 1 }}).fetch();
    let obj = {};
    for ( let i=0; i < recs.length; i++ ) {
      const r = recs[i];
      if ( ! obj[ r.student_id] ) obj[ r.student_id] = 0;
      obj[ r.student_id] += 1;
    }
    return obj;
  },
  'deleteUser': function(id){
    const doc = { inactive: true };
    Users.update(id, { $set: doc });
  },
  'masterUser': function( email ){
    const list = Meteor.settings.masterUsers;
    return list.indexOf(email) >= 0;
  },
  'collectionUpdate': function( collection, id, doc ){
    switch ( collection ) {
      case 'Users':
        Users.update(id, { $set: doc });
        return { success: true };
      break;

      case 'Students':
        Students.update(id, { $set: doc });
        return { success: true };
      break;

      case 'LessonHistory':
        LessonHistory.update(id, { $set: doc });
        return { success: true };
      break;
    }
    return { error: true, message: sprintf('Bad collection %s',collection) };
  },
  'collectionUpdateList'( changes ){
    let retObj = { success: true, updates: 0 };
    for ( let i=0; i < changes.length; i++ ) {
      const c = changes[i];
      switch ( c.collection) {

        case 'DrawConclusions':
        DrawConclusions.update(c.id, { $set: c.doc });
        retObj.updates += 1;
        break;

        case 'GatherFactsAnswers':
        GatherFactsAnswers.update(c.id, { $set: c.doc });
        retObj.updates += 1;
        break;

        case 'GatherFacts':
        GatherFacts.update(c.id, { $set: c.doc });
        retObj.updates += 1;
        break;

        case "LessonHistory":
        LessonHistory.update(c.id, { $set: c.doc });
        retObj.updates += 1;
        break;
      }
    }
    if ( retObj.updates === 0 ) retObj.success = false;
    return retObj;
  },
  'collectionRemove': function( collection, id ){
    // remove specific _ids from given collection 
    switch ( collection ) {
      case 'Users':
      if ( Array.isArray(id) ){
        for ( let i=0; i < id.length; i++ ){
          Users.remove(id[i]);
        }
      } else {
        Users.remove(id);
      }
      break;
    }
  },
  'collectionFind': function( collection, find ){
    switch ( collection ) {
      case 'Users':
        const list = Meteor.settings.masterUsers;
        const recs = Users.find(find).fetch();
        let op = [];
        // don't let master users through unless in dev mode
        for ( let i=0; i < recs.length; i++ ) {
          const r = recs[i];
          // jones - temporarily let master user in production mode
          // if ( list.indexOf(r.email) < 0 || Meteor.isDevelopment ) op.push(r);
          op.push(r);
        }
        return op;
      break;

      case 'DrawConclusions':
      return DrawConclusions.find(find).fetch();
      break;

      case 'LessonHistory':
      return LessonHistory.find(find).fetch();
      break;

      case 'GatherFactsAnswers':
      return GatherFactsAnswers.find(find).fetch();
      break;

      case 'GatherFacts':
      return GatherFacts.find(find).fetch();
      break;
    }
    return [];
  },
  'collectionInsert': function( collection, doc ){
    switch ( collection ) {
      case 'Users':
      return { id: Users.insert(doc) };
      break;

      case 'Students':
      return { id: Students.insert(doc) };
      break;
    }
    return { error: sprintf('No collection "%s"',collection)}
  },
  'definitionsToS3'(){
    // Take text definition, convert to speech and store in S3
    let future=new Future();

    const processUndefinedWords = function( list, ix, op, callback ){
      // get definition, create definition mp3 if found and store results in AudioFiles collection
      if ( ix < list.length ) {
        const r = list[ix];
        op.count += 1;
        // Written to process a list of words, but here we just want to process one word
        if ( r.text ) {
          Meteor.setTimeout(function(){
            // convert definition to speech (mp3)
            const directory = '/Users/donjones/Downloads/tempAudio';
            if ( r.word === 'really') {
              r.text = r.text.replace(/ exceptionally;/g,'');
            }
            if ( r.text.length >= 5000 ) {
              console.log('skipped %s (%s of %s) too long',r.word,ix,list.length);
              processUndefinedWords( list, ix+1, op, callback );
            } else {
              console.log('processing %s (%s of %s)',r.word,ix,list.length);
              googleCreateMp3( { word: r.word, sentences: r.text, createOnly: true, outputTo: directory }, function(){
                // upload mp3 to amazon S3
                const fullPath = sprintf('%s/%s.mp3',directory,r.word);
                const file = sprintf('AIDefinition/%s.mp3',r.word);
                uploadS3( fullPath, file,  Meteor.bindEnvironment( function(){
                  let doc = { uploaded: true, needsSpeech: false };
                  Definitions.update(r._id, { $set: doc });
                  processUndefinedWords( list, ix+1, op, callback );
                }));
              });
            }
          },6000); // wait 6 seconds before each call to avoid making too many calls
        } else {
          let doc = { definition: 'failed' };
          op.failed.push( r.text );
          processUndefinedWords( list, ix+1, op, callback );
        }
      } else {
        callback( op );
      }
    };

    //const recs = Definitions.find({ uploaded: { $ne: true }}).fetch();
    const recs = Definitions.find({ needsSpeech: true }).fetch();
    // recs = [ { word: text: } ];
    processUndefinedWords( recs, 0, { count: 0, failed: [] }, function( processResults ){
      future.return( { results: processResults, rec: recs } );
    });

    return future.wait();
  },
  'createAudioDrawConclusions'(){
    // just for initial creating of audio files for drawing conclusions lessons
    return 'createAudioDrawConclusions turned off';
    let future=new Future();

    createAudioDrawConclusions(function( results ){
      future.return( results );
    });

    return future.wait();
  },
  'createDefinitionAudio'( allWords ){
    // Create audio file for all single definitions
    let future=new Future();

    createDefinitionAudio( allWords, function(results){
      future.return( results );
    });

    return future.wait();
  },
  'createAllSingleWordAudio'( allWords ){
    // Create audio file for all single words given
    let future=new Future();

    let count = 0;
    const makeAudio = function(ix, callback){
      if ( ix < allWords.length ) {
        const word = allWords[ix].word;
        recs = AudioFiles.find( { word: word }).fetch();
        if ( recs.length === 0 ) {
          // need to create this word

          // Max 11 requests per minute allowed from google
          Meteor.setTimeout(function(){
            console.log('Creating mp3 for "%s" %s of %s',word,ix+1,allWords.length);
            googleCreateMp3({ word: word });
            count += 1;
            makeAudio(ix+1, callback);
          },6000);
        } else {
          makeAudio(ix+1, callback);
        }
      } else {
        callback();
      }
    };
    makeAudio(8380, function(){
      future.return( { success: true, count: count } );
    });

    return future.wait();
  },
  'googlePlaySound'( arg ){
    let word = arg;
    // If word sound already exists, return the url, else create the mp3 and return the url
    if ( word.substr(0,1) === '*') {
      // actually we want the definition instead of the word
      word = word.substring(1);
      const recs = AudioFiles.find( { word: word }).fetch();
      if ( recs.length > 0 ) return recs[0];
      return '';
    } else {
      const recs = AudioFiles.find( { word: word }).fetch();
      if ( recs.length > 0 ) return recs[0];

      googleCreateMp3({ word: word });
    }
  },
  'textToSpeech'( text ){ // deprecated
    const client = new textToSpeech.TextToSpeechClient();

    // const process.env.MY_VAR = "Hello world";
    // console.log('MY_VAR=',process.env.MY_VAR);

    async function convertTextToMp3(){
      const request = {
        input: { text: text },
        voice: { languageCode:'en-US', ssmlGender:'NEUTRAL'},
        audioConfig:{ audioEncoding:'MP3'}
      }
      const [response] = await client.synthesizeSpeech(request);

      const writeFile = util.promisify(fs.writeFile);

      await writeFile("/Users/donjones/meteor/read/public/output.mp3",response.audioContent,'binary');

      console.log('Text to speech has completed');
    };
    convertTextToMp3();
    return google;
  },
  'getFile'( fileName ){
    // get file from private assets
    let path,fullPath;
    if (Meteor.isDevelopment) {
      path = '/Users/donjones/meteor/read/private/dummy.txt';
    } else {
      path = Assets.absoluteFilePath('dummy.txt');
    }
    fullPath = path.replace('dummy.txt',fileName);
    return JSON.parse( fs.readFileSync(fullPath) );
  },
  'saveFile'( fileName, data ){
    // save file in private assets
    let path,fullPath;
    if (Meteor.isDevelopment) {
      path = '/Users/donjones/meteor/read/private/dummy.txt';
    } else {
      path = Assets.absoluteFilePath('dummy.txt');
    }
    fullPath = path.replace('dummy.txt',fileName);
    fs.writeFileSync(fullPath,data);
    return fullPath;
  },
  'DictionaryLookup'( word ){
    let future=new Future();

    try {
      let lcWord = word.toLowerCase();
      if ( lcWord === 'its') lcWord = 'itsadjective';
      if ( lcWord === "i'll") lcWord = 'i_ll';
      const ix = lcWord.indexOf("'");
      if ( ix > 0 ) {
        lcWord = lcWord.substr(0,ix);
        word = lcWord;
      }
      const fullPath = Assets.absoluteFilePath( sprintf('audio/%s.mp3',lcWord) );
      const url = sprintf('http://localhost:3000/audio/%s.mp3',lcWord);
      future.return( [ { phonetics: [ { audio: url } ] } ]);
    } catch(e){
      try {
        const url = sprintf('https://api.dictionaryapi.dev/api/v2/entries/en/%s',word);

        fetch(url)
          .then(response => response.json())
          .then(data => future.return( data));
      } catch(e) {
        console.log('Problem in dictionary lookup for "%s"',word);
        future.return('');
      }
    }


    return future.wait();

  },
  'dcGradeLevels'(){
    let retObj = {};
    const fields = { GradeLevel: 1 };
    const recs = DrawConclusions.find({},{ fields: fields }).fetch();
    let obj = {};
    for ( let i=0; i < recs.length; i++ ) {
      const r = recs[i];
      if ( ! obj[ r.GradeLevel ] ) obj[ r.GradeLevel ] = 0;
      obj[ r.GradeLevel ] += 1;
    }
    let op = [];
    for ( let grade in obj ) {
      if ( lib.hasOwnProperty(obj,grade)){
        const v = obj[ grade ];
        op.push( { GradeLevel: grade, count: v });
      }
    }
    op.sort( function(a,b){
      if ( lib.float(a.GradeLevel) < lib.float(b.GradeLevel) ) return -1;
      if ( lib.float(a.GradeLevel) > lib.float(b.GradeLevel) ) return 1;
      return 0;
    });
    return op;
  },
  'loadDrawConclusions'(GradeLevel){
    // checkForBadCharactersDrawConclusions(); -- fixed one problem I found
    return DrawConclusions.find({ GradeLevel: GradeLevel }, { sort: { Shape: 1, Number: 1, QuestionNum: 1 }}).fetch();
  },
  'loadGatherFacts'( src ) {
    let retObj = {};
    retObj.GatherFacts = GatherFacts.find(src).fetch();
    if ( retObj.GatherFacts.length > 0 ) {
      const list = lib.makeList( retObj.GatherFacts, 'LessonNum' );
      retObj.GatherFactsAnswers = GatherFactsAnswers.find({ LessonNum: { $in: list }}).fetch();
    }
    return retObj;
  },

  'tasks.remove'(taskId) {
    check(taskId, String);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    const task = TasksCollection.remove(taskId);

    if ( ! task ) {
      throw new Meteor.Error('Access Denied');
    }
  },

  'tasks.setIsChecked'(taskId, isChecked) {
    check(taskId, String);
    check(isChecked, Boolean);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    const task = TasksCollection.findOne({ _id: taskId, userId: this.userId });

    if ( ! task ) {
      throw new Meteor.Error('Access Denied');
    }

    TasksCollection.update(taskId, {
      $set: {
        isChecked
      }
    });
  }
});

const googleCreateMp3 = function( arg, callback ){
  // Create mp3 file and store results in audio collection
  // create the mp3 file

  const word = arg.word;
  const sentences = arg.sentences;
  const createOnly = arg.createOnly;
  const outputTo = arg.outputTo;

  const client = new textToSpeech.TextToSpeechClient();

  let text = word;
  if ( sentences ) {
    text = sentences;
    if ( typeof(text) === 'object' ) {
      if ( text.txt ) {
        text = text.txt;
      } else {
        console.log('Object error in googleCreateMp3 line 712',arg);  throw 'Error';
      }
    }
  }
  async function convertTextToMp3(){
    let request = {
      input: { text: text },
      voice: { languageCode:'en-US', ssmlGender:'NEUTRAL'},
      audioConfig:{ audioEncoding:'MP3'}
    }

    // slow down when speaking sentences
    if ( sentences ) request.audioConfig.speakingRate = 0.8;
    const [response] = await client.synthesizeSpeech(request);

    const writeFile = util.promisify(fs.writeFile);

    let fullPath;
    if ( outputTo ) {
      fullPath = sprintf("%s/%s.mp3",outputTo,word);
    } else if ( sentences ) {
      fullPath = sprintf("/Users/donjones/meteor/read/public/definition/%s.mp3",word);
    } else {
      fullPath = sprintf("/Users/donjones/meteor/read/public/audio/%s.mp3",word);
    }
    await writeFile( fullPath,response.audioContent,'binary');
  };
  if ( createOnly ) {
    return convertTextToMp3()
    .then(res => {
      if ( callback ) callback();
    })
  } else {
    convertTextToMp3();

    let doc = { word: word, url: sprintf('/audio/%s.mp3',word)};
    if ( sentences ) doc.definition = true;
    const recs = AudioFiles.find( { word: word }).fetch();
    if ( recs.length === 0 ) {
      // Only insert if not alread in the collection
      AudioFiles.insert(doc); // make a note so we don't have to generate this word again
    } else if ( sentences ) {
      const doc = { definition: true };
      AudioFiles.update(recs[0]._id, { $set: doc });
    }
  }
};

const checkForBadCharactersDrawConclusions = function(){
  // for initial testing - probably don't need any more
  const recs = DrawConclusions.find().fetch();
  retObj = { bad: 0 }

  const check = function(rec, field){
    let s = rec[field];
    if ( s ) {
      let bad = '';
      let position = 0;

      const ix = s.indexOf('ï¿½');
      if ( ix >= 0 ) {
        bad = sprintf('%s at position %s','ï¿½',ix)
        position = ix;
        s = s.replace(/ï¿½/g,', ');
        let doc = {};
        doc[ field ] = s;
        DrawConclusions.update(rec._id, { $set: doc });
        retObj.bad += 1;
      }
    }
  };

  for ( let i=0; i < recs.length; i++ ) {
    const r = recs[i];
    check( r, 'Question' );
    for ( let i2=1; i2 <= 4; i2++ ){
      check( r, sprintf('Answer%s',i2) );
    }
  }
  if ( retObj.bad > 0 ) console.log('Bad records fixed = %s', retObj.bad );
};

const createAudioDrawConclusions = function( callback ){
  const recs = DrawConclusions.find().fetch();
  console.log('Found %s DrawConclusions records',recs.length);
  const alreadyFormatted = true;
  let uniqueCount = 0;
  let wordObj = {};

  const addToObject = function( words ){
    for ( let i2=0; i2< words.length; i2++ ) {
      const w = words[i2];
      if ( w.length >= 2 && ! wordObj[w] ) wordObj[w] = { word: w, needWord: true, needDef: true };
    }
  };

  const wordList = function( wholeObject ){
    let l = [];
    for ( let w in wordObj ) {
      if ( lib.hasOwnProperty(wordObj,w)){
        if ( wholeObject ) {
          l.push(wordObj[w]);
        } else {
          l.push(wordObj[w].word);
        }
      }
    }
    return l;
  };

  for ( let i=0; i < recs.length; i++ ) {
    const rec = recs[i];
    const tmp = lib.addDivsForLongerWords( rec.Question, uniqueCount );
    uniqueCount = tmp.uniqueCount;
    const words = lib.listWordsFromGFParagraph( tmp.op, alreadyFormatted );
    // add words to object
    addToObject( words );
    for ( let i2=1; i2 <= 4; i2++ ) {
      const a = rec[ sprintf('Answer%s',i2)];
      if ( a ) {
        const tmp = lib.addDivsForLongerWords( a, uniqueCount );
        uniqueCount = tmp.uniqueCount;
        const words = lib.listWordsFromGFParagraph( tmp.op, alreadyFormatted );
        // add words to object
        addToObject( words );
      }
      let list = wordList();
      const audioRecs = AudioFiles.find({ word: { $in: list } }).fetch();
      for ( let i3=0; i3 < audioRecs.length; i3++ ) {
        const ar = audioRecs[i3];
        if ( ar.url && ar.definition ) {
          // both word and def are already present
          delete wordObj[ ar.word ];
        } else if ( ar.url ) {
          // no definition
          wordObj[ ar.word ].needWord = false;
        } else if ( ar.definition ) {
          wordObj[ ar.word ].needDef = false;
        }
      }
    }
  }
  const list = wordList( true );
  if ( list.length > 0 ) {
    console.log('Processing %s words',list.length);
    createAudio( list, 0, function(){
      callback( { list: list, wordObj: wordObj } );
    });
  } else {
    console.log('No words to process');
    callback( { list: list, wordObj: wordObj } );
  }
};

const createAudio = function( list, ix, callback ){
  if ( ix < list.length ) {
    const o = list[ix];
    if ( o.needDef ) {
      // we need a definition - lookup it up
      console.log('createAudio word=%s %s of %s (needs definition)',o.word,ix+1,list.length);
      createDefinitionAudio( [o], function(defResults ){
        if ( o.needWord ) {
          console.log('createAudio word=%s %s of %s (needs word)',o.word,ix+1,list.length);
          googleCreateMp3({ word: o.word });
        }
        createAudio( list, ix+1, callback );
      });
    } else {
      if ( o.needWord ) {
        console.log('createAudio word=%s %s of %s (needs word)',o.word,ix+1,list.length);
        googleCreateMp3( { word: o.word });
      } else {
        console.log('createAudio word=%s %s of %s (all good)',o.word,ix+1,list.length);
      }
      createAudio( list, ix+1, callback );
    }
  } else {
    callback();
  }
};

const createDefinitionAudio = function( allWords, callback ){
  // Takes a list of words and creates definition audio for the words if
  // not already defined - and stores the result in AudioFiles
  const obscene = function(arg){
    const s = arg.toLowerCase();
    if ( s.indexOf('pubic') >= 0 ) return true;
    if ( s.indexOf('genital') >= 0 ) return true;
    if ( s.indexOf('sexual') >= 0 ) return true;
    if ( s.indexOf('sex') >= 0 ) return true;
    if ( s.indexOf('lenormand') >= 0 ) return true;

    return false;
  };

  let count = { words: 0, added: 0, failed: 0 };
  const makeAudio = function(ix, callback){
    if ( ix < allWords.length ) {
      count.words += 1;
      const word = allWords[ix].word;
      recs = AudioFiles.find( { word: word }).fetch();
      let found = false; // found definition
      if ( recs.length > 0 ) {
        const r = recs[0];
        // true means we have the definition
        // false means we tried to look it up, but it wasn't there
        // undefined means we haven't tried to find the definition and need to look it up
        if ( r.definition ) found = true;
      }
      if ( allWords[ix].force ) found = false;
      if ( ! found ) {
        // need to lookup this word in the dictionary and create a sound file
        // for the definition

        lib.DictionaryLookup( word, function(results){
          // 901 of 1201 norsemen needs definition - last error
          let list = []; // list of sentences in the definition
          if ( results ) {
            for ( let i=0; i < results.length; i++ ) {
              if ( list.length >= 2 ) break;
              const r = results[i];
              if ( r.meanings ) {
                for ( let i2=0; i2 < r.meanings.length; i2++ ) {
                  if ( list.length >= 2 ) break;
                  const m = r.meanings[i2];
                  if ( m.definitions ) {
                    for ( let i3=0; i3 < m.definitions.length; i3++ ) {
                      if ( list.length >= 2 ) break;
                      const d = m.definitions[i3];
                      if ( d.definition && ! obscene( d.definition ) ) list.push( d.definition );
                    }
                  }
                }
              }
            }
          }
          if ( list.length > 0 ) {
            // Max 11 requests per minute allowed from google
            Meteor.setTimeout(function(){
              if ( allWords.length.length === 1 ) {
                console.log('Creating definition mp3 for "%s"',word);
              } else {
                console.log('Creating definition mp3 for "%s" %s of %s',word,ix+1,allWords.length);
              }
              googleCreateMp3({ word: word, sentences: list.join('\n\n') } );
              count.added += 1;
              makeAudio(ix+1, callback);
            },6000);
          } else {
            count.failed += 1;
            console.log('No definition found for "%s"',word);
            const recs = AudioFiles.find( { word: word }).fetch();
            if ( recs.length === 0 ) {
              // Only insert if not alread in the collection
              let doc = { word: word, url: '' };
              doc.definition = false;  // so we don't have to look it up again
              AudioFiles.insert(doc); // make a note so we don't have to generate this word again
            } else {
              if ( typeof(recs[0].definition) === 'undefined' ) {
                const doc = { definition: false };
                AudioFiles.update(recs[0]._id, { $set: doc });
              }
            }
            makeAudio(ix+1, callback);
          }
        });
      } else {
        makeAudio(ix+1, callback);
      }
    } else {
      callback();
    }
  };
  makeAudio(0, function(){
    callback( { success: true, count: count } );
  });
};

function oxfordDictionary( word ){
  // see: https://docs.meteor.com/packages/fetch.html

  const s = Meteor.settings.oxford;
  const language = "en-gb"
  const url = "https://od-api.oxforddictionaries.com:443/api/v2/entries/" + language + "/" + word.toLowerCase();

  try {
    return fetch(url, {
      method: 'GET',
      headers: new Headers( {
        app_id: s.ID,
        app_key: s.Key
      }),
    }).then( res => {
      if ( res.status === 429 && res.statusText === 'Too Many Requests') {
        throw 'Oxford: Too Many Requests!'
      } else {
        try {
          return res.json()
        } catch(err){
          return '';
        }
      }
    })
    .then( data =>  {
      if ( ! data ) return '';
      const defs = getOxfordDefinition(data);
      if ( defs ) return defs;
      return '';
    })
  } catch(err){
    console.log('Error calling oxford',err);
    return '';
  }
};

const getOxfordDefinition = function(data){
  // return the definition from the oxford dictionary api
  let defs = [];
  if ( data && data.results && data.results.length > 0 ) {
    for ( let i=0; i < data.results.length; i++ ) {
      const r = data.results[i];
      if ( r.lexicalEntries && r.lexicalEntries.length > 0 ) {
        for ( let i2=0; i2 < r.lexicalEntries.length; i2++ ) {
          const le = r.lexicalEntries[i2];
          if ( le.entries && le.entries.length > 0 ) {
            for ( let i3=0; i3 < le.entries.length; i3++ ) {
              const e = le.entries[i3];
              if ( e.senses && e.senses.length > 0 ) {
                for ( let i4=0; i4 < e.senses.length; i4++ ) {
                  const s = e.senses[i4];
                  if ( s.definitions && s.definitions.length > 0 ) {
                    for ( let i5=0; i5 < s.definitions.length; i5++ ) {
                      defs.push( s.definitions[i5] );
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  if ( defs.length === 0 ) return '';
  return defs.join('. ')
};

const getDefs = function( recs, ix, results, callback ){
  if ( ix < recs.length ) {
    let r = recs[ix];
    Meteor.setTimeout(function(){
      let def = oxfordDictionary( r.word );
      def.then( (result) => {
        results.push( { id: r._id, word: r.word, def: result });
        getDefs( recs, ix+1, results, callback );
      })
    },3000);
  } else {
    callback( results );
  }
};
