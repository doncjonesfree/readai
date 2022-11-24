import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { TasksCollection, GatherFacts, GatherFactsAnswers, DrawConclusions, PowerBuilder } from '/imports/db/Collections';
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
  // console.log('jones21 startup running fillInDefinitions');
  // Meteor.call('fillInDefinitions', function(err,results){
  //   if ( err ) {
  //     console.log('Error: server/main.js line 23',err);
  //   } else {
  //     console.log('jones26',results);
  //   }
  // });

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

  // loadGatherFacts();
  // loadGatherFactsAnswers();
  // loadDrawConclusions();
  // loadPowerBuilder();

});


const loadPowerBuilder = function(){
  const process = function(v){
    if ( v && lib.verifyInteger(v) ) return lib.int(v);
    if ( v && lib.verifyFloat(v) ) return lib.float(v);
    if ( typeof(v) === 'string') v = v.trim();
    return v;
  };

  const getNbr = function(s){
    const ix = s.indexOf('~');
    if ( ix < 0 ) return 0;
    const t = s.substring(ix+1).split(' ');
    return lib.int(t[0]);
  };

  // Headings:
  // 'LessonNum', 'Code', 'Color', 'Number', 'GradeLevel', 'Title','Article',
  // 'HowWell', 'LearnWords', 'Answers','CB', 'CDT','MB', 'MDT'

  if ( ! PowerBuilder.find().count() ) {
    const fullPath = Assets.absoluteFilePath('txt/powerb.txt' );
    let contents = fs.readFileSync(fullPath, 'binary').split('\n');
    let headings = contents[0].split('\t');
    let first = true; // first line in a new record
    let obj = {};
    let field = '';
    let nbr = 0;
    let list = [];
    const sequence = ['Article','HowWell','LearnWords','Answers'];
    for ( let i=1; i < contents.length; i++ ) {
      const raw = contents[i].replace(/\r/g,'');
      const line = raw.split('\t');
      if ( raw.indexOf('\t') >= 0 && lib.verifyInteger(line[0] )) {
        if ( ! first ) {
          list.push(obj);
        }
        obj = {};
        obj.lesson = [];
        for ( let i2=0; i2 <= 6; i2++ ) {
          if ( i2 === 6 ) {
            obj.lesson.push(line[i2]);
          } else {
            obj[ headings[i2] ] = process( line[i2] );
          }
        }
        first = false;
      } else {
        obj.lesson.push(raw);
      }
    }
    for ( let i=0; i < list.length; i++ ) {
      PowerBuilder.insert(list[i]);
    }
    console.log('PowerBuilder loaded, %s lessons',list.length);
  }
};

const loadDrawConclusions = function(){
  if ( ! DrawConclusions.find().count() ) {
    const list = getDataFromTxt( 'drawconclusions.txt' );
    for ( let i=0; i < list.length; i++ ) {
      DrawConclusions.insert(list[i]);
    }
    console.log('DrawConclusions loaded, %s lessons',list.length);
  }
};

const getDataFromTxt = function( fileName ){
  // return a list of records to be inserted in a collection

  let list = []; // list of records

  const makeObject = function(headings,line){
    let obj = {};
    const ignore = ['CB','CDT','MB','MDT'];
    let newRec = false;
    if ( lib.verifyInteger(line[0] )) newRec = true;
    if ( newRec ) {
      for ( let i=0; i < headings.length; i++ ) {
        const h = headings[i];
        let v = line[i];
        if ( typeof(v) === 'string') v = v.trim();
        if ( lib.verifyInteger(v) ) v = lib.int(v);
        if ( lib.verifyFloat(v) ) v = lib.float(v);
        if ( v && ignore.indexOf(h) < 0 ) obj[h] = v;
      }
      list.push(obj);
    } else {
      // add to previous value
      const ix = list.length - 1;
      if ( ix < 0 ) console.log('Error in line 74 main.js');
      if ( ix >= 0 ) {
        obj = list[ix];
        let start = 5;
        for ( let i=start; i < headings.length; i++ ) {
          const h = headings[i];
          let v = line[i-start];
          if ( typeof(v) === 'string') v = v.trim();
          if ( lib.verifyInteger(v) ) v = lib.int(v);
          if ( lib.verifyFloat(v) ) v = lib.float(v);
          if ( v ) {
            if ( i === start ) {
              obj.Paragraph += v;
            } else {
              if ( v && ignore.indexOf(h) < 0 ) obj[h] = v;
            }
          }
        }
        list[ix] = obj;
      }
    }
    return obj;
  };

  const fullPath = Assets.absoluteFilePath('txt/' + fileName );

  let contents = fs.readFileSync(fullPath, 'binary').split('\n');
  let headings = [];
  for ( let i=0; i < contents.length; i++ ) {
    const raw = contents[i].replace(/\r/g,'');
    const line = raw.split('\t');
    if ( i === 0 ) {
      headings = line;
    } else {
      makeObject(headings,line); // adds to list array
    }
  }
  return list;
};

