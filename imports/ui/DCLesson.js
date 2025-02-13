import * as lib from '../api/lib';

const pre = 'DCLesson_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.DCLesson.onCreated(function DCLessonOnCreated() {
  setd('mode',1);
  setd('showPoints',false);
  Session.set('pre',pre);
});

export const expandShape = function(s){
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

export const addDcAnswerCheckbox = function(l){
  // l is a dc lesson - add "answer" array with checkbox and text
  let uniqueCount = 0;
  l.Shape = expandShape( l.Shape );
  l.answer = [];
  const tmp = lib.addDivsForLongerWords( l.Question, uniqueCount );
  l.htmlQuestion = tmp.op;
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
};

Template.DCLesson.helpers({
  mode1: function(){ return get('mode') === 1 },
  mode2: function(){ return get('mode') === 2 },
  local: function(){ return Meteor.isDevelopment; },
  wordAudio() { return get('wordAudio'); },
  showPoints() { return get('showPoints'); },
  set_difficulty(){
    const student = lib.getCookie('student');
    return student.set_difficulty;
  },
  done_button: function(){
    return 'Done';
  },
  lesson() {
    let l = get('lesson');
    if ( ! l ) return '';
    addDcAnswerCheckbox(l);
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
  Meteor.call('collectionFind', 'DrawConclusions', find, function(err,results){
    if ( err ) {
      console.log('Error in DCLesson.js line 93',err);
    } else if ( results.length > 0 ){
      let obj = results[0];
      obj.incorrect_count = 0;
      set('lesson', obj);
    }
  });
};

const lessonFail = function(){
  // lets_look_at_some_of_the_words.mp3
  lib.googlePlaySound( '$lets_look_at_some_of_the_words' );
  const lesson = get('lesson');
  let list = [];
  list.push( lesson.Question );
  for ( let i=1; i <= 4; i++ ) {
    const k = sprintf('Answer%s',i);
    if ( lesson[k] ) list.push(lesson[k] );
  }
  const text = list.join(' ');
  lib.quizHardestWords(text, { type: 'dc', id: lesson._id }, 'DCLesson_wordAudio');
};

Template.DCLesson.events({
  'click .dc_minus': function(e){
    // pick an easier gf lesson
    const direction = $(e.currentTarget).attr('data'); // easier / harder
    const classes = $(e.currentTarget).attr('class');
    const wait = 'fa-circle-pause';
    if ( classes.indexOf(wait) >= 0 ) return;
    let cls;
    if ( direction === 'easier') {
      cls = 'fa-circle-minus';
    } else {
      cls = 'fa-circle-plus';
    }
    $(e.currentTarget).removeClass(cls);
    $(e.currentTarget).addClass(wait);

    const GradeLevel = get('lesson').GradeLevel;
    const lesson_id = get('lesson')._id;
    const student = lib.getCookie('student');
    const student_id = student._id;
    Meteor.call('getEasierDCLesson', lesson_id, student_id, GradeLevel, direction, function(err,results){
      $(e.currentTarget).removeClass(wait);
      $(e.currentTarget).addClass(cls);
      if ( err ) {
        console.log('Error: DCLesson.js line 139',err);
      } else {
        let obj = results.ret[0];
        obj.incorrect_count = 0;
        Session.set('DCLesson_lesson',obj);
        set('mode',1);
      }
    });
  },
  'click #dc_done': function(e){
    // See if answer is correct
    e.stopPropagation();
    e.preventDefault();
    let word;
    const last = onLastQuestion();
    let correct =  false;
    let lesson = get('lesson');
    if ( lesson.answer_selected && lesson.answer_selected === lesson.Correct ) {
      word = 'right_answer';
      correct = true;
      lib.googlePlaySound( word );
    } else if ( lesson.answer_selected ) {
      // incorrect answer selected
      lesson.incorrect_count += 1;
      set('lesson',lesson);

      lessonFail();

      // word = 'wrong_answer';
      // const verbalOn = lib.isVerbalOn('DCLesson_');
      // if ( verbalOn ) {
      //   // give instructions
      //   word = lib.dcWrongAudio.file;
      // }
    } else {
      // no answer given
      word = 'answer_question';
      lib.googlePlaySound( word );
    }
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

      const totalPoints = lib.int( lib.getCookie('studentPoints') ) + points;
      lib.setCookie('studentPoints',totalPoints);

      Session.set('Points_points',points);
      Session.set('Points_totalPoints',totalPoints);
      set('showPoints',true);

      const studentId = lib.getCookie('studentId');
      Meteor.call('dcSaveLessonHistory',lesson, studentId, function(err,results){
        $(e.currentTarget).html(html);
        if ( err ) {
          console.log('Error in DCLesson.js line 131',err);
        } else if ( Meteor.isDevelopment ) {
          console.log('dcSaveLessonHistory',results);
        }
      });
      if ( last ) {
        // start a new lesson
        set('mode',3); // should blank the screen
        Meteor.call('getNextLesson', studentId, function(err,results){
          if ( err ) {
            console.log('Error: DCLesson.js line 162',err);
          } else {
            if ( results.lesson_type === 'gf') {
              Session.set('GFLesson_lesson',results.ret);
              Session.set('GFLesson_student',results.student);
              Session.set('GFLesson_name',results.student.name);
              Session.set('GFLesson_mode',1);
              set('mode',2);
            } else {
              let obj = results.ret[0];
              obj.incorrect_count = 0;
              Session.set('DCLesson_lesson',obj);
              set('mode',1);
            }
          }
        });
      } else {
        loadNextQuestion();
      }
    }
  },
  'click #dc_help': function(e){
    // removed from html
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
    lib.googlePlaySound( '*' + word, function(){
      console.log('%s definition finished playing',word);
    });
  },
});
