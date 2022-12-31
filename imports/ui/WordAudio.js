import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'WordAudio_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.WordAudio.onCreated(function WordAudioOnCreated() {
  setd('popup',false);
  set('pastWords',{});
  loadPopup();
});

const nextWord = function(){
  // get the next word
  let pastWords = get('pastWords');

  let wordList = get('wordList');
  for ( let i=0; i < wordList.length; i++ ) {
    const w = wordList[i];
    if ( ! pastWords[w] ) {
      pastWords[w] = true;
      set('pastWords',pastWords);
      set('currentWord',w);
      return w;
    }
  }
  return w;
};

const wordsLeft = function(){
  // how many words left to process
  let pastWords = get('pastWords');

  let wordList = get('wordList');
  let count = 0;
  for ( let i=0; i < wordList.length; i++ ) {
    const w = wordList[i];
    if ( ! pastWords[w] ) count += 1;
  }
  return count;
};

const loadPopup = function(){
  // Load the popup, get voice input and compare to target word
  const debug = true; // jones
  let list = [];
  list.push( { msg: 'Say the Word...' } );
  let options = {};
  options.setVariables = [];
  options.setVariables.push ( { name: 'WordAudio_', value: false } );
  const reset = get('session_reset'); // 'master_word_audio'
  options.setVariables.push ( { name: reset, value: false } );

  //options.getVariables = [ { name: 'header_pin', id: '#pin' }];
  const word = nextWord();
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
      if ( debug ) {
        options.messages = [ { msg: sprintf('heard: "%s"',results.words) } ];
        Session.set('Message_options',options);
      }
      if ( results.match ) {
        options.messages = [];
        options.points = 5;
        Session.set('Message_options',options);
        testVocabulary( word );
      } else {
        lib.googlePlaySound( '$try_again', function(){
          lib.getAudio( word, function(results){
            if ( debug ) {
              options.messages.push( { msg: sprintf('heard: "%s"',results.words) } );
              Session.set('Message_options',options);
            }
            if ( results.match ) {
              options.messages = [];
              options.points = 5;
              Session.set('Message_options',options);
              testVocabulary( word );
            } else {
              lib.googlePlaySound( '$the_word_is', function(){
                lib.googlePlaySound( word, function(){
                  lib.googlePlaySound( '$save_for_later', function(){
                    testVocabulary( word );
                  });
                });
              });
            }
          });
        });
      }
    });
  });
};

const testVocabulary = function( word ){
  const wordList = get('wordList');
  Meteor.call('testVocabulary',word,wordList,function(err,vocabList){
    if ( err ) {
      console.log('Error: WordAudio.js line 84',err);
    } else {
      // vocabList = [ { word: definition: }]
      console.log('jones86 testVocabulary',vocabList);
      let options = Session.get('Message_options');
      options.messages = [];
      let html = [];
      html.push('<table>');
      for ( let i=0; i < vocabList.length; i++ ) {
        const v = vocabList[i];
        html.push('<tr>');
          html.push('<td>');
            html.push( sprintf('<input type="checkbox" class="ltr_checkbox wa_chk" data="%s">',v.word) ); //
          html.push('</td>');
          html.push('<td>');
            html.push( v.definition );
          html.push('</td>');
        html.push('</tr>');
      }
      html.push('</table>');
      options.messages.push( { msg: html.join('\n') } );
      options.buttons.push( { label: 'Next', value: 1, cls: 'button wa_button' });
      options.buttons.push( { label: 'Close', value: 0, cls: 'button button-cancel wa_button' });
      Session.set('Message_options',options);
      lib.googlePlaySound( '$choose_the_best_definition' );
    }
  });
};

Template.WordAudio.helpers({
  mode1() { return get('mode') === 1; },
  popup() { return get('popup'); },
});

Template.WordAudio.events({
  'click .wa_button'(e){
    const v = lib.int( $(e.currentTarget).attr('data'));
    if ( v && wordsLeft() > 0 ) {
      loadPopup();
    } else {
      set('popup',false);
    }
    console.log('jones121',v);
  },
  'click .wa_chk'(e){
    const word = $(e.currentTarget).attr('data'); // selected word
    const correctWord = get('currentWord');
    $('.wa_chk').each(function(i, obj) {
      const w = $(obj).attr('data');
      if ( w !== word ) $(obj).prop('checked',false);
    });
    if ( word === correctWord ) {
      console.log('jones127 correct');
      lib.googlePlaySound( '$correct' );
    } else {
      lib.googlePlaySound( 'wrong_answer' );
    }
  },
});
