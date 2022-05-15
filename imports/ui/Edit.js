import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'edit_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Edit.onCreated(function HomeOnCreated() {
  setd('mode',1);
});

Template.Edit.helpers({
  mode0() { return get('mode') === 0 },
  mode1() { return get('mode') === 1 },
  mode2() { return get('mode') === 2 },
});

Template.Edit.events({
  'click #home'() {
    FlowRouter.go('home'); //
  },
  'click #change_mode'(e) {
    const m = lib.int( $(e.currentTarget).attr('data'));
    set('mode',m);
  },
  'click #edit_gather_facts'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    Meteor.call('loadGatherFacts', function(err,results){
      $(e.currentTarget).html(html);
      console.log('jones20',results);
      if ( err ) {
        console.log('Error: Edit.js line 21',err);
      } else {
        set('mode',2);
      }
    });
  },
});
