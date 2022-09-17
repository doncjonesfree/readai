import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'StudentHome_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.StudentHome.onCreated(function StudentHomeOnCreated() {
  // modes
  // 1 = Load students
  // 2 = Show list of students to choose from
  // 3 = Add a new student
  // 4 = No students - invite them to add a student
  setd('students',[]);
  setd('error','');
  loadStudents( 'setMode' );
});

const loadStudents = function( setMode ){
  let m = 0;
  if ( setMode ) {
    m = get('mode');
    set('mode',1);
  }
  Meteor.call('loadStudents', lib.getCurrentUser(), function(err,results){
    if ( err ) {
      console.log('Error: Signup.js line 55',err);
    } else {
      console.log('jones17',lib.getCurrentUser(),results);
      set('students',results);
      if ( setMode ) {
        if ( m > 1 ) {
          set('mode',m);
        } else {
          if ( results.length > 0 ) {
            set('mode',2);
          } else {
            set('mode',4);
          }
        }
      }
    }
  });
};

const studentFields = function(){
  // left off here
  let op = [];
  op.push( { label: 'Name', type: 'text', required: true, value: '', id: 'name', message: "you can enter just first name if you like" })
  op.push( { label: 'Year Born', type: 'year', required: true, short: true, value: '', id: 'year_of_birth', message: "used to determine starting point for lessons" })
  op.push( { label: 'Award Points', checkbox: true, id: 'award_points', message: 'check if you want to reward this student with points for correct answers' })
  op.push( { button: 'Save', id: 'student_save', error: get('error')  } );
  return op;
};

Template.StudentHome.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  mode4() { return get('mode') === 4; },
  data_entry() {
    const settings = { flexWidth: '100%', longText: '20em', shortText: '3em',
      labelWidth: '10%', valueWidth: '35%', messageWidth: '55%' };
    return lib.dataEntryHtml( studentFields(), settings );
  },
});

Template.StudentHome.events({
  'click .sh_change_mode'(e){
    const m = lib.int( $(e.currentTarget).attr('data'));
    set('mode',m);
  },
  'click #student_save'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    let data = lib.docFromFields( studentFields() );
    set('doc',data.doc);
    set('error',data.error);
    console.log('jones81',data);
  },
});
