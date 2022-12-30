import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'master_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.master.onCreated(function masterOnCreated() {
  // modes
  // 1: Show list of options
  // 2: List / Edit users
  setd('mode',1);
  Meteor.call('loadAllStudents',function(err,results){
    if ( err ) {
      console.log('Error: Master.js line 19',err);
    } else {
      set('student',results);
      loadHistoryCount();
    }
  });
});

const loadHistoryCount = function(callback){
  Meteor.call('historyLessonCount',function(err,results){
    if ( err ) {
      console.log('Error: Master.js line 19',err);
    } else {
      set('lessonCount',results);
    }
    if ( callback ) callback();
  });
};

Template.master.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  mode4() { return get('mode') === 4; },
  mode5() { return get('mode') === 5; },
  mode6() { return get('mode') === 6; },
  masterUser(){
    return lib.getCookie('ltrMaster');
  },
  student(){
    let op = get('student');
    const lessonCount = get('lessonCount');
    if ( ! op ) op = [];
    for ( let i=0; i < op.length; i++ ) {
      let o = op[i];
      o.count = lib.int( lessonCount[ o._id] );
    }
    return op;
  },
});

let AiWaitTime = 1000;
const getAllAiWordDefs = function( callback ){
  Meteor.call('openAiWordDef','',function(err,results){
    if ( err ) {
      console.log('Error: Master.js line 63',err);
    } else {
      console.log('openAiWordDef',results);
      if ( ! results.errors || results.errors.length === 0 ) {
        callback(); // done
      } else {
        console.log('Waiting %s',AiWaitTime);
        Meteor.setTimeout(function(){
          AiWaitTime += 1000;
          if ( AiWaitTime > 40000 ) AiWaitTime = 40000;
          getAllAiWordDefs( callback );
        },AiWaitTime);
      }
    }
  });
};

Template.master.events({
  'click #mas_assemblyai_token'(e){
    lib.getAudio( 'canvas', function(results){
      console.log('jones357',results);
    });
  },
  'click #mas_get_keywords'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    Meteor.call('getKeywords',function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error: Master.js line 94',err);
      } else {
        console.log('getKeywords',results);
      }
    });
  },
  'click #mas_def_to_s3'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    Meteor.call('definitionsToS3',function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error: Master.js line 94',err);
      } else {
        console.log('definitionsToS3',results);
      }
    });
  },
  'click #mas_openai'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    AiWaitTime = 1000;
    $(e.currentTarget).html(wait);
    getAllAiWordDefs( function(){
      $(e.currentTarget).html(html);
      console.log('getAllAiWordDefs done');
    });
  },
  'click #mas_special'(e){
    // special purpose
    Meteor.call('special',function(err,results){
      if ( err ) {
        console.log('Error: Master.js line 74',err);
      } else {
        console.log('special',results);
      }
    });
  },
  'click .mstr_erase_history'(e){
    // given student id - erase lessons for that student
    const id = $(e.currentTarget).attr('data');
    Meteor.call('historyLessonRemove',id,function(err,results){
      if ( err ) {
        console.log('Error: Master.js line 77',err);
      } else {
        console.log('historyLessonRemove',results);
        loadHistoryCount();
      }
    });
  },
  'click #check_email'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    // data = { from: to: subject: text: }
    let data = {};
    data.from = 'support@ltrfree.com';
    data.to = 'doncjones1@gmail.com';
    data.subject = 'Testing ltr email';
    data.text = 'This is a test';
    Meteor.call('sendEmail', data,function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error: Master.js line 41',err);
      } else {
        console.log('sendEmail',results);
      }
    });
  },
  'click .change_mode'(e){
    const m = lib.int( $(e.currentTarget).attr('data') );
    set('mode',m);
  },
  'click #mas_s3'(e){
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);

    // Meteor.call('S3getObject', 'audio/a.mp3',function(err,results){
    //   $(e.currentTarget).html(html);
    //   if ( err ) {
    //     console.log('Error: Master.js line 47',err);
    //   } else {
    //     console.log('S3getObject',results);
    //   }
    // });

    Meteor.call('checkS3', function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error: Master.js line 56',err);
      } else {
        console.log('checkS3',results);
      }
    });
  },
});
