import { Template } from 'meteor/templating';
import { TasksCollection } from '/imports/db/Collections';
import { ReactiveDict } from 'meteor/reactive-dict';

import './App.html';
import "./Login.js";
import "./Router.js";
import "./Lists_show_page.html";
import "./Home.html";
import "./Home.js";
import "./Edit.html";
import "./Edit.js";

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
  'click .user'() {
    Meteor.logout();
  }
});
