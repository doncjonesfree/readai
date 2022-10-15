import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import * as lib from '../api/lib';

Template.header.helpers({
  activeLesson() {
    return FlowRouter.getRouteName() === 'Lesson';
  },
  user_info() {
    const u = Session.get('currentUser');
    if ( ! u ) {
      return { user: false };
    } else {
      return { user: true, name: u.first_name, masterUser: u.masterUser };
    }
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
