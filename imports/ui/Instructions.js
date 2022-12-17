import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'instructions_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

let User = '';
let Supervisor = '';

Template.instructions.onCreated(function instructionsOnCreated() {
  User = lib.getCurrentUser();
  console.log('jones15a User',User);
  console.log('jones15c Supervisor',lib.getSupervisorValue());
  Meteor.setTimeout(function(){
    set('screen', Session.get('pre') );
  },500);
});

const enabled = function(){
  const pre = Session.get('pre');
  const u = Session.get('currentUser');
  if ( u && u.verbal ) {
    const type = typeof(u.verbal[pre]);
    if ( type === 'undefined' ) return true;
    return u.verbal[pre];
  }
  return true;
};

Template.instructions.helpers({
  mode1() { return get('mode') === 1; },
  ins_enabled: function(){
    return enabled();
  },
  screen() {
    let screen = get('screen');
    if ( screen ) {
      playInstructions();
      return get('screen');
    }
    return '';
  },
});

const gfLesson = function(){
  const student = Session.get('GFLesson_student');
  const setDiff = student.set_difficulty;

  let file = '$gf_msg';
  if ( setDiff ) {
    file = '$gf_diff_msg';
  }
  console.log('jones56',file);
  if ( file ) play(file);
};

const play = function(file){
  // play the file
  lib.googlePlaySound( file, function(){
    console.log('%s finished playing',file);
  });
};

const studentHome = function(){
  const m = lib.int( Session.get('StudentHome_mode'));
  const s = lib.getSupervisorValue();
  let file = '';
  switch ( m ) {
    case 2:
    if ( s ) {
      file = '$home_msg_s';
    } else {
      file = '$home_msg';
    }
    break;

    case 3: // add or edit student
    file = '$student_msg';
    break;
  }

  // if ( ! file ) file = '$instructions_not_found';

  if ( file ) play(file);
};

let LastPlay = 0;
const playInstructions = function(){
  if ( ! enabled() ) return;
  const delta = lib.epoch() - LastPlay;
  if ( delta < 1000 ) {
    console.log('jones60a wait');
    return;
  }
  LastPlay = lib.epoch();
  console.log('jones60b play');
  switch ( get('screen')) {
    case 'StudentHome_':
    studentHome();
    break;

    case 'GFLesson_':
    gfLesson();
    break;
  }
};

Template.instructions.events({
  'click .ins_change'(e){
    // restore all inactive students
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    const v = lib.int( $(e.currentTarget).attr('data'));
    lib.changeInstructionAudio(v);
    console.log('jones99',v);
    if ( ! v ) {
      lib.googlePlaySound( '$verbal_off', function(){
        console.log('Verbal instructions off');
      });
    }
  },
});

/*
Gather facts instructions

*** w/o +-
Click on any word you don't know.
[sPause sec=0.2 ePause]
After you click the word
[sPause sec=0.1 ePause]
the letter D
[sPause sec=0.1 ePause]
will appear after the word.
[sPause sec=0.2 ePause]
Click the
D
[sPause sec=0.1 ePause]
to hear the definition of the word.
[sPause sec=0.2 ePause]
Answer the questions
[sPause sec=0.1 ePause]
and click Done when ready.
[sPause sec=0.2 ePause]
Click the speaker near the top to turn off verbal instructions.

*** with +-
Click on any word you don't know.
[sPause sec=0.2 ePause]
After you click the word
[sPause sec=0.1 ePause]
the letter D
[sPause sec=0.1 ePause]
will appear after the word.
[sPause sec=0.2 ePause]
Click the
D
[sPause sec=0.1 ePause]
to hear the definition of the word.
[sPause sec=0.2 ePause]
Answer the questions
[sPause sec=0.1 ePause]
and click Done when ready.
[sPause sec=0.2 ePause]
If this lesson seems too hard, click the minus sign near the top.
[sPause sec=0.2 ePause]
If too easy, click the plus sign.
[sPause sec=0.2 ePause]
Click the speaker near the top to turn off verbal instructions.
*/
