import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'WordAudio_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

let DefWrongCount = 0; // # of wrong definitions
let DefAlreadyAnsweredCorrectly = false; // true if definition already answered correctly

Template.WordAudio.onCreated(function WordAudioOnCreated() {
  setd('popup',false);
  setd('pastWords',{});
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

let AudioSkipped = false;
const loadPopup = function(){
  // Load the popup, get voice input and compare to target word
  const debug = true; // jones
  AudioSkipped = false;
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
  DefWrongCount = 0;
  DefAlreadyAnsweredCorrectly = false;
  set('popup',true);

  const wa_style = 'position: relative; left: 30px; top: -22px;';
  lib.googlePlaySound( '$say_the_word', function(){
    options.title = word;
    let html = [];
    html.push(lib.redBallHtml());
    html.push( sprintf('<a href="#" id="wa_skip" style="%s">skip</a>',wa_style) );
    options.messages = [ { msg: html.join('\n') } ];
    Session.set('Message_options',options);

    lib.getAudio( word, function(results){
      if ( AudioSkipped ) return;
      if ( debug ) {
        if ( results.words ) {
          options.messages = [ { msg: sprintf('heard: "%s"',results.words) } ];
        } else {
          options.messages = [ { msg: 'I heard nothing' } ];
        }
        if ( ! results.match ) {
          let html = [];
          html.push(lib.redBallHtml());
          html.push( sprintf('<a href="#" id="wa_skip" style="%s">skip</a>',wa_style) );
          options.messages.push( { msg: html.join('\n') } );
        }
        Session.set('Message_options',options);
      }
      if ( results.match ) {
        options.messages = [];
        options.points = 5;
        Session.set('Message_options',options);
        lib.addToWordPoints( word, false, options.points );
        lib.saveWord( word, true, 'word' );
        testVocabulary( word );
      } else {
        lib.googlePlaySound( '$try_again', function(){
          lib.getAudio( word, function(results){
            if ( AudioSkipped ) return;
            if ( debug ) {
              if ( results.words ) {
                options.messages = [ { msg: sprintf('heard: "%s"',results.words) } ];
              } else {
                options.messages = [ { msg: 'I heard nothing' } ];
              }
            }
            if ( results.match ) {
              options.messages = [];
              options.points = 5;
              Session.set('Message_options',options);
              lib.addToWordPoints( word, false, options.points );
              lib.saveWord( word, true, 'word' );
              testVocabulary( word );
            } else {
              lib.googlePlaySound( '$the_word_is', function(){
                lib.googlePlaySound( word, function(){
                  lib.saveWord( word, false, 'word' );
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
  'click #wa_skip'(e){
    // audio input may not be working - move on to vocabulary for the word
    AudioSkipped = true;
    let options = Session.get('Message_options');
    options.messages = [];
    Session.set('Message_options',options);
    testVocabulary( options.title );
  },
  'click .wa_button'(e){
    const v = lib.int( $(e.currentTarget).attr('data'));
    if ( v && lib.wordsLeft() > 0 ) {
      loadPopup();
    } else {
      set('popup',false);
      let t = Session.get('DCLesson_wordAudio');
      if ( t ) Session.set('DCLesson_wordAudio',false);
      t = Session.get('GFLesson_wordAudio');
      if ( t ) Session.set('GFLesson_wordAudio',false);
    }
  },
  'click .wa_chk'(e){
    const correctWord = get('currentWord');
    if ( DefAlreadyAnsweredCorrectly ) {
      $('.wa_chk').each(function(i, obj) {
        const w = $(obj).attr('data');
        if ( w === correctWord ) {
          $(obj).prop('checked',true);
        } else {
          $(obj).prop('checked',false);
        }
      });
      return;
    }
    const word = $(e.currentTarget).attr('data'); // selected word
    $('.wa_chk').each(function(i, obj) {
      const w = $(obj).attr('data');
      if ( w !== word ) $(obj).prop('checked',false);
    });
    if ( word === correctWord ) {
      DefAlreadyAnsweredCorrectly = true;
      let options = Session.get('Message_options');
      if ( DefWrongCount === 0 ) {
        options.points = 0;
        Session.set('Message_options',options);
      }
      lib.googlePlaySound( '$correct', function(){
        if ( DefWrongCount === 0 ) {
          options.points = 5;
          Session.set('Message_options',options);
          lib.addToWordPoints( word, true, options.points );
          lib.saveWord( word, true, 'def' );
        }
      });
    } else {
      DefWrongCount += 1;
      const options = Session.get('Message_options');
      lib.saveWord( options.title, false, 'def' );
      lib.googlePlaySound( '$sorry' );
    }
  },
});
