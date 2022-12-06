import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import * as lib from '../api/lib';

const pre = 'header_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

const refresh = function(n){
  let v = get(n);
  if ( typeof(v) === 'undefined') v = 0;
  set(n,v+1);
};

const getRefresh = function(n){
  return get(n);
};

let Student = '';
Template.header.helpers({
  activeLesson() {
    const list = ['Lesson','Progress'];
    return list.indexOf( FlowRouter.getRouteName() ) >= 0;
  },
  user_info() {
    const dmy = getRefresh('user_info');
    const u = Session.get('currentUser');
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

Template.header.events({
  'click .myaccount'(e){
    FlowRouter.go('myaccount');
  },
  'click #student_done'(e){
    e.preventDefault();
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
