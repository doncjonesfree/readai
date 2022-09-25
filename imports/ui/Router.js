import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/', {
  name: 'home',
  action(params, queryParams) {
    BlazeLayout.render('mainContainer', {main: 'Home'});
  }
});

FlowRouter.route('/signup', {
  name: 'Signup',
  action(params, queryParams) {
    BlazeLayout.render('mainContainer', {main: 'Signup'});
  }
});

FlowRouter.route('/lesson', {
  name: 'Lesson',
  action(params, queryParams) {
    BlazeLayout.render('mainContainer', {main: 'Lesson'});
  }
});

FlowRouter.route('/signin', {
  name: 'Signin',
  action(params, queryParams) {
    BlazeLayout.render('mainContainer', {main: 'Signin'});
  }
});

FlowRouter.route('/edit', {
  name: 'Edit',
  action(params, queryParams) {
    BlazeLayout.render('mainContainer', {main: 'Edit'});
  }
});

FlowRouter.route('/lists/:_id', {
  name: 'Lists.show',
  action(params, queryParams) {
    BlazeLayout.render('mainContainer', {main: 'Lists_show_page'});
  }
});
