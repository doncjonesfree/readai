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
  setd('show_option','week');

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
  gf_lesson() {
    let l = get('gf_lesson');
    if ( l && l.GatherFacts && l.GatherFacts.length > 0 ) {
      let lesson = l.GatherFacts[0];
      lesson.Paragraph = lib.formatGFParagraph( lesson.Paragraph );
      return lesson;
    }
    return '';
  },
  gf_question() {
    // only show the questions we missed
    const review = get('review');
    let l = get('gf_lesson');
    let uniqueCount = 0;
    if ( l && l.GatherFactsAnswers && l.GatherFactsAnswers.length > 0 ) {
      let op = [];
      for ( let i=0; i < l.GatherFactsAnswers.length; i++ ) {
        const a = l.GatherFactsAnswers[i];
        if ( review.incorrect[ a.QuestionNum ] ) {
          const ret = lib.addDivsForLongerWords( a.Question, uniqueCount );
          const q2 = ret.op;
          uniqueCount = ret.uniqueCount;
          let o = { Question: sprintf('Question #%s  %s',a.QuestionNum,q2), list: [] };
          if ( a.incorrect ) o.incorrect = true;
          for ( let n=1; n <= 100; n++ ) {
            const txt = a[ sprintf('Answer%s',n)];
            if ( ! txt ) break;
            let checked = '';
            if ( a.selected === n) {
              checked = 'checked';
            }
            const html = sprintf('<input type="checkbox" class="gf_chk_answer" data="%s" data2="%s" %s>',i,n,checked);
            const ret = lib.addDivsForLongerWords( txt, uniqueCount );
            const txt2 = ret.op;
            uniqueCount = ret.uniqueCount;

            o.list.push( { checkbox: html, answer: sprintf('%s.&nbsp;%s', lib.numberToLetter(n), txt2 ) } );
          }
          op.push(o);
        }
      }
      return op;
    }
    return '';
  },
  pr_show_option(){
    let sel;
    const show_option = get('show_option');
    let op = [];

    sel = '';
    if ( show_option === 'week' ) sel = 'selected';
    op.push( { value: 'week', sel: sel, label: 'Last 7 Days' });
    sel = '';
    if ( show_option === 'month' ) sel = 'selected';
    op.push( { value: 'month', sel: sel, label: 'Last Month' });
    sel = '';
    if ( show_option === 'all' ) sel = 'selected';
    op.push( { value: 'all', sel: sel, label: 'Show All' });
    return op;
  },
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
    const show_option = get('show_option'); // week, month or all

    const filter = function( iList ){
      // may not be showing all depending on show_option setting
      let oList = [];
      if ( ! iList ) return oList;
      for ( let i=0; i < iList.length; i++ ) {
        let l = iList[i];
        if ( show_option === 'all' ) {
          oList.push(l);
        } else if ( show_option === 'week' ) {
          const m1 = lib.currentMoment();
          const m2 = moment( l.when, lib.dateFormat);
          const days = m1.diff(m2,'days');
          if ( days <= 7 ) oList.push(l);
        } else {
          // month
          const m1 = lib.currentMoment();
          const m2 = moment( l.when, lib.dateFormat);
          const months = m1.diff(m2,'months');
          if ( months <= 1 ) oList.push(l);
        }
      }
      return oList;
    };

    let op = filter( get('history') );
    if ( ! op ) op = [];
    for ( let i=0; i < op.length; i++ ) {
      let o = op[i];
      if ( i % 2 === 1 ) o.cls = 'rpt_highlight';
      o.when = lib.prettyDate( o.when );
      let dc = true;
      if ( o.lesson_type === 'dc') {
        o.lesson_type = 'Drawing Conclusions';
      } else {
        o.lesson_type = 'Gathering Facts';
        dc = false;
      }
      o.missed = countMissed( o.incorrect );
      if ( dc ) {
        const reviewCount = countReviewed( o.reviewed );
        if ( o.missed > reviewCount ) o.review = true; // needs to be reviewed
        o.reviewed = false;
        if ( o.missed > 0 && o.missed === reviewCount ) o.reviewed = true; // needs to be reviewed
      } else {
        // gf
        if ( ! o.reviewed && o.missed > 0 ) o.review = true;
      }
    }
    return op;
  },
});

