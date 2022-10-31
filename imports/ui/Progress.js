import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'Progress_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Progress.onCreated(function ProgressOnCreated() {
  // modes:
  // 1 = show list of lessons taken
  // 2 = review drawing conclusions
  // 3 = review gathering facts
  set('studentId',lib.getCookie('studentId'));
  set('student',lib.getCookie('student'));
  set('points',lib.getCookie('studentPoints'));
  setd('mode',1);

  Meteor.call('loadHistory', get('studentId'), function(err,results){
    if ( err ) {
      console.log('Error: Progress.js line 19',err);
    } else {
      set('history',results);
      console.log('jones14 history',get('history'));
    }
  });
});

const countMissed = function( incorrect ){
  let count = 0;
  for ( let key in incorrect ) {
    if ( lib.hasOwnProperty(incorrect,key)) {
      count += 1;
    }
  }
  return count;
};

Template.Progress.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  student() {
    return get('student');
  },
  dc_review(){
    let review = get('review');
    if ( ! review ) return '';

    let list = []; // list of questions answered incorrectly
    for ( let key in review.incorrect ) {
      if ( lib.hasOwnProperty(review.incorrect,key)){
        list.push( lib.int(key));
      }
    }
    list.sort(function(a,b){
      if ( a < b ) return -1;
      if ( a > b ) return 1;
      return 0;
    });

    let reviewed = review.reviewed;
    if ( ! reviewed ) reviewed = {};
    let QuestionNum = 0;
    console.log('jones71a',list);
    for ( let i=0; i < list.length; i++ ) {
      const n = list[i]; // question number
      if ( ! reviewed[n] ) {
        QuestionNum = n;
        break;
      }
    }
    // left off here 
    console.log('jones71b',QuestionNum);
    if ( QuestionNum ) {
      const dc_lesson = get('dc_lesson');
      let lesson = '';
      for ( let i=0; i < dc_lesson.length; i++ ) {
        const dc = dc_lesson[i];
        if ( QuestionNum === dc.QuestionNum ) {
          lesson = dc;
          console.log('jones71c',lesson);
          break;
        }
      }
      return lesson;
    } else {
      // nothing left to review
      return '';
    }
  },
  lesson() {
    let op = get('history');
    if ( ! op ) op = [];
    for ( let i=0; i < op.length; i++ ) {
      let o = op[i];
      if ( i % 2 === 1 ) o.cls = 'rpt_highlight';
      o.when = lib.prettyDate( o.when );
      if ( o.lesson_type === 'dc') {
        o.lesson_type = 'Drawing Conclusions';
      } else {
        o.lesson_type = 'Gathering Facts';
      }
      o.missed = countMissed( o.incorrect );
      if ( o.missed ) o.review = true; // needs to be reviewed
    }
    return op;
  },
});

const getLessonGivenId = function(id){
  const history = get('history');
  for ( let i=0; i < history.length; i++ ) {
    const h = history[i];
    if ( h._id === id ) return h;
  }
  return '';
};

Template.Progress.events({
  'click .pr_change_mode'(e){
    const m = lib.int( $(e.currentTarget).attr('data'));
    const t = $(e.currentTarget).attr('data2');
    if ( t ) {
      Session.set( sprintf('%s_mode',t),m );
    } else {
      set('mode',m);
    }
  },
  'click .pr_lesson_review'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    const id = $(e.currentTarget).attr('data');
    const lesson = getLessonGivenId(id);
    if ( lesson ) {
      $(e.currentTarget).html(wait);
      set('review',lesson);
      const find = { Shape: lesson.Shape, Number: lesson.Number, GradeLevel: lesson.grade_level };
      Meteor.call('collectionFind', 'DrawConclusions', find , function(err,results){
        if ( err ) {
          console.log('Error: Progress.js line 128',err);
        } else {
          set('dc_lesson',results);
        }
      });
      if ( lesson.lesson_type === 'dc' ) {
        set('mode',2);
      } else {
        set('mode',3);
      }
    }
  },
});
