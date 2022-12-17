import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const isSupervisor = function(){
  return lib.int( Session.get('supervisor') );
};

FlowRouter.route('/', {
  name: 'home',
  action(params, queryParams) {
    lib.getSupervisorMode();
    Session.set('pre','StudentHome_')
    BlazeLayout.render('mainContainer', {main: 'Home'});
  }
});

FlowRouter.route('/signup', {
  name: 'Signup',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'Signup'});
  }
});

FlowRouter.route('/myaccount', {
  name: 'MyAccount',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'MyAccount'});
  }
});

FlowRouter.route('/master', {
  name: 'Master',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'master'});
  }
});

FlowRouter.route('/backup', {
  name: 'Backup',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'Backup'});
  }
});

FlowRouter.route('/lesson', {
  name: 'Lesson',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'Lesson'});
  }
});

FlowRouter.route('/progress', {
  name: 'Progress',
  action(params, queryParams) {
    lib.getSupervisorMode();
    Session.set('pre','Progress_')
    if ( isSupervisor() ) {
      BlazeLayout.render('mainContainer', {main: 'Progress'});
    } else {
      BlazeLayout.render('mainContainer', {main: 'Home'});
    }
  }
});

FlowRouter.route('/signin', {
  name: 'Signin',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'Signin'});
  }
});

FlowRouter.route('/edit', {
  name: 'Edit',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'Edit'});
  }
});

FlowRouter.route('/lists/:_id', {
  name: 'Lists.show',
  action(params, queryParams) {
    lib.getSupervisorMode();
    BlazeLayout.render('mainContainer', {main: 'Lists_show_page'});
  }
});
