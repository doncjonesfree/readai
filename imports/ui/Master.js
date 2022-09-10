import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'master_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.master.onCreated(function masterOnCreated() {
  // modes
  // 1: Show list of options
  // 2: List / Edit users
  setd('mode',1);
});

Template.master.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  mode4() { return get('mode') === 4; },
  mode5() { return get('mode') === 5; },
  mode6() { return get('mode') === 6; },
});

Template.master.events({
  'click .change_mode'(e){
    const m = lib.int( $(e.currentTarget).attr('data') );
    set('mode',m);
  },
});
