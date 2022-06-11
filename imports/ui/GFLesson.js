import * as lib from '../api/lib';

const pre = 'GFLesson_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.GFLesson.onCreated(function GFLessonOnCreated() {
});

const formatGFParagraph = function( p ){
  const first = p.trim().split(' ')[0];
  if ( first === '1.') {
    // we have a numbered list of choices
    let op = [];
    for ( let n=1; n < 1000; n++ ) {
      const ix = p.indexOf( sprintf('%s.',n));
      if ( ix < 0 ) break;
      let ix2 = p.indexOf( sprintf('%s.',n+1));
      if ( ix2 < 0 ) ix2 = p.length;
      op.push( p.substr(ix, ix2 - ix));
    }
    return op.join('<br><br>');
  } else {
    return p;
  }
};

Template.GFLesson.helpers({
  lesson() {
    let l = get('lesson');
    if ( l && l.lesson ) {
      l.lesson.Paragraph = formatGFParagraph( l.lesson.Paragraph );
      return l.lesson;
    }
    return '';
  },
  question() {
    let l = get('lesson');
    if ( l && l.answers ) {
      let op = [];
      for ( let i=0; i < l.answers.length; i++ ) {
        const a = l.answers[i];
        let o = { Question: sprintf('Question #%s  %s',a.QuestionNum,a.Question), list: [] };
        for ( let n=1; n <= 100; n++ ) {
          const txt = a[ sprintf('Answer%s',n)];
          if ( ! txt ) break;
          let checked = '';
          if ( a.selected === n) {
            checked = 'checked';
          }
          const html = sprintf('<input type="checkbox" class="gf_chk_answer" data="%s" data2="%s" %s>',i,n,checked);
          o.list.push( { checkbox: html, answer: sprintf('%s. %s', lib.numberToLetter(n), txt) } ); //
        }
        op.push(o);
      }
      return op;
    }
    return '';
  },
  mode1() { return get('mode') === 1 },
});

Template.GFLesson.events({
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
