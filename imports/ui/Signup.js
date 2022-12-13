import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'signup_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Signup.onCreated(function HomeOnCreated() {
  setd('error','');
  setd('doc',{});
  lib.focus( '#first_name' );
});

const getValue = function(doc,id){
  let v = doc[id];
  if ( ! v ) v = '';
  return v;
};

const getFields = function(){
  let fields = [];
  const doc = get('doc');

  let op = [];

  let list = [];
  list.push('First Name and Email are required.');
  list.push('The 4 digit pin is required to enable "teacher" or "supervisor" mode.');
  list.push('In teacher/supervisor mode you can add students, view progress and quiz on words.');
  list.push('This website is free of charge!');
  op.push( { paragraph: list });

  op.push( { label: 'First Name *', type: 'text', required: true, value: getValue(doc,'first_name'), id: 'first_name', message: "you can enter just first name if you like" })
  op.push( { label: 'Last Name', type: 'text', required: false, value: getValue(doc,'last_name'), id: 'last_name' })
  op.push( { label: 'Email *', type: 'email', required: true, value: getValue(doc,'email'), id: 'email' })
  op.push( { label: '4 Digit Pin *', type: 'pin', required: true, value: getValue(doc,'pin'), id: 'pin', message: 'Unlocks parent/supervisor options' })
  const button2 = '';
  op.push( { button: 'Submit', id: 'signup_submit', error: get('error'), button2: button2  } );
  return op;
};

Template.Signup.helpers({
  data_entry() {
    return lib.flexEntryHtml( getFields() );
  },
});

Template.Signup.events({
  'click #signup_submit'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    let data = lib.docFromFields( getFields() );
    // Normally set to true when email address is verified
    // but now set to true because we don't have email setup
    data.doc.verified = true;
    data.doc.email = data.doc.email.toLowerCase().trim();
    set('doc',data.doc);
    set('error',data.error);
    if ( ! data.error ) {
      $(e.currentTarget).html(wait);
      Meteor.call('collectionFind', 'Users', { email: data.doc.email }, function(err,results){
        if ( err ) {
          console.log('Error: Signup.js line 55',err);
        } else if ( results.length > 0 ) {
          set('error','That email already exists. Sign in instead');
        } else {
          Meteor.call('collectionInsert', 'Users', data.doc, function(err,results){
            $(e.currentTarget).html(html);
            if ( err ) {
              console.log('Error: Signup.js line 52',err);
            } else if ( results.error) {
              set('error',results.error);
            } else {
              data.doc._id = results.id;
              Session.set('currentUser',data.doc);
              lib.setCookie('ltrSignin',data.doc);
              FlowRouter.go('home');
            }
          });
        }
      });
    }
  },
});
