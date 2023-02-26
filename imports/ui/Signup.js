import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'signup_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

let VerificationCode = '';

Template.Signup.onCreated(function HomeOnCreated() {
  // modes
  // 1 = Gather initial data
  // 2 = Enter verify code sent to email
  setd('error','');
  setd('doc',{});
  setd('mode',1);
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
  list.push('<div class="warning">This screen is to sign up as s new user.</div>');
  list.push('<div class="warning">If you have already signed up, click "sign in" instead.</div>');
  list.push('First Name, Email and Pin are required.');
  list.push('The 4 digit pin is required to enable teacher/supervisor" mode.');
  list.push('In teacher/supervisor mode you can add students and view progress.');
  list.push('This website is free of charge!');
  list.push('<div class="warning">Please make sure your email is correct!</div>');
  op.push( { paragraph: list });

  op.push( { label: 'First Name *', type: 'text', required: true, value: getValue(doc,'first_name'), id: 'first_name', message: "you can enter just first name if you like" })
  op.push( { label: 'Last Name', type: 'text', required: false, value: getValue(doc,'last_name'), id: 'last_name' })
  op.push( { label: 'Email *', type: 'email', required: true, value: getValue(doc,'email'), id: 'email' })
  op.push( { label: '4 Digit Pin *', type: 'pin', required: true, value: getValue(doc,'pin'), id: 'pin', message: 'Unlocks parent/supervisor options' })
  const button2 = '';
  op.push( { button: 'Submit', id: 'signup_submit', error: get('error'), button2: button2  } );
  return op;
};

const getFields2 = function(){
  let fields = [];
  const doc = get('doc');

  let op = [];

  let list = [];
  list.push( sprintf('<div class="warning">An email was just sent to your email address "%s".</div>',doc.email));
  list.push('Please verify that the information below is correct');
  list.push('and enter the verification code given in your email.');
  list.push('');
  list.push('If you wish to make any changes, click Back.');
  list.push('If you do not see the email, check your spam folder.');
  op.push( { paragraph: list });

  op.push( { just_info: true, label: 'First Name *', type: 'text', required: true, value: getValue(doc,'first_name'), id: 'first_name', message: "you can enter just first name if you like" })
  op.push( { just_info: true, label: 'Last Name', type: 'text', required: false, value: getValue(doc,'last_name'), id: 'last_name' })
  op.push( { just_info: true, label: 'Email *', type: 'email', required: true, value: getValue(doc,'email'), id: 'email' })
  op.push( { just_info: true, label: '4 Digit Pin *', type: 'pin', required: true, value: getValue(doc,'pin'), id: 'pin', message: 'Unlocks parent/supervisor options' })
  op.push( { just_info: false, label: 'Verification Code *', type: 'pin', required: true, value: '', id: 'verification', message: 'Check your email for the verification code' })
  const button2 = { button: 'Back', id: 'signup_back' };
  op.push( { button: 'Submit', id: 'signup_submit2', error: get('error'), button2: button2  } );

  lib.focus('#verification');
  return op;
};

const showDataEntry2 = function(){
  // user has filled in initial data, show verification screen and ask for verification code
  set('mode',2);
  sendVerificationEmail(function(){
    // Meteor.call('collectionInsert', 'Users', data.doc, function(err,results){
    //   $(e.currentTarget).html(html);
    //   if ( err ) {
    //     console.log('Error: Signup.js line 52',err);
    //   } else if ( results.error) {
    //     set('error',results.error);
    //   } else {
    //     data.doc._id = results.id;
    //     Session.set('currentUser',data.doc);
    //     lib.setCookie('ltrSignin',data.doc);
    //     FlowRouter.go('home');
    //   }
    // });
  });
};

Template.Signup.helpers({
  mode1(){ return get('mode') === 1; },
  mode2(){ return get('mode') === 2; },
  data_entry(){ return lib.flexEntryHtml( getFields() ) },
  data_entry2(){ return lib.flexEntryHtml( getFields2() ) },
});

const randomNumber = function(min, max) {
    return Math.random() * (max - min) + min;
};

const setVerificationCode = function(){
  VerificationCode = Math.round( randomNumber(1000,9999) ).toString();
};

const sendVerificationEmail = function( callback ){
  const doc = get('doc');
  setVerificationCode();
  let data = {};
  data.from = lib.emailFrom;
  data.to = doc.email;
  data.subject = "Here's your ltrfree.com verification code";

  let msg = [];
  msg.push( sprintf('Dear %s,',doc.first_name) );
  msg.push('');
  msg.push('Thank you for signing up on our Learn To Read website.');
  msg.push('');
  msg.push( sprintf('Your verification code is %s',VerificationCode));
  msg.push('');
  msg.push('Please enter the verification code back on our web page!');
  data.text = msg.join('\n');
  Meteor.call('sendEmail', data,function(err,results){
    if ( err ) {
      console.log('Error: Signup.js line 80',err);
    } else {
      callback();
    }
  });
};

Template.Signup.events({
  'click #signup_back'(e){
    set('error','');
    set('mode',1);
  },
  'click #signup_submit'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    let data = lib.docFromFields( getFields() );
    // Normally set to true when email address is verified
    // but now set to true because we don't have email setup
    data.doc.verified = false;
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
          showDataEntry2();
        }
      });
    }
  },
  'click #signup_submit2'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    const v = $('#verification').val();
    if ( v !== VerificationCode ) {
      set('error','Incorrect verification code');
    } else {
      set('error','');
      let doc = get('doc');
      doc.verified = true;
      $(e.currentTarget).html(wait);
      Meteor.call('collectionInsert', 'Users', doc, function(err,results){
        $(e.currentTarget).html(html);
        if ( err ) {
          console.log('Error: Signup.js line 201',err);
        } else if ( results.error) {
          set('error',results.error);
        } else {
          doc._id = results.id;
          Session.set('currentUser',doc);
          lib.setCookie('ltrSignin',doc);
          FlowRouter.go('home');
        }
      });
    }
  },
});
