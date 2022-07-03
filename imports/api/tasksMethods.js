import { check } from 'meteor/check';
import { TasksCollection, GatherFacts, GatherFactsAnswers } from '/imports/db/Collections';
import * as lib from './lib';

var Future = Npm.require("fibers/future");
import { fetch, Headers } from "meteor/fetch";
const fs = require('fs');

Meteor.methods({
  'getWordRecording'( word ){
    // Get recording just made from ~/Downloads
    const mp3Only = function(list){
      let op = [];
      for ( let i=0; i < list.length; i++ ) {
        const n = list[i];
        if ( n.substr(n.length - 4,4) === '.mp3') op.push(n);
      }
      return op;
    };
    const allNumbers = function(v){
      const list = '1234567890._mp';
      for ( let i=0; i < v.length; i++ ) {
        const c = v.substr(i,1);
        if ( list.indexOf(c) < 0 ) return false;
      }
      return true;
    };
    const getTarget = function(){
      for ( let i=0; i < retObj.readdir.length; i++ ) {
        const n = retObj.readdir[i];
        if ( allNumbers(n) ) return n;
      }
      return '';
    };

    const createFile = function(){
      // rename current file 
      if ( retObj.target ) {
        retObj.oldPath = sprintf('%s/%s',retObj.path, retObj.target);
        retObj.newPath = sprintf('%s/%s.mp3',retObj.path, retObj.word);
        fs.renameSync(retObj.oldPath, retObj.newPath)

        retObj.fromPath = retObj.newPath;
        retObj.toPath = sprintf('/Users/donjones/meteor/read/public/audio/%s.mp3',retObj.word);
        fs.copyFileSync( retObj.fromPath, retObj.toPath );

        retObj.toPath2 = sprintf('/Users/donjones/meteor/read/private/audio/%s.mp3',retObj.word);
        fs.copyFileSync( retObj.fromPath, retObj.toPath2 );
      }
    };

    let retObj = { word: word };
    const path = '/Users/donjones/Downloads';
    retObj.path = path;
    retObj.readdir = mp3Only( fs.readdirSync(path) );
    retObj.target = getTarget();
    createFile();

    return retObj;
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
