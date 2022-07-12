import { check } from 'meteor/check';
import { TasksCollection, GatherFacts, GatherFactsAnswers, AudioFiles } from '/imports/db/Collections';
import * as lib from './lib';

var Future = Npm.require("fibers/future");
import { fetch, Headers } from "meteor/fetch";

const fs = require('fs');
const util = require('util');
const textToSpeech = require('@google-cloud/text-to-speech');

Meteor.methods({
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
  'googlePlaySound'( word ){
    // If word sound already exists, return the url, else create the mp3 and return the url
    const recs = AudioFiles.find( { word: word }).fetch();
    if ( recs.length > 0 ) return recs[0]; // jones = temporary

    googleCreateMp3(word);
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
      lcWord = lcWord.replace(/'/g,'');
      const fullPath = Assets.absoluteFilePath( sprintf('audio/%s.mp3',lcWord) );
      const url = sprintf('http://localhost:3000/audio/%s.mp3',lcWord);
      future.return( [ { phonetics: [ { audio: url } ] } ]);
    } catch(e){
      const url = sprintf('https://api.dictionaryapi.dev/api/v2/entries/en/%s',word);

      fetch(url)
        .then(response => response.json())
        .then(data => future.return( data));
    }


    return future.wait();

  },
  'updateCollection'( changes ){
    let retObj = { success: true, updates: 0 };
    for ( let i=0; i < changes.length; i++ ) {
      const c = changes[i];
      switch ( c.collection) {
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

const googleCreateMp3 = function(word){
  // Create mp3 file and store results in audio collection
  // create the mp3 file
  const client = new textToSpeech.TextToSpeechClient();

  async function convertTextToMp3(){
    const request = {
      input: { text: word },
      voice: { languageCode:'en-US', ssmlGender:'NEUTRAL'},
      audioConfig:{ audioEncoding:'MP3'}
    }
    const [response] = await client.synthesizeSpeech(request);

    const writeFile = util.promisify(fs.writeFile);

    const fullPath = sprintf("/Users/donjones/meteor/read/public/audio/%s.mp3",word);
    await writeFile( fullPath,response.audioContent,'binary');
  };
  convertTextToMp3();
  const doc = { word: word, url: sprintf('/audio/%s.mp3',word)};
  if ( AudioFiles.find( { word: word }).fetch().length === 0 ) {
    // Only insert if not alread in the collection
    AudioFiles.insert(doc); // make a note so we don't have to generate this word again
  }
};
