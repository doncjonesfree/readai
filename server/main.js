import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { TasksCollection, GatherFacts } from '/imports/db/Collections';
import '/imports/api/tasksMethods';
import '/imports/api/tasksPublications';

import * as lib from '../imports/api/lib';

const fs = require('fs');

const insertTask = ( taskText, user ) => TasksCollection.insert({
   text: taskText,
   userId: user._id,
   createdAt: new Date(),
 });

const SEED_USERNAME = 'meteorite';
const SEED_PASSWORD = 'password';

Meteor.startup(() => {
  if (!Accounts.findUserByUsername(SEED_USERNAME)) {
    Accounts.createUser({
      username: SEED_USERNAME,
      password: SEED_PASSWORD,
    });
  }

  const user = Accounts.findUserByUsername(SEED_USERNAME);

  if (TasksCollection.find().count() === 0) {
    [
      'First Task',
      'Second Task',
      'Third Task',
      'Fourth Task',
      'Fifth Task',
      'Sixth Task',
      'Seventh Task'
    ].forEach(taskText => insertTask(taskText, user))
  }

  loadGatherFacts();

});

const loadGatherFacts = function(){
  // If not defined - create gather facts collection

  let list = []; // list of records

  const makeObject = function(headings,line){
    let obj = {};
    if ( lib.verifyInteger(line[0] )) {
      for ( let i=0; i < headings.length; i++ ) {
        const h = headings[i];
        const v = line[i];
        if ( v ) obj[h] = v.trim();
      }
      list.push(obj);
    } else {
      // add to previous value
      const ix = list.length - 1;
      if ( ix < 0 ) console.log('Error in line 63 main.js');
      if ( ix >= 0 ) {
        obj = list[ix];
        for ( let i=5; i < headings.length; i++ ) {
          const h = headings[i];
          let v = line[i-5];
          if ( typeof(v) === 'string') v = v.trim();
          if ( lib.verifyInteger(v) ) v = lib.int(v);
          if ( v ) {
            if ( i === 5 ) {
              obj.Paragraph += v;
            } else {
              if ( v ) obj[h] = v;
            }
          }
        }
        list[ix] = obj;
      }
    }
    return obj;
  };

  if ( ! GatherFacts.find().count() ) {
    // const fullPath = Assets.absoluteFilePath('rpt/gatherfacts.rpt');
    const fullPath = Assets.absoluteFilePath('rpt/gftest2.txt');

    let contents = fs.readFileSync(fullPath, 'binary').split('\n');
    let headings = [];
    for ( let i=0; i < contents.length; i++ ) {
      const raw = contents[i];
      console.log('jones44 ------------------------------------');
      console.log('jones44a i=%s raw=%s',i,raw);
      const line = raw.split('\t');
      if ( i === 0 ) {
        headings = line;
        console.log('jones44b headings',headings);
      } else {
        console.log('jones44c',makeObject(headings,line));
      }
      if ( i > 10 ) break;
    }
    console.log('jones100',list);
  }
};
