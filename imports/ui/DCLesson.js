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
    l.Shape = expandShape( l.Shape );
    l.answer = [];
    for ( let i=1; i <= 4; i++ ) {
      let a = l[ sprintf('Answer%s',i)];
      if ( a ) {
        l.answer.push( { nbr: i, text: a });
      }
    }
    return l;
  },
});

Template.DCLesson.events({
  'click #gf_done': function(e){
  },
});
