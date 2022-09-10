import { Template } from 'meteor/templating';
import { TasksCollection } from '/imports/db/Collections';
import { ReactiveDict } from 'meteor/reactive-dict';

import './App.html';
import "./Router.js";
import "./Home.html";
import "./Home.js";
import "./Edit.html";
import "./Edit.js";
import "./GFLesson.html";
import "./GFLesson.js";
import "./DCLesson.html";
import "./DCLesson.js";
import "./Header.html";
import "./Header.js";
import "./Signup.html";
import "./Signup.js";
import "./Signin.html";
import "./Signin.js";
import "./Master.html";
import "./Master.js";
import "./Users.html";
import "./Users.js";

const IS_LOADING_STRING = "isLoading";

const getUser = () => Meteor.user();
const isUserLogged = () => !!getUser();

const state = new ReactiveDict(''); // retain value on reload if name specified

Template.mainContainer.onCreated(function mainContainerOnCreated() {
  this.state = new ReactiveDict(''); // retain value on reload if name specified
  this.state.set('data',1);

  const handler = Meteor.subscribe('tasks');
  Tracker.autorun(() => {
    this.state.set(IS_LOADING_STRING, !handler.ready());
  });
});

Template.mainContainer.helpers({
  isUserLogged() {
    const tmp = isUserLogged();
    return tmp;
  },
  getUser() {
    return getUser();
  },
  isLoading() {
    const instance = Template.instance();
    return instance.state.get(IS_LOADING_STRING);
  }
});

Template.mainContainer.events({
  'click #signup'() {
    console.log('jones51');
  }
});
