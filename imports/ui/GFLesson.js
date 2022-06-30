import * as lib from '../api/lib';

const pre = 'GFLesson_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};

let SoundInProgress = false;

const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.GFLesson.onCreated(function GFLessonOnCreated() {

});

export const DictionaryLookup = function( word, callback ){
  Meteor.call('DictionaryLookup', word , function(err,results){
    if ( err ) {
      console.log('Error in GFLessons.js line 17',err);
    }
    callback(results);
  });
};

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
    if ( l && l.answers ) {
      let op = [];
      for ( let i=0; i < l.answers.length; i++ ) {
        const a = l.answers[i];
        const q2 = lib.addDivsForLongerWords( a.Question );
        let o = { Question: sprintf('Question #%s  %s',a.QuestionNum,q2), list: [] };
        for ( let n=1; n <= 100; n++ ) {
          const txt = a[ sprintf('Answer%s',n)];
          if ( ! txt ) break;
          let checked = '';
          if ( a.selected === n) {
            checked = 'checked';
          }
          const html = sprintf('<input type="checkbox" class="gf_chk_answer" data="%s" data2="%s" %s>',i,n,checked);
          const txt2 = lib.addDivsForLongerWords(txt);

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

const playSound = function(results, callback){
  let list = [];
  for ( let i2=0; i2 < results.length; i2++ ) {
    let url = '';
    const r = results[i2];
    if ( r && r.phonetics && r.phonetics.length > 0) {
      for ( let i=0; i < r.phonetics.length; i++ ) {
        const p = r.phonetics[i];
        if ( p.audio ) {
          if ( ! url ) {
            url = p.audio;
          } else if ( p.audio.indexOf('-us.') > 0 ) {
            url = p.audio;
            break;
          }
        }
      }
    }
    if ( url && list.indexOf(url) < 0 ) list.push(url);
  }
  Meteor.setTimeout(function(){
    playSoundList( list, 0, function(){
      callback();
    });
  },100);
};

const playSoundList = function( list, ix, callback ){
  if ( ix < list.length ) {
    const url = list[ix];
    let sound = new Howl( { src: url });
    sound.on('end',function(){
      Meteor.setTimeout(function(){
        playSoundList( list, ix+1, callback );
      },100);
    });
    sound.play();
  } else {
    callback();
  }
};

const lookupAndPlay = function( e, word, callback, count ){
  if ( ! count ) count = 0;
  if ( SoundInProgress && count < 4 ) {
    Meteor.setTimeout(function(){
      lookupAndPlay( e, word, callback, count + 1 );
    },1000);
  } else {
    SoundInProgress = true;
    set('word',word);
    if ( word === "can't") word = 'cant';
    // $('#dictionary_overlay').show();
    DictionaryLookup( word, function(results){
      playSound(results, function(){
        callback();
      });
    });
  }
};

Template.GFLesson.events({
  'click .lesson_word': function(e){
    let word = $(e.currentTarget).html();
    lookupAndPlay( e, word, function(){
      SoundInProgress = false;
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
