import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { addDcAnswerCheckbox } from './DCLesson';
import * as lib from '../api/lib';

const pre = 'Backup_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Backup.onCreated(function BackupOnCreated() {
  // modes:
});

const refresh = function(n){
  let v = get(n);
  if ( typeof(v) === 'undefined') v = 0;
  set(n,v+1);
};

const getRefresh = function(n){
  return get(n);
};

Template.Backup.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
});
Template.Backup.events({
  'click #backup': function(e){
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    Meteor.call('backupToText', function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error: Backup.js line 33',err);
      } else {
        console.log('backupToText',results);
      }
    });
  },
});
