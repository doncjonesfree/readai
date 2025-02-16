import * as lib from '../api/lib';

const pre = 'GFLesson_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};

const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.GFLesson.onCreated(function GFLessonOnCreated() {
  // modes
  // 1 = show lesson
  // 2 = blank screen while loading lesson
  set('points','');
  setd('mode',1);
  setd('showPoints',false);
  Session.set('pre',pre);
});

const getSeparateQuestions = function(l){
  // if there are separate questions, return them in an array, else blank
  let questions = l.lesson.Paragraph.replace(/\r/g,'');
  const ix1 = questions.indexOf('1.');
  const ix2 = questions.indexOf('2.');
  const ix3 = questions.indexOf('3.');
  if ( ix1 >= 0 && ix2 >= 0 && ix3 >= 0 ) {
    // break it down in separate questions
    let op = [];
    for ( let q=2; q < 100; q++ ) {
      const ix = questions.indexOf( sprintf('%s.',q));
      if ( ix < 0 ) {
        op.push(questions);
        break;
      }
      op.push( questions.substr(0,ix));
      questions = questions.substring(ix);
    }
    let n = 1;
    if ( l.lesson.thisQuestion ) n = l.lesson.thisQuestion;
    return { n: n, question: op[n-1] };
  }
  return '';
};

const setDifficulty = function(){
  const student = get('student');
  return student.set_difficulty;
};

