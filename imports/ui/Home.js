import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'home_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Home.onCreated(function HomeOnCreated() {
  // modes
  // 1: Show list of options
  // 2: List / Edit users
  setd('mode',1);
});

Template.Home.helpers({
  masterUser() {
    const u = lib.getCurrentUser();
    if ( u && u.masterUser ) return true;
    return false;
  },
  signedIn(){
    const u = lib.getCurrentUser();
    if ( u && ! u.masterUser ) return true;
    return false;
  },
  notSignedIn(){
    const u = lib.getCurrentUser();
    if ( u ) return false;
    return true;
  },
  mode1() { return get('mode') === 1 },
  mode2() { return get('mode') === 2 },
  mode3() { return get('mode') === 3 },
  users() {
    let op = get('users');
    if ( ! op ) return '';
    for ( let i=0; i < op.length; i++ ) {
      let o = op[i];
      if ( i % 2 === 1 ) o.cls = 'rpt_highlight';
      if ( o.inactive ) o.last_name = sprintf('%s (inactive)',o.last_name);
    }
    return op;
  },
});

Template.Home.events({
  'click .change_mode'(e) {
    const m = lib.int( $(e.currentTarget).attr('data'));
    set('mode',m);
  },
});
