console.log('jones1',Meteor.isServer);

import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/lists/:_id', {
  name: 'Lists.show',
  action(params, queryParams) {
    console.log("Looking at a list?",BlazeLayout);
    BlazeLayout.render('mainContainer', {main: 'Lists_show_page'});
  }
});
