import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'signup_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Signup.onCreated(function HomeOnCreated() {
  setd('error','');
  setd('doc',{});
  lib.focus( '#first_name' );
});

const getFields = function(){
  let fields = [];
  const doc = get('doc');

  const value = function(id){
    let v = doc[id];
    if ( ! v ) v = '';
    return v;
  };
  fields.push( { label: 'First Name', id: 'first_name', type: 'text', required: true, value: value('first_name') });
  fields.push( { label: 'Last Name', id: 'last_name', type: 'text', required: false, value: value('last_name') });
  fields.push( { label: 'Email', id: 'email', type: 'email', required: true, value: value('email') });
  fields.push( { button: 'Submit', id: 'signup_submit', error: get('error') } );
  return fields;
};

Template.Signup.helpers({
  data_entry() {
    return lib.dataEntryHtml( getFields() );
  },
});

Template.Signup.events({
  'click #edit_lessons'() {
    Session.set('edit_mode',1);
    FlowRouter.go('Edit');
  },
  'click #signup_submit'(){
    let doc = lib.docFromFields( getFields() );
    set('error',doc.error);
    set('doc',doc.doc);
    console.log('jones31',doc);
  },
});
