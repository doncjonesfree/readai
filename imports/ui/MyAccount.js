import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'MyAccount_';
const get = function(n) { return Session.get(pre + n ) };
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.MyAccount.onCreated(function MyAccountOnCreated() {
  // modes
  // 1 =
  // 2 =
  setd('error','');
  set('doc',lib.getCookie('ltrSignin'));
  set('id',get('doc')._id);
});

const getValue = function(doc,id){
  let v = doc[id];
  if ( ! v ) v = '';
  return v;
};

const accountFields = function(){
  const doc = get('doc');
  let op = [];
  op.push( { label: 'First Name *', type: 'text', required: true, value: getValue(doc,'first_name'), id: 'first_name', message: "you can enter just first name if you like" })
  op.push( { label: 'Last Name', type: 'text', required: false, value: getValue(doc,'last_name'), id: 'last_name' })
  op.push( { label: 'Email *', type: 'email', required: true, value: getValue(doc,'email'), id: 'email' })
  op.push( { label: '4 Digit Pin *', type: 'pin', required: true, value: getValue(doc,'pin'), id: 'pin', message: 'Unlocks parent/supervisor options' })
  let verified = 'No';
  if ( doc.verified ) verified = 'Yes';
  op.push( { label: 'Email Verified', just_info: true, value: verified, data: doc.verified, id: 'verified' })
  const button2 = { button: 'Cancel', cls: 'button-cancel', id: 'account_cancel' };
  op.push( { button: 'Save', id: 'account_save', error: get('error'), button2: button2  } );
  return op;
};

Template.MyAccount.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  data_entry() {
    return lib.flexEntryHtml( accountFields() );
  },
});

Template.MyAccount.events({
  'click #account_cancel'(e){
    e.preventDefault();
    FlowRouter.go('home');
  },
  'click #account_save'(e){
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    let data = lib.docFromFields( accountFields() );
    set('doc',data.doc);
    set('error',data.error);
    const id = get('id');
    if ( ! data.error ) {
      // updating
      const prevDoc = lib.getCookie('ltrSignin');
      // If they changed email - verified no longer true
      if ( prevDoc.email !== data.doc.email ) data.doc.verified = false;
      let doc = lib.copy( data.doc );
      doc._id === id;
      lib.setCookie('ltrSignin',doc);

      $(e.currentTarget).html(wait);
      Meteor.call('collectionUpdate', 'Users', id, data.doc, function(err,results){
        $(e.currentTarget).html(html);
        if ( err ) {
          console.log('Error: MyAccount.js line 155',err);
        } else {
          FlowRouter.go('home');
        }
      });
    }
  },
});
