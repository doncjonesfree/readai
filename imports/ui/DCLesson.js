import * as lib from '../api/lib';

const pre = 'DCLesson_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};

const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.DCLesson.onCreated(function DCLessonOnCreated() {

});

const expandShape = function(s){
  if ( s === 'S') return 'Square';
  if ( s === 'T') return 'Triangle';
  if ( s === 'D') return 'Diamond';
  if ( s === 'C') return 'Circle';
  return s;
};

const onLastQuestion = function(){
  let l = get('lesson');
  if ( l && l.QuestionNum === 10 ) return true;
  return false;
};

Template.DCLesson.helpers({
  done_button: function(){
    if ( onLastQuestion() ) return 'Done';
    return 'Next';
  },
  lesson() {
    let l = get('lesson');
    if ( ! l ) return '';
    let uniqueCount = 0;
    l.Shape = expandShape( l.Shape );
    l.answer = [];
    const tmp = lib.addDivsForLongerWords( l.Question, uniqueCount );
    l.Question = tmp.op;
    uniqueCount = tmp.uniqueCount;

    for ( let i=1; i <= 4; i++ ) {
      let a = l[ sprintf('Answer%s',i)];
      if ( a ) {
        const tmp = lib.addDivsForLongerWords( a, uniqueCount );
        a = tmp.op;
        uniqueCount = tmp.uniqueCount;
        let checked = '';
        if ( i === l.answer_selected ) checked = 'checked';

        const checkbox = sprintf('<input type="checkbox" class="dc_chk_answer" data="%s" %s>',i,checked);
        const content = sprintf('%s. %s',i,a);

        l.answer.push( { checkbox: checkbox, content: content });
      }
    }
    return l;
  },
});

const showDefinitionButton = function(word,uniqueCount){

  $('.word_def').each(function(i, obj) {
    const w = $(obj).attr('data');
    const c = $(obj).attr('data2');
    if ( w === word && c === uniqueCount ) {
      $(obj).css('display','inline-block');
    } else {
      $(obj).css('display','none');
    }
  });
};

const random = function(arg){
  // generate a random integer between 1 and arg
  const n = Math.max(1,arg);
  let count = 0;
  while ( true ) {
    const r = Math.round(( Math.random() * n ) + 1);
    if ( r <= arg ) return r;
    count += 1;
    if ( count > 10 ) break;
  }
  console.log('random timed out');
  return 1;
};

const loadNextQuestion = function(){
  let lesson = get('lesson');
  const find = { GradeLevel: lesson.GradeLevel, "Number": lesson.Number, QuestionNum: lesson.QuestionNum+1, Shape: lesson.Shape }
  Meteor.call('findCollection', 'DrawConclusions', find, function(err,results){
    if ( err ) {
      console.log('Error in DCLesson.js line 93',err);
    } else if ( results.length > 0 ){
      let obj = results[0];
      obj.incorrect_count = 0;
      console.log('jones98',obj);
      set('lesson', obj);
    }
  });
};

Template.DCLesson.events({
  'click #dc_done': function(e){
    e.stopPropagation();
    e.preventDefault();
    let word;
    const last = onLastQuestion();
    let correct =  false;
    let lesson = get('lesson');
    if ( lesson.answer_selected && lesson.answer_selected === lesson.Correct ) {
      word = 'right_answer';
      correct = true;
    } else if ( lesson.answer_selected ) {
      word = 'wrong_answer';
      lesson.incorrect_count += 1;
      console.log('jones117',lesson);
      set('lesson',lesson);
    } else {
      // no answer given
      word = 'answer_question2'; // next
      if ( last ) word = 'answer_question';
    }
    lib.googlePlaySound( word, function(){
      console.log('%s finished playing',word);
    });
    if ( correct ) {
      // go to next question
      const wait = '...';
      const html = $(e.currentTarget).html();
      if ( wait === html ) return;
      $(e.currentTarget).html(wait);
      let points = 10;
      if ( lesson.incorrect_count === 1 ) points = 5;
      if ( lesson.incorrect_count > 1 ) points = 0;
      lesson.points = points;
      Meteor.call('dcSaveLessonHistory',lesson, lib.getCookie('studentId'), function(err,results){
        $(e.currentTarget).html(html);
        if ( err ) {
          console.log('Error in DCLesson.js line 131',err);
        } else if ( Meteor.isDevelopment ) {
          console.log('dcSaveLessonHistory',results);
        }
      });
      if ( last ) {
        // start a new lesson
      } else {
        loadNextQuestion();
      }
    }
  },
  'click #dc_help': function(e){
    let word = 'dc_help2'; // next
    if ( onLastQuestion() ) word = 'dc_help';
    lib.googlePlaySound( word, function(){
      console.log('%s finished playing',word);
    });
  },
  'change .dc_chk_answer': function(e){
    const i = $(e.currentTarget).attr('data'); // question #
    let l = get('lesson');
    if ( $(e.currentTarget).is(':checked')) {
      l.answer_selected = lib.int(i);
    } else {
      delete l.answer_selected;
    }
    set('lesson',l);
  },
  'click .lesson_word': function(e){
    e.preventDefault();
    const word = $(e.currentTarget).attr('data');
    lib.googlePlaySound( word, function(){
      console.log('Play %s finished',word);
      const uniqueCount = $(e.currentTarget).attr('data2');
      showDefinitionButton(word,uniqueCount);
    });
  },
  'click .word_def': function(e){
    e.preventDefault();
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
});
