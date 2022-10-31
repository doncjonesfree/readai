import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import * as lib from '../api/lib';

const pre = 'header_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

let Student = '';
Template.header.helpers({
  activeLesson() {
    return FlowRouter.getRouteName() === 'Lesson';
  },
  user_info() {
    const u = Session.get('currentUser');
    if ( ! u ) {
      return { user: false };
    } else {
      return { user: true, user_name: u.first_name, masterUser: u.masterUser };
    }
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
    FlowRouter.go('home');
  }
});
