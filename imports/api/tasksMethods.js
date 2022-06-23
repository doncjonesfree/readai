import { check } from 'meteor/check';
import { TasksCollection, GatherFacts, GatherFactsAnswers } from '/imports/db/Collections';
import * as lib from './lib';

var Future = Npm.require("fibers/future");
import { fetch, Headers } from "meteor/fetch";
const fs = require('fs');

Meteor.methods({
  'DictionaryLookup'( word ){
    let future=new Future();

    try {
      let lcWord = word.toLowerCase();
      if ( lcWord === 'its') lcWord = 'itsadjective';
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
