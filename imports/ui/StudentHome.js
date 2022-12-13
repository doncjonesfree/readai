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
  setd('doc',{});
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
      console.log('Error: StudentHome.js line 55',err);
    } else {
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

const getValue = function(doc,id){
  let v = doc[id];
  if ( ! v ) v = '';
  return v;
};

const studentFields = function(){
  const doc = get('doc');
  let op = [];
  op.push( { label: 'Name', type: 'text', required: true, value: getValue(doc,'name'), id: 'name', message: "you can enter just first name if you like" })
  op.push( { label: 'Year Born', type: 'year', required: true, short: true, value: getValue(doc,'year_of_birth'), id: 'year_of_birth', message: "used to determine starting point for lessons" })
  let checked = '';
  if ( doc.award_points ) checked = 'checked';
  op.push( { label: 'Award Points', checkbox: true, value: checked, id: 'award_points', message: 'Award points for correct answers' })
  const button2 = { button: 'Cancel', cls: 'sh_change_mode button-cancel', data: '2'};
  op.push( { button: 'Save', id: 'student_save', error: get('error'), button2: button2  } );
  return op;
};

Template.StudentHome.helpers({
  mode1() { return get('mode') === 1; },
  mode2() { return get('mode') === 2; },
  mode3() { return get('mode') === 3; },
  mode4() { return get('mode') === 4; },
  supervisor(){
    return lib.getSupervisorValue()
  },
  addingStudent() {
    if ( get('student_id') ) return false;
    return true;
  },
  inactive_count(){
    let list = get('students');
    let count = 0;
    for ( let i=0; i < list.length; i++ ) {
      const l = list[i];
      if ( l.inactive ) count += 1;
    }
    if ( count ) return count;
    return '';
  },
  student() {
    let list = get('students');
    let op = [];
    for ( let i=0; i < list.length; i++ ) {
      const l = list[i];
      if ( ! l.inactive ) op.push(l);
    }
    return op;
  },
  data_entry() {
    return lib.flexEntryHtml( studentFields() );
  },
});

const checkStudentAge = function(doc){
  const s = lib.int( doc.year_of_birth );
  const d1 = moment( sprintf('%4d0701',s),'YYYYMMDD');
  const d2 = lib.currentMoment();
  const age = d2.diff(d1,'years');
  if ( age < 5 ) return 'Student should be at least 5 years old';
  return '';
};

const getStudentGivenId = function(id){
  const students = get('students');
  for ( let i=0; i < students.length; i++ ) {
    const s = students[i];
    if ( s._id === id ) return s;
  }
  return '';
};

Template.StudentHome.events({
  'click #sh_restore_inactive'(e){
    // restore all inactive students
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    Meteor.call('restoreInactiveStudents', lib.getCurrentUser(), function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error: StudentHome.js line 55',err);
      } else {
        set('students',results);
      }
    });
  },
  'click .sh_student'(e){
    // start lesson for student
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    const id = $(e.currentTarget).attr('data');
    lib.setCookie('studentId',id);

    const student = getStudentGivenId(id);
    lib.setCookie('student',student);

    let points = 0;
    if ( student.points ) points = student.points;
    lib.setCookie('studentPoints',points);

    FlowRouter.go('lesson');
  },
  'click .sh_student_progress'(e){
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    const id = $(e.currentTarget).attr('data');
    lib.setCookie('studentId',id);

    const student = getStudentGivenId(id);
    lib.setCookie('student',student);

    let points = 0;
    if ( student.points ) points = student.points;
    lib.setCookie('studentPoints',points);

    FlowRouter.go('progress');
  },
  'click .sh_student_delete'(e){
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    if ( confirm('Confirm: Mark this student "inactive"') ) {
      $(e.currentTarget).html(wait);
      const id = $(e.currentTarget).attr('data');
      const doc = { inactive: true };
      Meteor.call('collectionUpdate', 'Students', id, doc, function(err,results){
        if ( err ) {
          console.log('Error: StudentHome.js line 127',err);
        } else {
          loadStudents('');
          set('mode',2);
        }
      });
    }
  },
  'click .sh_student_edit'(e){
    // edit the selected student
    e.preventDefault();
    e.stopPropagation();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    const id = $(e.currentTarget).attr('data');
    set('student_id',id);
    set('doc', getStudentGivenId(id));
    set('mode',3);
  },
  'click .sh_change_mode'(e){
    e.stopPropagation();
    e.preventDefault();
    const m = lib.int( $(e.currentTarget).attr('data'));
    if ( m === 3 ) {
      // adding a student - clear the student
      set('student_id','');
      set('doc',{});
    }
    set('mode',m);
  },
  'click #student_save'(e){
    e.stopPropagation();
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    let data = lib.docFromFields( studentFields() );
    if ( ! data.error ) data.error = checkStudentAge(data.doc);
    data.doc.user_id = Session.get('currentUser')._id;
    set('doc',data.doc);
    set('error',data.error);
    if ( ! data.error ) {
      const id = get('student_id');
      if ( id ) {
        // updating
        Meteor.call('collectionUpdate', 'Students', id, data.doc, function(err,results){
          if ( err ) {
            console.log('Error: StudentHome.js line 155',err);
          } else {
            loadStudents('');
            set('mode',2);
          }
        });
      } else {
        // new student
        Meteor.call('collectionInsert', 'Students', data.doc, function(err,results){
          if ( err ) {
            console.log('Error: StudentHome.js line 165',err);
          } else {
            loadStudents('');
            set('mode',2);
          }
        });
      }
    }
  },
});
