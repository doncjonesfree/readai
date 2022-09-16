import { check } from 'meteor/check';
import { Students, TasksCollection, GatherFacts, GatherFactsAnswers, AudioFiles, DrawConclusions, Users } from '/imports/db/Collections';
import * as lib from './lib';

var Future = Npm.require("fibers/future");
import { fetch, Headers } from "meteor/fetch";

const fs = require('fs');
const util = require('util');
const textToSpeech = require('@google-cloud/text-to-speech');

Meteor.methods({
  'loadStudents': function(user){
    return Students.find( { user_id: user._id }).fetch();
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
    }
    return { error: true, message: sprintf('Bad collection %s',collection) };
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
          if ( list.indexOf(r.email) < 0 || Meteor.isDevelopment ) op.push(r);
        }
        return op;
      break;
    }
    return [];
  },
  'collectionInsert': function( collection, doc ){
    switch ( collection ) {
      case 'Users':
        return { id: Users.insert(doc) };
      break;
    }
    return { error: sprintf('No collection "%s"',collection)}
  },
  'fillInDefinitions'(){
    let future=new Future();

    const processUndefinedWords = function( list, ix, op, callback ){
      // get definition, create definition mp3 if found and store results in AudioFiles collection
      if ( ix < list.length ) {
        const r = list[ix];
        op.count += 1;
        // Written to process a list of words, but here we just want to process one word
        getDefs( [r], 0, [], function(results){
          // results = [ { id: word: def: } ]
          console.log('jones22b %s results found',results.length);
          if ( r.def ) {
            Meteor.setTimeout(function(){
              googleCreateMp3(r.word, r.def );
              let doc = { definition: true };
              console.log('jones22c',ix,r.word,r.def);
              AudioFiles.update(r.id, { $set: doc });
              processUndefinedWords( list, ix+1, op, callback );
            },6000);
          } else {
            let doc = { definition: 'failed' };
            op.failed += 1;
            console.log('jones22d',ix,r.word,doc);
            AudioFiles.update(r.id, { $set: doc });
            processUndefinedWords( list, ix+1, op, callback );
          }
        });
      } else {
        callback( op );
      }
    };

    const recs = AudioFiles.find({ definition: false },{ limit: 2 }).fetch();
    console.log('jones22a %s records read',recs.length);
    processUndefinedWords( recs, 0, { count: 0, failed: 0 }, function( processResults ){
      console.log('jones22e done');
      future.return( processResults );
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
            googleCreateMp3(word);
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
  'wordExists'( arg ){
    const word = arg.toLowerCase();

    let retObj = { word: word, audio: false, definition: false };
    const recs = AudioFiles.find({ word: word }).fetch();
    if ( recs.length > 0 ) {
      retObj.audio = true;
      if ( recs[0].definition ) retObj.definition = true;
    }

    return retObj;
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

      googleCreateMp3(word);
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
  'findCollection'( collection, find ){
    let retObj = { success: true, updates: 0 };
    switch ( collection) {

      case 'DrawConclusions':
      return DrawConclusions.find(find).fetch();
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
  'updateCollection'( changes ){
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
      }
    }
    if ( retObj.updates === 0 ) retObj.success = false;
    return retObj;
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

const googleCreateMp3 = function(word, sentences ){
  // Create mp3 file and store results in audio collection
  // create the mp3 file
  const client = new textToSpeech.TextToSpeechClient();

  let text = word;
  if ( sentences ) text = sentences;
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
    if ( sentences ) {
      fullPath = sprintf("/Users/donjones/meteor/read/public/definition/%s.mp3",word);
    } else {
      fullPath = sprintf("/Users/donjones/meteor/read/public/audio/%s.mp3",word);
    }
    await writeFile( fullPath,response.audioContent,'binary');
  };
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
          googleCreateMp3(o.word);
        }
        createAudio( list, ix+1, callback );
      });
    } else {
      if ( o.needWord ) {
        console.log('createAudio word=%s %s of %s (needs word)',o.word,ix+1,list.length);
        googleCreateMp3(o.word);
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
              googleCreateMp3(word, list.join('\n\n'));
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
        console.log('jones610b1',res);
        try {
          return res.json()
        } catch(err){
          console.log('jones610b4',err);
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
    console.log('jones655 getDefs %s',r.word);
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
