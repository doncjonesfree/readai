import * as lib from '../api/lib';

const pre = 'GFLesson_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};

const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.GFLesson.onCreated(function GFLessonOnCreated() {

});

Template.GFLesson.helpers({
  lesson() {
    let l = get('lesson');
    if ( l && l.lesson ) {
      l.lesson.Paragraph = lib.formatGFParagraph( l.lesson.Paragraph );
      return l.lesson;
    }
    return '';
  },
  word(){
    return get('word');
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

          o.list.push( { checkbox: html, answer: sprintf('%s.&nbsp;%s', lib.numberToLetter(n), txt2 ) } ); //
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

Template.GFLesson.events({
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