const getLessonGivenId = function(id, justIx ){
  // justIx - just return the index, not the object
  const history = get('history');
  for ( let i=0; i < history.length; i++ ) {
    const h = history[i];
    if ( h._id === id ) {
      if ( justIx ) return i;
      return h;
    }
  }
  if ( justIx ) return -1;
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

const setGfReviewed = function(){
  // indicate that
  let review = get("review");
  const ix = getLessonGivenId(review._id, 'justIx' );
  let history = get('history');
  let h = history[ix];
  h.reviewed = true;
  set('history',history);

  const doc = { reviewed: true };
  Meteor.call('collectionUpdate', 'LessonHistory', h._id, doc, function(err,results){
    if ( err ) {
      console.log('Error: Progress.js line 358',err);
    }
    set('mode',1);
  });
};

Template.Progress.events({
  'click #gf_done': function(e){
    const review = get('review');
    let lesson = get('gf_lesson');
    if ( ! lesson.incorrect ) lesson.incorrect = {};
    let notAnswered = [];
    let incorrect = [];
    let previouslyIncorrect = [];
    for ( let i=0; i < lesson.GatherFactsAnswers.length; i++ ) {
      const a = lesson.GatherFactsAnswers[i];
      // only care about questions that were originally incorrect when lesson was taken
      if ( review.incorrect[ a.QuestionNum ] ) {
        if ( a.incorrect ) previouslyIncorrect.push( a.QuestionNum );
        if ( a.selected ) {
          if ( a.selected !== a.Correct ) {
            incorrect.push( a.QuestionNum )
            a.incorrect = true;
            if ( ! lesson.incorrect[ a.QuestionNum ] ) lesson.incorrect[ a.QuestionNum ] = 0;
            lesson.incorrect[ a.QuestionNum ] += 1;
          } else {
            a.incorrect = false;
          }
        } else {
          notAnswered.push( a.QuestionNum );
        }
      }
    }
    if ( notAnswered.length > 0 ) {
      const word = 'answer_all_questions';
      lib.googlePlaySound( word, function(){
        console.log('%s finished playing',word);
      });
    } else if ( incorrect.length > 0 ) {
      // at least one answer incorrect
      set('gf_lesson',lesson); // save incorrect flag so we can tell screen which ones to highlight
      let word = 'review_incorrect';
      if ( incorrect.length === 1 ) word = 'one_incorrect';
      lib.googlePlaySound( word );
    } else {
      // don't give points for correcting an earlier incorrect answer
      set('gf_lesson',lesson); // save so we can clear incorrect
      setGfReviewed()
    }
  },
  'change .gf_chk_answer': function(e){
    const i = lib.int( $(e.currentTarget).attr('data') ); // question #
    const a = $(e.currentTarget).attr('data2'); // answer #
    let l = get('gf_lesson');
    let answer = l.GatherFactsAnswers[i];
    answer.selected = lib.int(a);
    set('gf_lesson',l);
  },
  'change #pr_show'(e){
    set('show_option',$(e.currentTarget).val());
  },
  'click #pr_erase_reviewed'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    Meteor.call('eraseReviewed', function(err,results){
      if ( err ) {
        console.log('Error: Progress.js line 241',err);
        $(e.currentTarget).html(html);
      } else {
        console.log('eraseReviewed',results);
        loadHistoryEtc( function(){
          $(e.currentTarget).html(html);
        });
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
            console.log('Error: Progress.js line 464',err);
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
        // Gather facts lesson
        const find = { _id: lesson.lesson_id };
        Meteor.call('loadGatherFacts', find , function(err,results){
          $(e.currentTarget).html(html);
          if ( err ) {
            console.log('Error: Progress.js line 481',err);
          } else {
            set('gf_lesson',results);
            set('mode',3);
          }
        });
      }
    }
  },
});
