import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'signin_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Signin.onCreated(function SigninOnCreated() {
  setd('error','');
  setd('doc',{});
  lib.focus( '#email' );
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
  op.push( { label: 'Email', type: 'text', required: true, value: getValue(doc,'email'), id: 'email' })
  const button2 = '';
  op.push( { button: 'Sign In', id: 'signin_submit', error: get('error'), button2: button2  } );
  return op;
};

Template.Signin.helpers({
  data_entry() {
    return lib.flexEntryHtml( getFields() );
  },
});

const signin = function(id ){
  const wait = '...';
  const html = $(id).html();
  if ( wait === html ) return;
  let data = lib.docFromFields( getFields() );
  // Normally set to true when email address is verified
  // but now set to true because we don't have email setup
  data.doc.verified = true;
  data.doc.email = data.doc.email.toLowerCase().trim();
  set('doc',data.doc);
  set('error',data.error);
  if ( ! data.error ) {
    $(id).html(wait);
    Meteor.call('collectionFind', 'Users', { email: data.doc.email }, function(err,results){
      if ( err ) {
        console.log('Error: Signin.js line 55',err);
      } else if ( results.length === 0 ) {
        set('error','Email not found');
      } else if ( results[0].inactive ) {
        set('error','Sorry, No longer an active user');
      } else {
        Session.set('currentUser',results[0] ); // global so others can see it
        lib.setCookie('ltrSignin',results[0] );
        Meteor.call('masterUser', results[0].email, function(err,master){
          if ( err ) {
            console.log('Error: Signin.js line 61',err);
          } else {
            if ( master && Meteor.isDevelopment ) {
              lib.setCookie('ltrMaster',true );
              FlowRouter.go('master');
            } else {
              lib.setCookie('ltrMaster',false );
              FlowRouter.go('home');
            }
          }
        });
      }
    });
  }
};

Template.Signin.events({
  'keydown #email'(e){
    if ( e.which === 13 ) {
      Meteor.setTimeout(function(){
        signin('#signin_submit');
      },200);
    }
  },
  'click #signin_submit'(e){
    e.stopPropagation();
    e.preventDefault();
    signin('#signin_submit');
  },
});
