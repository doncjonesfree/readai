import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import * as lib from '../api/lib';

const pre = 'header_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

const refresh = function(arg){
  const n = sprintf('refresh_%s',arg)
  let v = get(n);
  if ( typeof(v) === 'undefined') v = 0;
  set(n,v+1);
};

const getRefresh = function(arg){
  const n = sprintf('refresh_%s',arg)
  return get(n);
};

const enterPin = function(pinError){
  // const pinError = { msg: 'Sorry, incorrect pin', pin: pin };
  set('pinResponse','');
  let list = [];
  list.push( { msg: 'If you forgot your pin, click <a href="#" id="email_pin">email pin</a>.' } );
  list.push( { msg: 'Check Spam and "All Mail" if you do not see the email.' } );
  list.push( { msg: '' } );
  let pin = '';
  if ( pinError ) pin = pinError.pin;
  const obj = { autocomplete: 'off', label: 'Pin #', id: "pin", value: pin, title: 'Enter pin # to go into supervisor mode'};
  // { label: id: placeholder: value:, title }
  list.push( { msg: lib.inputHtml(obj) } );
  if ( pinError ) {
    list.push( { msg: sprintf('<div class="error">%s</div>',pinError.msg) } );
  }
  let options = {};
  options.setVariables = [ { name: 'header_showMessage', value: false } ];
  options.getVariables = [ { name: 'header_pin', id: '#pin' }];
  options.title = 'Teacher / Supervisor Mode';
  options.messages = list;
  options.setResponse = 'header_pinResponse';
  options.buttons = [];
  options.buttons.push( { label: 'Submit', value: 1, cls: 'button' });
  options.buttons.push( { label: 'Cancel', value: 0, cls: 'button button-cancel' });
  Meteor.setTimeout(function(){
    Session.set('Message_options',options);
    set('showMessage',true);
    lib.focus('#pin');
  },400);
};

const isPinValid = function(v){
  const user = lib.getCurrentUser();
  if ( user && user.pin === v ) return true;
  return false;
};

let Student = '';
Template.header.helpers({
  local(){
    return Meteor.isDevelopment;
  },
  pinResponse(){
    if ( lib.int(get('pinResponse')) === 1 ) {
      // submit`
      // we are trying to turn on supervisor mode - need to check pin #
      const v = lib.int( get('pin'));
      if ( isPinValid(v) ) {
        lib.setSupervisorMode(1);
      } else {
        let pinError = {};
        pinError.pin = v;
        pinError.msg = 'Invalid Pin #';
        enterPin( pinError );
      }
    }
  },
  supervisor(){
    return Session.get('supervisor');
  },
  showMessage(){ return get('showMessage')},
  activeLesson() {
    const list = ['Lesson','Progress'];
    return list.indexOf( FlowRouter.getRouteName() ) >= 0;
  },
  user_info() {
    const dmy = getRefresh('user_info');
    const u = lib.getCookie('ltrSignin');
    const masterUser = lib.getCookie('ltrMaster');
    if ( ! u ) {
      return { user: false, masterUser: masterUser };
    } else {
      return { user: true, user_name: u.first_name, masterUser: masterUser };
    }
  },
  isMasterUser(){
    const t = lib.getCookie('ltrMaster');
    return t;
  },
  name() {
    const student = lib.getCookie('student');
    if ( student && student.name ) return student.name;
    return '';
  },
  points() {
    if ( ! Student ) {
      // first call
      Student = lib.getCookie('student');
      set('points', lib.getCookie('studentPoints'));
    }
    const points = get('points');
    if ( Student && Student.award_points && points ) return sprintf('%s points',points);
    return '';
  },
});

// From stripe.com payment links
const urlOnetime = 'https://donate.stripe.com/9AQeX3cL00yI8bSbII';
const urlMonthly = 'https://donate.stripe.com/00geX3bGW1CM8bScMO';

export const donationPopup = function( arg ){
  let preamble = 'header';
  if ( arg ) preamble = arg;
  let list = [ { msg: 'Select your donation type'}];
  let options = {};
  options.setVariables = [ { name: sprintf('%s_showMessage',preamble), value: false } ];
  options.getVariables = [];
  options.title = 'Donation';
  options.messages = list;
  options.setResponse = sprintf('%s_donationPopupResponse',preamble);
  options.buttons = [];
  options.buttons.push( { label: 'One-Time', value: 1, cls: 'button', href: urlOnetime });
  options.buttons.push( { label: 'Monthly', value: 2, cls: 'button', href: urlMonthly });
  options.buttons.push( { label: 'Cancel', value: 0, cls: 'button button-cancel' });
  Session.set('Message_options',options);
  set('showMessage',true);
};

Template.header.events({
  'click #donate_popup'(e){
    donationPopup();
  },
  'click #email_pin'(e){
    const wait = 'email sent!';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    const user = lib.getCurrentUser();

    let lines = [];
    lines.push( sprintf('%s,', user.first_name));
    lines.push('');
    lines.push(sprintf('Your pin # is %s',user.pin));
    lines.push('');
    lines.push('Thank for using our website!');
    lines.push('');
    lines.push('Learn to Read Support');
    let data = {};
    data.from = lib.emailFrom;
    data.to = user.email;
    data.subject = sprintf('%s, here is the pin # you requested', user.first_name);
    data.text = lines.join('\n');

    // data = { from: to: subject: text: }
    $(e.currentTarget).html(wait);
    Meteor.call('sendEmail', data, function(err,results){
      if ( err ) {
        console.log('Error in Header.js line 131',err);
      }
      Meteor.setTimeout(function(){
        $(e.currentTarget).html(html);
      },2000);
    });
  },
  'click .hdr_lock'(e){
    // turn supervisor mode on or off
    e.stopPropagation();
    e.preventDefault();
    const v = lib.int( $(e.currentTarget).attr('data')); // 1=enter supervisor mode
    if ( v ) {
      enterPin();
    } else {
      lib.setSupervisorMode(v);
    }
  },
  'click .myaccount'(e){
    FlowRouter.go('myaccount');
  },
  'click #student_done'(e){
    e.preventDefault();
    lib.stopAudio();
    FlowRouter.go('home');
  },
  'click #signup'(e){
    e.preventDefault();
    FlowRouter.go('signup');
  },
  'click #signin'(e){
    e.preventDefault();
    FlowRouter.go('signin');
  },
  'click .hdr_home'(e){
    e.preventDefault();
    FlowRouter.go('home');
  },
  'click .signout'(e){
    Session.set('currentUser','');
    lib.setCookie('ltrSignin',''); // clear the cookie as well
    lib.setCookie('ltrMaster',false);
    refresh('user_info');
    FlowRouter.go('home');
  }
});
