import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'home_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Home.onCreated(function HomeOnCreated() {
  // modes
  // 1: Show list of options
  // 2: List / Edit users
  setd('mode',1);
});

Template.Home.helpers({
  masterUser() {
    const u = lib.getCurrentUser();
    if ( u && u.masterUser ) return true;
    return false;
  },
  showMessage(){ return get('showMessage'); },
  popupResponse(){ return get('popupResponse'); },
  signedIn(){
    const u = lib.getCurrentUser();
    if ( u && ! u.masterUser ) return true;
    return false;
  },
  notSignedIn(){
    const u = lib.getCurrentUser();
    if ( u ) return false;
    return true;
  },
  mode1() { return get('mode') === 1 },
  mode2() { return get('mode') === 2 },
  mode3() { return get('mode') === 3 },
  users() {
    let op = get('users');
    if ( ! op ) return '';
    for ( let i=0; i < op.length; i++ ) {
      let o = op[i];
      if ( i % 2 === 1 ) o.cls = 'rpt_highlight';
      if ( o.inactive ) o.last_name = sprintf('%s (inactive)',o.last_name);
    }
    return op;
  },
});

const message = function( youngOld ){
  let msg;
  let html = [];
  html.push('<div class="paragraph">');
  if ( youngOld === 'old') {
    /*
    Regardless of age or current reading ability our program can quickly improve your skills.
    We use artificial intelligence and speech recognition to teach words and concepts
    that you may not know.  You are also awarded points for your effort.  You can use the points
    to motivate yourself and give yourself rewards for hitting milestones.  Progress is automatically
    measured and tracked so you can see your progress.
    */
    // AI Version
    msg = "Our reading program is tailored to meet the needs of adults, regardless of their current reading level. With the help of AI and speech recognition technology, you will quickly learn new words and concepts. Progress is tracked automatically, allowing you to monitor your progress and set goals for yourself. To motivate you to continue your journey, you will be rewarded with points for your effort, that can be used for rewards or milestones you set for yourself.";
  } else {
    // from ChatGPT
    msg = "Our reading program empowers children to take charge of their own learning by providing a self-directed learning experience. Points are awarded for effort, which can be used as a motivational tool by parents - whether it be through toys, privileges, money or other rewards. Additionally, parents can monitor progress and review lessons through our website";
    // html.push( 'This website is designed you allow your child');
    // html.push( 'to work independently, to teach themselves to read');
    // html.push( 'with minimum oversight.');
    // html.push( '<br>');
    // html.push( 'Your child will be rewarded with points for their effort.');
    // html.push( "It's important to reward your child by using points");
    // html.push( 'as a motivator.  The reward could be a toy, a privilege, money');
    // html.push( 'or anything else you deem appropriate.');
    // html.push( '<br>');
    // html.push( 'You can also review the lessons and track progress.');
  }
  html.push(msg);
  html.push('</div>');
  return [ { msg: html.join('\n') } ];
};

const reformat = function(txt){
  const list = txt.split('\n');
  let op = [];
  let p = '';
  for ( let i=0; i < list.length; i++ ) {
    const l = list[i].trim();
    if ( l ) {
      if ( p ) {
        p += ' ' + l;
      } else {
        p = l;
      }
    } else if ( p ) {
      op.push(p);
      p = '';
    }
  }
  if ( p ) op.push(p);
  return op;
};

const popupAboutUs = function(){
  const txt = `
    In the early 1950's my father started teaching some of his fifth grade students to read.  These students
    could not read the fifth grade text books.  Eventually that turned into a business teaching children to read
    for over 50 years.  In 2003 my son and I took over the business and ran it for 10 years.

    Over the years many innovative methods were developed and tested.  We have attempted to capture the essence
    of the methods that were proven successful over many years and incorporate them into this website.

    We have also included some new techniques in artificial intellegence to help this site to enable the student
    to teach him / herself rather that requiring a one-to-one teacher as my father did.

    Don Jones
    `;
  let msg = reformat(txt);
  let list = [];
  for ( let i=0; i <  msg.length; i++ ) {
    list.push( { msg: msg[i] } );
  }
  let options = {};
  options.setVariables = [ { name: 'home_showMessage', value: false } ];
  options.getVariables = [];
  options.title = 'About Us';
  options.messages = list;
  options.setResponse = 'home_popupResponse';
  options.buttons = [];
  options.buttons.push( { label: 'Close', value: 1, cls: 'button' });
  Session.set('Message_options',options);
  set('showMessage',true);
};

const popupMaterial = function(){
  let msg = [];
  msg.push('Sorry, Bonus Material coming soon!');
  let list = [ { msg: msg.join('\n') } ];
  let options = {};
  options.setVariables = [ { name: 'home_showMessage', value: false } ];
  options.getVariables = [];
  options.title = 'Bonus Material';
  options.messages = list;
  options.setResponse = 'home_popupResponse';
  options.buttons = [];
  options.buttons.push( { label: 'Close', value: 1, cls: 'button' });
  Session.set('Message_options',options);
  set('showMessage',true);
};

const popup = function(youngOld){
  let list = message( youngOld );
  let options = {};
  options.setVariables = [ { name: 'home_showMessage', value: false } ];
  options.getVariables = [];
  options.title = 'Young Readers';
  if ( youngOld === 'old') options.title = 'Older Readers';
  options.messages = list;
  options.setResponse = 'home_popupResponse';
  options.buttons = [];
  options.buttons.push( { label: 'Close', value: 1, cls: 'button' });
  Session.set('Message_options',options);
  set('showMessage',true);
};

Template.Home.events({
  'click #about_us'(e){
    popupAboutUs();
  },
  'click #read_more_young'(e){
    popup('young');
  },
  'click #read_more_old'(e){
    popup('old');
  },
  'click #read_more_material'(e){
    popupMaterial();
  },
  'click .change_mode'(e) {
    const m = lib.int( $(e.currentTarget).attr('data'));
    set('mode',m);
  },
});