Template.GFLesson.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  wordAudio() { return get('wordAudio'); },
  showPoints() { return get('showPoints'); },
  set_difficulty(){
    return setDifficulty();
  },
  points() {
    return get('points');
  },
  lesson() {
    let l = get('lesson');
    if ( l && l.lesson && l.answers ) {
      l.lesson.local = Meteor.isDevelopment;

      let uniqueCount = 0;

      // form question
      let op = [];
      let start = 0;
      let end = l.answers.length;
      const q = getSeparateQuestions(l);
      if ( q ) {
        start = q.n-1;
        end = q.n;
        l.lesson.thisQuestion = q.n;
        l.lesson.Paragraph = lib.formatGFParagraph( q.question );
      } else {
        l.lesson.Paragraph = lib.formatGFParagraph( l.lesson.Paragraph );
        l.lesson.thisQuestion = 0;
      }

      for ( let i=start; i < end; i++ ) {
        const a = l.answers[i];
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
      l.lesson.question = op;

      return l.lesson;
    }
    return '';
  },
  word(){
    return get('word');
  },
  name(){
    return get('name');
  },
  mode1() { return get('mode') === 1 },
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

const saveLessonHistory = function(lesson){
  set('showPoints',false);

  let obj = {};
  obj.lesson_type = 'gf';
  obj.answerCount = lesson.answers.length;
  obj.incorrect =  lesson.incorrect;
  obj.lesson_id =  lesson.lesson._id;
  obj.grade_level =  lesson.lesson.GradeLevel;
  obj.points =  lesson.points;
  obj.thisQuestion = lesson.thisQuestion;
  obj.student_id = get('student')._id;
  Meteor.call('saveLessonHistory', obj , function(err,results){
    if ( err ) {
      console.log('Error: GFLesson.js line 84',err);
    } else {
      set('mode',2);
      Meteor.call('getNextLesson', obj.student_id, function(err,results){
        if ( err ) {
          console.log('Error: Lesson.js line 19',err);
        } else {
          if ( results.lesson_type === 'gf') {
            set('student',results.student);
            set('name',results.student.name);
            set('lesson',results.ret);
            set('mode',1);
          } else {
            let obj = results.ret[0];
            obj.incorrect_count = 0;
            Session.set('DCLesson_lesson',obj);
            set('mode',3);
          }
        }
      });
    }
  });
};

const clean = function(arg){
  // remove &quot; and ___
  let s = arg.replace(/&quot;/g,'');
  s = s.replace(/_/g,'');
  s = s.replace(/\?/g,'');
  s = s.replace(/\./g,'');
  return s;
};

const lessonFail = function(){
  // lets_look_at_some_of_the_words.mp3
  lib.googlePlaySound( '$lets_look_at_some_of_the_words' );
  const lesson = get('lesson');
  let list = [];
  list.push( getSeparateQuestions(lesson).question );
  const ix = lesson.lesson.thisQuestion;
  const a = lesson.answers[ix-1];
  for ( let i=1; i <= 4; i++ ) {
    const k = sprintf('Answer%s',i);
    if ( a[k] ) list.push(a[k] );
  }
  const text = clean( list.join(' ') );
  console.log('jones181 text',text);
  lib.quizHardestWords(text, { type: 'gf', id: lesson._id }, 'GFLesson_wordAudio');
};

Template.GFLesson.events({
  'click .gf_minus': function(e){
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

    const GradeLevel = get('lesson').lesson.GradeLevel;
    const lesson_id = get('lesson').lesson._id;
    const student_id = get('student')._id;
    Meteor.call('getEasierGFLesson', lesson_id, student_id, GradeLevel, direction, function(err,results){
      $(e.currentTarget).removeClass(wait);
      $(e.currentTarget).addClass(cls);
      if ( err ) {
        console.log('Error: GFLesson.js line 166',err);
      } else {
        set('student',results.student);
        set('name',results.student.name);
        set('lesson',results.ret);
        set('mode',1);
      }
    });
  },
  'click #gf_done': function(e){
    // Done button clicked - see if answers are correct
    e.stopPropagation();
    e.preventDefault();
    const thisQuestion = lib.int($(e.currentTarget).attr('data'));
    let lesson = get('lesson');
    if ( ! lesson.incorrect ) lesson.incorrect = {};
    let notAnswered = [];
    let incorrect = [];
    let previouslyIncorrect = [];
    let start = 0;
    let end = lesson.answers.length;
    if ( thisQuestion ) {
      start = thisQuestion-1;
      end = thisQuestion;
    }
    for ( let i=start; i < end; i++ ) {
      const a = lesson.answers[i];
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
    if ( notAnswered.length > 0 ) {
      const word = 'answer_all_questions';
      lib.googlePlaySound( word, function(){
        console.log('%s finished playing',word);
      });
    } else if ( incorrect.length > 0 ) {
      // at least one answer incorrect
      set('lesson',lesson); // save incorrect flag so we can tell screen which ones to highlight
      // no need to play sound if only one question/answer showing

      lessonFail();

      // const verbalOn = lib.isVerbalOn('GFLesson_');
      // let word;
      // if ( verbalOn ) {
      //   word = lib.gfWrongAudio2.file;
      //   if ( incorrect.length === 1 ) word = lib.gfWrongAudio1.file;
      //   if ( thisQuestion ){
      //     // only showing one question - very early reader
      //     word = lib.dcWrongAudio.file;
      //   }
      // } else {
      //   word = 'wrong_answer';
      // }
      // lib.googlePlaySound( word );
    } else {
      // all answers correct
      let points = lib.calculatePoints( lesson, thisQuestion );
      set('lesson',lesson); // save so we can clear incorrect
      const student = get('student');

      const totalPoints = lib.int( lib.getCookie('studentPoints') ) + points;
      lib.setCookie('studentPoints',totalPoints);
      lesson.points = points;
      lesson.thisQuestion = thisQuestion;

      // scroll to the top
      $('html, body').animate({scrollTop: '0px'}, 300);
      Session.set('Points_points',points);
      Session.set('Points_totalPoints',totalPoints);
      set('showPoints',true);
      Meteor.setTimeout(function(){
        // give show points time - then change the lesson
        saveLessonHistory(lesson);
      },3000);
    }
  },
  'click #gf_help': function(e){
    // older question mark we are no longer using
    const word = 'gather_facts_help';
    lib.googlePlaySound( word, function(){
      console.log('%s finished playing',word);
    });
  },
  'click .word_def': function(e){
    e.preventDefault();
    let word = $(e.currentTarget).attr('data');
    lib.googlePlaySound( '*' + word, function(success){
      console.log('%s definition finished playing, success=%s',word,success);
    });
  },
  'click .lesson_word': function(e){
    e.preventDefault();
    const word = $(e.currentTarget).attr('data');
    lib.googlePlaySound( word, function( success ){
      console.log('Play %s finished success=%s',word,success);
      const uniqueCount = $(e.currentTarget).attr('data2');
      showDefinitionButton(word,uniqueCount);
    });
  },
  'click #gf_lesson_paragraph': function(e){
    const txt = $(e.currentTarget).val();
  },
  'change .gf_chk_answer': function(e){
    const i = $(e.currentTarget).attr('data'); // question #
    const a = $(e.currentTarget).attr('data2'); // answer #
    let l = get('lesson');
    let answer = l.answers[i];
    answer.selected = lib.int(a);
    set('lesson',l);
  },
  'click #gf_save': function(e){
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    gfSave(e,html);
  },
});
