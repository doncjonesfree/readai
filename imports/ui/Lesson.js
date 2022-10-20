import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'Lesson_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) { Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

let StudentId = '';

Template.Lesson.onCreated(function LessonOnCreated() {
  // modes
  // 1 = load lesson
  // 2 = display gather facts lesson
  // 3 = display draw conclusions lesson
  setd('mode',1);
  StudentId = lib.getCookie('studentId');
  if ( get('mode') === 1 ) {
    Meteor.call('getNextLesson', StudentId, function(err,results){
      if ( err ) {
        console.log('Error: Lesson.js line 19',err);
      } else {
        if ( results.lesson_type === 'gf') {
          Session.set('GFLesson_student',results.student);
          Session.set('GFLesson_name',results.student.name);
          Session.set('GFLesson_lesson',results.ret);
          set('mode',2);
        } else {
          // dc lesson
          let obj = results.ret[0];
          obj.incorrect_count = 0;
          Session.set('DCLesson_lesson',obj);
          set('mode',3);
        }
      }
    });
  }
});

Template.Lesson.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
});

Template.Lesson.events({
  'click .sh_student'(e){
    // start lesson for student
    e.stopPropagation();
    e.preventDefault();
  },
});
