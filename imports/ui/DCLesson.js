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

Template.DCLesson.helpers({
  lesson() {
    let l = get('lesson');
    if ( ! l ) return '';
    let uniqueCount = 0;
    l.Shape = expandShape( l.Shape );
    l.answer = [];
    const tmp = lib.addDivsForLongerWords( l.Question, uniqueCount );
    l.Question = tmp.op;
    uniqueCount = tmp.uniqueCount;
    console.log('jones31',tmp);

    for ( let i=1; i <= 4; i++ ) {
      let a = l[ sprintf('Answer%s',i)];
      if ( a ) {
        const tmp = lib.addDivsForLongerWords( a, uniqueCount );
        a = tmp.op;
        uniqueCount = tmp.uniqueCount;
        l.answer.push( { nbr: i, text: a });
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

Template.DCLesson.events({
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
