import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

Template.Home.onCreated(function HomeOnCreated() {
});

Template.Home.events({
  'click #edit_lessons'() {
    Session.set('edit_mode',1);
    FlowRouter.go('Edit');
  },
});
