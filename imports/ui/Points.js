import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'Points_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Points.onCreated(function PointsOnCreated() {
});

Template.Points.helpers({
  points() { return get('points'); },
  totalPoints() {
    // $('#student_total_points').position();
    $('#points').show();
    const word = 'ding';
    lib.googlePlaySound( word, function(){
      console.log('jones19 ding played');
    });

    let originalPos = { left: 490, top: 350 };
    Meteor.setTimeout(function(){
      const pos = $('#student_total_points').position();
      originalPos = $('#points').position();
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
    },3000);
    return get('totalPoints');
  },
});

Template.Points.events({
  'click .ins_playing'(e){
    playClicked(e);
  },
});
