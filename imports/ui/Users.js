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
  setd('show_inactive',false);

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
  show_inactive() { return get('show_inactive')},
  user(){
    let op;
    if ( get('show_inactive') ) {
      op = get('users');
    } else {
      op = filterInactive(get('users'));
    }
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

const filterInactive = function(list){
  let op = [];
  for ( let i=0; i < list.length; i++ ) {
    const l = list[i];
    if ( ! l.inactive ) op.push(l);
  }
  return op;
};

Template.users.events({
  'click .user_edit_save'(e){
    e.preventDefault();
    const id = $(e.currentTarget).attr('data');
    let doc = {};
    doc.first_name = $('#first_name').val().trim();
    doc.last_name = $('#last_name').val().trim();
    doc.email = $('#email').val().trim();
    doc.inactive = $('#inactive').is(':checked');
    let error = '';
    if ( ! doc.first_name ) error = 'Missing First Name';
    if ( ! error && ! doc.email ) error = 'Missing Email';
    if ( ! error && ! lib.verifyEmail( doc.email )) error = 'Invalid Email';
    let users = get('users');
    for ( let i=0; i < users.length; i++ ) {
      let u = users[i];
      if ( u.edit ) {
        u.error = error;
        if ( error ) {
          set('users',users);
        } else {
          Meteor.call('collectionUpdate', 'Users', id, doc, function(err,results){
            if ( err ) {
              console.log('Error in Users.js line 89',err);
            } else {
              loadUsers('');
            }
          });
        }
        break;
      }
    }
  },
  'click .user_edit_cancel'(e){
    const id = $(e.currentTarget).attr('data');
    let users = get('users');
    for ( let i=0; i < users.length; i++ ) {
      let u = users[i];
      u.edit = '';
      u.error = '';
    }
    set('users',users);
  },
  'click #toggle'(e){
    const id = $(e.currentTarget).attr('data');
    let v = get(id);
    set(id,!v);
  },
  'click .user_edit'(e){
    const id = $(e.currentTarget).attr('data');
    let users = get('users');
    for ( let i=0; i < users.length; i++ ) {
      let u = users[i];
      u.edit = '';
      if ( u._id === id ) u.edit = true;
    }
    set('users',users);
  },
  'click .user_delete'(e){
    const id = $(e.currentTarget).attr('data');
    Meteor.call('deleteUser', id, function(err,results){
      loadUsers('');
    });
  },
});
