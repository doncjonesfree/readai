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
  setd('WordList',[]);
  setd('mode',1);

  loadHistoryEtc();

});

const loadHistoryEtc = function( callback ){
  Meteor.call('loadHistory', get('studentId'), function(err,results){
    if ( err ) {
      console.log('Error: Progress.js line 19',err);
    } else {
      set('history',results.LessonHistory);
      set('WordList',results.WordList);
      if ( callback ) callback();
    }
  });
};

const countMissed = function( incorrect ){
  let count = 0;
  for ( let key in incorrect ) {
    if ( lib.hasOwnProperty(incorrect,key)) {
      count += 1;
    }
  }
  return count;
};

const dcReviewHelper = function( reset ){
  let review = get('review');
  if ( ! review ) return '';

  if ( ! reset ) {
    let singleQuestion = get('singleQuestion');
    if ( singleQuestion ) {
      addDcAnswerCheckbox(singleQuestion);
      return singleQuestion;
    }
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
      lesson.answer_selected = -1;
      addDcAnswerCheckbox(lesson);
      set('singleQuestion',lesson);
    }

    return lesson;
  } else {
    // nothing left to review
    return '';
  }
};

const countReviewed = function( reviewed ){
  let count = 0;
  if ( reviewed ) {
    for ( let key in reviewed ) {
      if ( lib.hasOwnProperty(reviewed,key)) {
        count += 1;
      }
    }
  }
  return count;
};

const refresh = function(n){
  let v = get(n);
  if ( typeof(v) === 'undefined') v = 0;
  set(n,v+1);
};

const getRefresh = function(n){
  return get(n);
};

Template.Progress.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  local() { return Meteor.isDevelopment },
  wordsToStudyCount(){
    let WordList = get('WordList');
    if ( WordList.length === 1 ) {
      return '1 Study Word';
    } else if ( WordList.length > 1 ) {
      return sprintf('%s Study Words',WordList.length);
    } else {
      return '';
    }
  },
  wordsToStudy(){
    let WordList = get('WordList');
    if ( WordList.length > 0 ) {
      return WordList;
    } else {
      return '';
    }
  },
  wordHelper() {
    let wordHelper = get('wordHelper');
    return wordHelper;
  },
  student() {
    return get('student');
  },
  dc_review(){
    const dmy = getRefresh('dc_review');
    return dcReviewHelper();
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
      const reviewCount = countReviewed( o.reviewed );
      if ( o.missed > reviewCount ) o.review = true; // needs to be reviewed
      o.reviewed = false;
      if ( o.missed > 0 && o.missed === reviewCount ) o.reviewed = true; // needs to be reviewed
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
  let WordList = get('WordList');

  let wordHelper = get('wordHelper');
  if ( typeof( wordHelper.list_ix) !== 'undefined') {
    // we are working on a list of words, not just one from a lesson
    let ix = wordHelper.list_ix;
    if ( knows ) {
      WordList.splice(ix,1);
    } else {
      ix += 1;
    }
    if ( ix < WordList.length ) {
      // we have more words to look at
      wordHelper.word = WordList[ix].word;
      wordHelper.list_ix = ix;
      set('wordHelper',wordHelper);
    } else {
      loadHistoryEtc();
      $('#pr_word_popup').hide();
    }
  } else {
    // just a word from a lesson
    loadHistoryEtc();
    $('#pr_word_popup').hide();
  }

  const studentId = lib.getCookie('studentId');
  Meteor.call('knowsWord', word, knows, studentId, function(err,results){
    if ( err ) {
      console.log('Error: Progress.js line 137',err);
    } else {
      console.log('knowsWord',results);
      if ( results.points ) {
        // give student points earned on screen
        // "knowsWord" already stored points in WordList collection
        const totalPoints = lib.int( lib.getCookie('studentPoints') ) + results.points;
        lib.setCookie('studentPoints',totalPoints);
        Session.set('header_points',totalPoints)
      }
    }
  });
};

const setHistory = function( review ){
  // set reviewed value for appropriate history record
  let history = get('history');
  for ( let i=0; i < history.length; i++ ) {
    let h = history[i];
    if ( h._id === review._id ) {
      h.reviewed = review.reviewed;
    }
  }
  set('history',history);
};

Template.Progress.events({
  'click #pr_erase_reviewed'(e){
    Meteor.call('eraseReviewed', function(err,results){
      if ( err ) {
        console.log('Error: Progress.js line 241',err);
      } else {
        console.log('eraseReviewed',results);
      }
    });
  },
  'click #pr_dc_next'(){
    // We answered the question in a dc lesson - see if the answer is correct.
    let singleQuestion = get('singleQuestion');
    let answer = 0;
    $('.dc_chk_answer').each(function(i, obj) {
      if ( $(obj).is(':checked') ) answer = lib.int( $(obj).attr('data'));
    });
    if ( answer === singleQuestion.Correct ) {
      const word = 'right_answer';
      const review = get('review'); // history record
      let doc = { reviewed: {} };
      if ( typeof(review.reviewed) === 'object') doc.reviewed = review.reviewed;
      doc.reviewed[ singleQuestion.QuestionNum ] = true;
      review.reviewed = doc.reviewed;
      set('review',review);
      setHistory( review );
      Meteor.call('collectionUpdate', 'LessonHistory', review._id, doc , function(err,results){
        if ( err ) {
          console.log('Error: Progress.js line 219',err);
        } else {
          lib.googlePlaySound( word, function(){
            console.log('%s finished playing',word);
            if ( dcReviewHelper( 'reset' ) ) {
              // go to next question in this dc lesson
              set('mode',2);
              refresh('dc_review');
            } else {
              // done with this lesson - close it out
              set('mode',1);
            }
          });
        }
      });
    } else {
      const word = 'wrong_answer';
      lib.googlePlaySound( word, function(){
        console.log('%s finished playing',word);
      });
    }
  },
  'click #pr_dc_q'(){
    // dc lesson - play what to do instructions
    const word = 'dc_review_instructions';
    lib.googlePlaySound( word, function(){
      console.log('%s finished playing',word);
    });
  },
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
  'click .pr_words'(e){
    // user asked to study word list
    e.preventDefault();
    e.stopPropagation();

    let WordList = get('WordList');

    let wordHelper = {};
    wordHelper.word = WordList[0].word;
    wordHelper.list_ix = 0;
    set('wordHelper',wordHelper);
    $('#pr_word_popup').show();
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
    const i = lib.int( $(e.currentTarget).attr('data') ); // question #
    let l = get('singleQuestion');
    let checked = false;
    if ( $(e.currentTarget).is(':checked')) {
      l.answer_selected = i;
      checked = true;
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
      if ( m === 1 ) {
        loadHistoryEtc();
      }
      set('mode',m);
    }
  },
  'click .pr_lesson_review'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    const id = $(e.currentTarget).attr('data');
    set('lesson_id',id);
    const lesson = getLessonGivenId(id);
    if ( lesson ) {
      $(e.currentTarget).html(wait);
      set('review',lesson); // from history
      if ( lesson.lesson_type === 'dc' ) {
        const find = { Shape: lesson.Shape, Number: lesson.Number, GradeLevel: lesson.grade_level };
        Meteor.call('collectionFind', 'DrawConclusions', find , function(err,results){
          if ( err ) {
            console.log('Error: Progress.js line 128',err);
          } else {
            set('dc_lesson',results);
            if ( dcReviewHelper( 'reset' ) ) {
              $(e.currentTarget).html(html);
              set('mode',2);
            } else {
              $(e.currentTarget).html(html);
            }
          }
        });
      } else {
        set('mode',3);
      }
    }
  },
});
