import { Template } from 'meteor/templating';
import { TasksCollection } from '/imports/db/TasksCollection';
import { ReactiveDict } from 'meteor/reactive-dict';

import './App.html';
import './Task.js';
import "./Login.js";
import "./Router.js";
import "./Lists_show_page.html";

const HIDE_COMPLETED_STRING = "hideCompleted";
const IS_LOADING_STRING = "isLoading";

const getUser = () => Meteor.user();
const isUserLogged = () => !!getUser();

Template.mainContainer.onCreated(function mainContainerOnCreated() {
  this.state = new ReactiveDict('app'); // retain value on reload
  this.state.set('data',1);

  const handler = Meteor.subscribe('tasks');
  Tracker.autorun(() => {
    this.state.set(IS_LOADING_STRING, !handler.ready());
  });
});

const getTasksFilter = () => {
  const user = getUser();

  const hideCompletedFilter = { isChecked: { $ne: true } };

  const userFilter = user ? { userId: user._id } : {};

  const pendingOnlyFilter = { ...hideCompletedFilter, ...userFilter };

  return { userFilter, pendingOnlyFilter };
}

Template.mainContainer.helpers({
  tasks() {
    const instance = Template.instance();
    const hideCompleted = instance.state.get(HIDE_COMPLETED_STRING);

    const { pendingOnlyFilter, userFilter } = getTasksFilter();

    if (!isUserLogged()) {
     return [];
    }

    return TasksCollection.find(hideCompleted ? pendingOnlyFilter : userFilter, {
      sort: { createdAt: -1 },
    }).fetch();
  },
  hideCompleted() {
    return Template.instance().state.get(HIDE_COMPLETED_STRING);
  },
  incompleteCount() {
    if (!isUserLogged()) {
      return '';
    }
    const { pendingOnlyFilter } = getTasksFilter();

    const incompleteTasksCount = TasksCollection.find(pendingOnlyFilter).count();
    return incompleteTasksCount ? `(${incompleteTasksCount})` : '';
  },
  isUserLogged() {
    const tmp = isUserLogged();
    return tmp;
  },
  getUser() {
    return getUser();
  },
  data() {
    const instance = Template.instance();
    return instance.state.get('data');
  },
  isLoading() {
    const instance = Template.instance();
    return instance.state.get(IS_LOADING_STRING);
  }
});

Template.mainContainer.events({
  'click #update_data'(event,instance){
    const data = parseInt( instance.state.get('data') ) + 1;
    instance.state.set('data',data);
  },
  "click #hide-completed-button"(event, instance) {
    const currentHideCompleted = instance.state.get(HIDE_COMPLETED_STRING);
    instance.state.set(HIDE_COMPLETED_STRING, !currentHideCompleted);
  },
  'click .user'() {
    Meteor.logout();
  }
});

Template.form.events({
  "submit .task-form"(event) {
    // Prevent default browser form submit
    event.preventDefault();

    // Get value from form element
    const target = event.target;
    const text = target.text.value;

    // Insert a task into the collection
    Meteor.call('tasks.insert', text);

    // Clear form
    target.text.value = '';
  }
})
