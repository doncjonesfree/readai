import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

Template.header.helpers({
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
  'click .hdr_home'(e){
    e.preventDefault();
    FlowRouter.go('home');
  },
  'click #signout'(e){
    Session.set('currentUser','');
  }
});