const loadGatherFactsAnswers = function(){
  // If not defined - create gather facts collection

  let list = []; // list of records

  let nextHeading = -1;
  const makeObject = function( headings, line, debug ){
    const fixValue = function( arg ){
      let v = arg;
      if ( typeof(v) === 'undefined') v = '';
      if ( lib.verifyInteger(v) ) v = lib.int(v);
      if ( lib.verifyFloat(v) ) v = lib.float(v);
      return v;
    };

    let obj = {};
    const ignore = []; // ['CB','CDT','MB','MDT'];
    if ( lib.verifyInteger(line[0] )) {
      // start of lesson
      let lastHeading = -1;
      for ( let i=0; i < line.length; i++ ) {
        const h = headings[i];
        let v = fixValue( line[i] );
        if ( ignore.indexOf(h) < 0 ) {
          obj[h] = v;
          lastHeading = i;
        }
      }
      nextHeading = lastHeading + 1;
      list.push(obj);
    } else {
      // add to previous value
      if ( nextHeading >= 0 ) {
        const ix = list.length - 1;
        obj = list[ix];
        for ( let i=nextHeading; i < headings.length; i++ ) {
          const h = headings[i];
          let v = fixValue( line[i-nextHeading] );
          if ( ignore.indexOf(h) < 0 ) obj[h] = v;
        }
        list[ix] = obj;
      }
    }
    return obj;
  };

  const fix = function(){
    // fix bad entries
    for ( let i=0; i < list.length; i++ ) {
      let l = list[i];
      if ( ! l.Answer1 ) {
        l.Answer1 = l.Answer2;
        l.Answer2 = l.Answer3;
        l.Answer3 = l.Answer4;
        l.Answer4 = l.Answer5;
        l.Answer5 = l.Answer6;
        l.Answer6 = l.Correct;
        l.Correct = l.CB;
      }
      delete l.CB;
      delete l.CDT;
      delete l.MB;
      delete l.MDT;
    }
  };

  // GatherFactsAnswers.remove({}); // remove all
  if ( ! GatherFactsAnswers.find().count() ) {
    // const fullPath = Assets.absoluteFilePath('rpt/gatherfacts.rpt');
    const fullPath = Assets.absoluteFilePath('txt/gatherfactsanswers.txt');

    let contents = fs.readFileSync(fullPath, 'binary').split('\n');
    const headings = contents[0].split('\t');
    let debug = false;
    for ( let i=1; i < contents.length; i++ ) {
      const raw = contents[i].replace(/\r/g,'');
      const line = raw.split('\t');
      if ( lib.int(line[0]) === 135 && ! debug ) debug = true;
      if ( lib.int(line[0]) === 136 ) debug = false;
      makeObject(headings,line,debug); // adds to list array
    }
    fix();

    for ( let i=0; i < list.length; i++ ) {
      GatherFactsAnswers.insert(list[i]);
    }
    console.log('GatherFactsAnswers loaded, %s lessons',list.length);
  }
};


const loadGatherFacts = function(){
  // If not defined - create gather facts collection

  let list = []; // list of records

  const makeObject = function(headings,line){
    let obj = {};
    const ignore = ['CB','CDT','MB','MDT'];
    if ( lib.verifyInteger(line[0] )) {
      for ( let i=0; i < headings.length; i++ ) {
        const h = headings[i];
        let v = line[i];
        if ( typeof(v) === 'undefined') v = '';
        if ( lib.verifyInteger(v) ) v = lib.int(v);
        if ( lib.verifyFloat(v) ) v = lib.float(v);
        if ( v && ignore.indexOf(h) < 0 ) obj[h] = v;
      }
      list.push(obj);
    } else {
      // add to previous value
      const ix = list.length - 1;
      if ( ix < 0 ) console.log('Error in line 201 main.js');
      if ( ix >= 0 ) {
        obj = list[ix];
        for ( let i=5; i < headings.length; i++ ) {
          const h = headings[i];
          let v = line[i-5];
          if ( typeof(v) === 'string') v = v.trim();
          if ( lib.verifyInteger(v) ) v = lib.int(v);
          if ( lib.verifyFloat(v) ) v = lib.float(v);
          if ( v ) {
            if ( i === 5 ) {
              obj.Paragraph += v;
            } else {
              if ( v && ignore.indexOf(h) < 0 ) obj[h] = v;
            }
          }
        }
        list[ix] = obj;
      }
    }
    return obj;
  };

  // GatherFacts.remove({}); // remove all
  if ( ! GatherFacts.find().count() ) {
    // const fullPath = Assets.absoluteFilePath('rpt/gatherfacts.rpt');
    const fullPath = Assets.absoluteFilePath('txt/gatherfacts.txt');

    let contents = fs.readFileSync(fullPath, 'binary').split('\n');
    let headings = [];
    for ( let i=0; i < contents.length; i++ ) {
      const raw = contents[i];
      const line = raw.split('\t');
      if ( i === 0 ) {
        headings = line;
      } else {
        makeObject(headings,line); // adds to list array
      }
    }
    for ( let i=0; i < list.length; i++ ) {
      GatherFacts.insert(list[i]);
    }
    console.log('GatherFacts loaded, %s lessons',list.length);
  }
};
