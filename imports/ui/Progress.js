import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { addDcAnswerCheckbox } from './DCLesson';
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
  set('singleQuestion','');
  setd('mode',1);

  Meteor.call('loadHistory', get('studentId'), function(err,results){
    if ( err ) {
      console.log('Error: Progress.js line 19',err);
    } else {
      set('history',results);
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
  wordHelper() {
    return get('wordHelper');
  },
  student() {
    return get('student');
  },
  dc_review(){
    let review = get('review');
    if ( ! review ) return '';

    let singleQuestion = get('singleQuestion');
    if ( singleQuestion ) {
      addDcAnswerCheckbox(singleQuestion);
      return singleQuestion;
    }

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
    for ( let i=0; i < list.length; i++ ) {
      const n = list[i]; // question number
      if ( ! reviewed[n] ) {
        QuestionNum = n;
        break;
      }
    }
    if ( QuestionNum ) {
      let dc_lesson = get('dc_lesson');
      if ( ! dc_lesson ) dc_lesson = [];
      let lesson = '';
      for ( let i=0; i < dc_lesson.length; i++ ) {
        const dc = dc_lesson[i];
        if ( QuestionNum === dc.QuestionNum ) {
          lesson = dc;
          break;
        }
      }
      if ( lesson ) {
        addDcAnswerCheckbox(lesson);
        set('singleQuestion',lesson);
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

const knowsWord = function( word, knows ){
  $('#pr_word_popup').hide();
  const studentId = lib.getCookie('studentId');
  console.log('jones136',word,knows,studentId);
  Meteor.call('knowsWord', word, knows, studentId, function(err,results){
    if ( err ) {
      console.log('Error: Progress.js line 137',err);
    } else {
      console.log('knowsWord',results);
    }
  });
};

Template.Progress.events({
  'click .pr_home'(){
    FlowRouter.go('home');
  },
  'click #wh_knows'(e){
    e.preventDefault();
    e.stopPropagation();
    const word = $(e.currentTarget).attr('data');
    const knows = lib.int( $(e.currentTarget).attr('data2') );
    knowsWord( word, knows );
  },
  'click #wh_instructions'(e){
    e.preventDefault();
    e.stopPropagation();
    lib.googlePlaySound( 'wh_instructions', function(){
      console.log('Play %s finished','wh_instructions');
    });
  },
  'click #wh_study_word'(e){
    e.preventDefault();
    e.stopPropagation();
    const word = $(e.currentTarget).attr('data');
    lib.googlePlaySound( word, function(){
      console.log('Play %s finished',word);
    });
  },
  'click #wh_word_def'(e){
    e.preventDefault();
    e.stopPropagation();
    let word = $(e.currentTarget).attr('data');
    lib.wordExists(word, function(results){
      if ( ! results || ! results.definition ) {
        // no definition found
        word = 'no_definition_found';
      }
      lib.googlePlaySound( '*' + word, function(){
        console.log('%s definition finished playing',word);
      });
    });
  },
  'click .lesson_word'(e){
    e.preventDefault();
    e.stopPropagation();
    let wordHelper = {};
    wordHelper.word = $(e.currentTarget).attr('data');
    wordHelper.ix = lib.int( $(e.currentTarget).attr('data2') );
    set('wordHelper',wordHelper);
    $('#pr_word_popup').show();
  },
  'change .dc_chk_answer': function(e){
    const i = $(e.currentTarget).attr('data'); // question #
    let l = get('singleQuestion');
    if ( $(e.currentTarget).is(':checked')) {
      l.answer_selected = lib.int(i);
    } else {
      delete l.answer_selected;
    }
    set('singleQuestion',l);
  },
  'click #popup_close'(e){
    const id = '#' + $(e.currentTarget).attr('data');
    $(id).hide();
  },
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
