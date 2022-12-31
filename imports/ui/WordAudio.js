import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'WordAudio_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.WordAudio.onCreated(function WordAudioOnCreated() {
  setd('popup',false);
  loadPopup();
});

const loadPopup = function(){
  // Load the popup, get voice input and compare to target word
  let list = [];
  list.push( { msg: 'Say the Word...' } );
  let options = {};
  options.setVariables = [];
  options.setVariables.push ( { name: 'WordAudio_', value: false } );
  const reset = get('session_reset'); // 'master_word_audio'
  options.setVariables.push ( { name: reset, value: false } );

  //options.getVariables = [ { name: 'header_pin', id: '#pin' }];
  const word = get('word');;
  options.title = '';
  options.messages = list;
  options.setResponse = 'WordAudio_response';
  options.buttons = [];
  // options.buttons.push( { label: 'Try Again', value: 1, cls: 'button' });
  // options.buttons.push( { label: 'Cancel', value: 0, cls: 'button button-cancel' });
  Session.set('Message_options',options);
  set('popup',true);

  lib.googlePlaySound( '$say_the_word', function(){
    options.title = word;
    options.messages = [ { msg: lib.redBallHtml() } ];
    Session.set('Message_options',options);

    lib.getAudio( word, function(results){
      console.log('jones37b audio results',results);
      if ( results.match ) {
        options.messages = [];
        options.points = 5;
        options.totalPoints = 100;
        Session.set('Message_options',options);
        lib.googlePlaySound( '$correct', function(){
        });
      } else {
        lib.googlePlaySound( '$try_again', function(){
          lib.getAudio( word, function(results){
            console.log('jones37b audio results',results);
            if ( results.match ) {
              options.messages = [];
              options.points = 5;
              options.totalPoints = 100;
              Session.set('Message_options',options);
              lib.googlePlaySound( '$correct' );
            } else {
              options.messages = [];
              Session.set('Message_options',options);
              console.log('jones55 give up');
              lib.googlePlaySound( '$save_for_later' );
            }
          });
        });
      }
    });
  });
};

Template.WordAudio.helpers({
  mode1() { return get('mode') === 1; },
  popup() { return get('popup'); },
});

Template.WordAudio.events({
  'click .change_mode'(e){
    const m = lib.int( $(e.currentTarget).attr('data') );
    const pre = $(e.currentTarget).attr('data2');
    Session.set( sprintf('%s_mode',pre),m);
  },
});
