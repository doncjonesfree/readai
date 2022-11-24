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
});

Template.GFLesson.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  points() {
    return get('points');
  },
  lesson() {
    let l = get('lesson');
    if ( l && l.lesson ) {
      l.lesson.Paragraph = lib.formatGFParagraph( l.lesson.Paragraph );
      l.lesson.local = Meteor.isDevelopment;
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
  question() {
    let l = get('lesson');
    let uniqueCount = 0;
    if ( l && l.answers ) {
      let op = [];
      for ( let i=0; i < l.answers.length; i++ ) {
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
      return op;
    }
    return '';
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

const saveLessonHistory = function(lesson,points){
  let obj = {};
  obj.lesson_type = 'gf';
  obj.answerCount = lesson.answers.length;
  obj.incorrect =  lesson.incorrect;
  obj.lesson_id =  lesson.lesson._id;
  obj.grade_level =  lesson.lesson.GradeLevel;
  obj.points =  points;
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
            console.log('jones116',results);
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

Template.GFLesson.events({
  'click #gf_done': function(e){
    let lesson = get('lesson');
    if ( ! lesson.incorrect ) lesson.incorrect = {};
    let notAnswered = [];
    let incorrect = [];
    let previouslyIncorrect = [];
    for ( let i=0; i < lesson.answers.length; i++ ) {
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
      let word = 'review_incorrect';
      if ( incorrect.length === 1 ) word = 'one_incorrect';
      lib.googlePlaySound( word );
    } else {
      set('lesson',lesson); // save so we can clear incorrect
      const student = get('student');
      let points = lib.calculatePoints( lesson );

      const totalPoints = lib.int( lib.getCookie('studentPoints') ) + points;
      lib.setCookie('studentPoints',totalPoints);

      set('points','');
      if ( points && student.award_points ) {
        set('points',points);
        $('#gf_show_points').show();
        const word = 'ding';
        lib.googlePlaySound( word, function(){
          $('#gf_show_points').hide();
        });
        Session.set('header_points',totalPoints)
        saveLessonHistory(lesson,points);
      } else {
        // save points anyway - even if they asked not to show points
        Session.set('header_points',totalPoints)
        saveLessonHistory(lesson,points);
      }
    }
  },
  'click #gf_help': function(e){
    const word = 'gather_facts_help';
    lib.googlePlaySound( word, function(){
      console.log('%s finished playing',word);
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
  'click .lesson_word': function(e){
    e.preventDefault();
    const word = $(e.currentTarget).attr('data');
    lib.googlePlaySound( word, function(){
      console.log('Play %s finished',word);
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
