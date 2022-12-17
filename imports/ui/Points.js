import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'Points_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

let Points = 0;
Template.Points.onCreated(function PointsOnCreated() {
  Points = get('points');
  set('points','');
  refresh('points');
});

const refresh = function(arg){
  const n = sprintf('refresh_%s',arg)
  let v = get(n);
  if ( typeof(v) === 'undefined') v = 0;
  set(n,v+1);
};

const getRefresh = function(arg){
  const n = sprintf('refresh_%s',arg)
  return get(n);
};

Template.Points.helpers({
  points() {
    const dmy = getRefresh('points');
    return Points;
  },
  totalPoints() {
    if ( ! Points ) return;
    $('#points').show();
    const word = 'ding';
    lib.googlePlaySound( word, function(){
      console.log('ding played');
    });

    let originalPos = { left: 490, top: 350 };
    Meteor.setTimeout(function(){
      const pos = $('#student_total_points').position();
      if ( $('#points').length ) originalPos = $('#points').position();
      let left = 750;
      let top = 60;
      if ( pos ) {
        left = pos.left - 63;
        top = pos.top + 44;
      }
      $('#points').animate( { top: sprintf('%spx',top), left: sprintf('%spx',left) }, 2000);
    },200);

    Meteor.setTimeout(function(){
      Session.set('header_points',get('totalPoints'));
    },2000);

    Meteor.setTimeout(function(){
      $('#points').hide();
      $('#points').css('left', sprintf('%spx',originalPos.left));
      $('#points').css('top', sprintf('%spx',originalPos.top));
      set('points','');
    },3000);
    return get('totalPoints');
  },
});

Template.Points.events({
  'click .ins_playing'(e){
    playClicked(e);
  },
});
