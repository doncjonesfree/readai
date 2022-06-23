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

const lettersEtc = "abcdefghijklmnopqrstuvwxya'";
const partOfWord = function(c){
  return lettersEtc.indexOf(c.toLowerCase()) >= 0;
};

const addDivsForLongerWords = function(arg){
  const semiComing = function(w,ix){
    // true if a semi colon is coming soon - like in &quot;
    for ( let i=ix; i < w.length; i++ ) {
      const c = w.substr(i,1);
      if ( c === ';') {
        if ( i - ix < 6 ) return true;
        return false;
      }
    }
    return false;
  };

  const breakUpWord = function(w){
    let before = [];
    let word = [];
    let after = [];
    let waitForSemi = false;
    for ( let i=0; i < w.length; i++ ) {
      let c = w.substr(i,1);
      if ( waitForSemi ) {
        before.push(c);
        if ( c === ';' ) waitForSemi = false;
        continue;
      }
      if ( c === '&' && semiComing(w,i+1) && word.length === 0 ) {
        waitForSemi = true;
        before.push(c);
        continue;
      }
      if ( partOfWord(c) && after.length === 0 ) {
        word.push(c);
      } else if ( word.length > 0 ) {
        after.push(c);
      } else {
        before.push(c);
      }
    }
    before = before.join('');
    after = after.join('');
    word = word.join('');
    return { before: before, word: word, after: after };
  };

  let p = arg.replace(/\n/g,' ');
  let list = p.split(' ');
  let op = [];
  for ( let i=0; i < list.length; i++ ) {
    let w = list[i];
    let obj = breakUpWord(w);
    if ( obj.word.length >= 2 ) {
      if ( obj.word ) {
        op.push(sprintf('%s<div class="lesson_word">%s</div>%s',obj.before,obj.word,obj.after));
      } else {
        op.push(obj.before);
      }
    } else {
      op.push(w);
    }
  }
  return op.join('&nbsp;');
};

const formatGFParagraph = function( arg ){
  let p = arg;
  const first = p.trim().split(' ')[0];
  const special = '@@@';
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
    p = op.join(special); // unusual string
    p = addDivsForLongerWords(p);
    p = p.replace(/@@@/g,'<br><br>');
    return p;
  } else {
    return addDivsForLongerWords(p);
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
  word(){
    return get('word');
  },
  question() {
    let l = get('lesson');
    if ( l && l.answers ) {
      let op = [];
      for ( let i=0; i < l.answers.length; i++ ) {
        const a = l.answers[i];
        const q2 = addDivsForLongerWords( a.Question );
        let o = { Question: sprintf('Question #%s  %s',a.QuestionNum,q2), list: [] };
        for ( let n=1; n <= 100; n++ ) {
          const txt = a[ sprintf('Answer%s',n)];
          if ( ! txt ) break;
          let checked = '';
          if ( a.selected === n) {
            checked = 'checked';
          }
          const html = sprintf('<input type="checkbox" class="gf_chk_answer" data="%s" data2="%s" %s>',i,n,checked);
          const txt2 = addDivsForLongerWords(txt);

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
    console.log('jones195',url);
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
