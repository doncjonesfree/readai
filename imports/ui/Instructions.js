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
  setd('ins_playing',false);
  setd('play',false);
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
  ins_playing: function(){ return get('ins_playing'); },
  ins_enabled: function(){ return enabled(); },
  play: function(){
    const p = get('play');
    if ( p ) playInstructions();
    return p;
  },
  screen() {
    const screen = Session.get('pre');
    if ( screen ) {
      playInstructions();
      return Session.get('pre');
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
  if ( file ) play(file);
};

let JustPlayed = ''; // file we just played
const play = function(file){
  if ( JustPlayed === file ) {
    console.log('Just played %s - ignore. pre=%s',file,Session.get('pre'));
    return; // ignore
  }
  // play the file
  JustPlayed = file;
  set('ins_playing',true);
  lib.googlePlaySound( file, function(){
    set('ins_playing',false);
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
    return;
  }
  LastPlay = lib.epoch();
  switch ( Session.get('pre') ) {
    case 'StudentHome_':
    studentHome();
    break;

    case 'GFLesson_':
    gfLesson();
    break;
  }
};

const playClicked = function(e){
  e.stopPropagation();
  e.preventDefault();
  const wait = '...';
  const html = $(e.currentTarget).html();
  if ( wait === html ) return;
  const v = lib.int( $(e.currentTarget).attr('data'));
  lib.changeInstructionAudio(v);
  if ( ! v ) play( '$verbal_off');
};

Template.instructions.events({
  'click .ins_playing'(e){
    playClicked(e);
  },
  'click .ins_change'(e){
    playClicked(e);
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
