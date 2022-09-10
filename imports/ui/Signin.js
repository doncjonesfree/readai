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

const getFields = function(){
  let fields = [];
  const doc = get('doc');

  const value = function(id){
    let v = doc[id];
    if ( ! v ) v = '';
    return v;
  };
  fields.push( { label: 'Email', id: 'email', type: 'email', required: true, value: value('email') });
  fields.push( { button: 'Sign In', id: 'signin_submit', error: get('error') } );
  return fields;
};

Template.Signin.helpers({
  data_entry() {
    return lib.dataEntryHtml( getFields() );
  },
});

const signin = function(e, id ){
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
      } else {
        Session.set('currentUser',results[0]); // global so others can see it
        FlowRouter.go('home');
        Meteor.call('masterUser', results[0].email, function(err,master){
          if ( err ) {
            console.log('Error: Signin.js line 61',err);
          } else {
            if ( master ) {
              let doc = results[0];
              doc.masterUser = true;
              Session.set('currentUser',doc);
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
        signin(e, '#signin_submit');
      },200);
    }
  },
  'click #signin_submit'(e){
    signin(e, '#signin_submit');
  },
});
