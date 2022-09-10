import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'users_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.users.onCreated(function usersOnCreated() {
  // modes
  // 1: Load users
  // 2: Show list of options
  set('mode',1);
  setd('users',[]);

  loadUsers('', function(){
    set('mode',2);
  });
});

Template.users.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  mode4() { return get('mode') === 4; },
  mode5() { return get('mode') === 5; },
  mode6() { return get('mode') === 6; },
  user(){
    let op = get('users');
    return op;
  },
});

const loadUsers = function(e, callback){
  // show users
  let wait, html;
  if ( e ) {
    wait = '...';
    html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
  }
  Meteor.call('collectionFind', 'Users', {}, function(err,results){
    if ( e ) $(e.currentTarget).html(html);
    if ( err ) {
      console.log('Error: Home.js line 33',err);
    } else {
      set('users',results);
      if ( callback ) callback();
    }
  });
};

Template.users.events({
  'click .user_delete'(e){
    const id = $(e.currentTarget).attr('data');
    Meteor.call('deleteUser', id, function(err,results){
      loadUsers('');
    });
  },
});
