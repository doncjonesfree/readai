import { Students, GatherFacts, GatherFactsAnswers, DrawConclusions, LessonHistory } from '/imports/db/Collections';
import * as lib from '../imports/api/lib';

export const addPoints = function(students){
  // given a list of students, add "points" to each student record
  const studentList = lib.makeList(students,'_id','');
  const history = LessonHistory.find( { student_id: { $in: studentList }}).fetch();
  let obj = {};
  for ( let i=0; i < history.length; i++ ) {
    const h = history[i];
    console.log('jones11',i,h);
    if ( h.points ) {
      if ( ! obj[ h.student_id ] ) obj[ h.student_id ] = 0;
      obj[ h.student_id ] += h.points;
    }
  }
  for ( let i=0; i < students.length; i++ ) {
    let s = students[i];
    if ( obj[ s._id ] ) {
      s.points = obj[ s._id ];
    } else {
      s.points = 0;
    }
  }
};

export const saveLessonHistory = function( lesson_type, answerCount, incorrect, lesson_id, points, student_id ){

  // remove all previous lesson history - still debugging
  // const recs = LessonHistory.find().fetch();
  // for ( let i=0; i < recs.length; i++ ) {
  //   const r = recs[i];
  //   LessonHistory.remove(r._id);
  // }

  let doc = { answerCount: answerCount, incorrect: incorrect, lesson_type: lesson_type, lesson_id: lesson_id, points: points, student_id: student_id};
  doc.when = lib.today();
  doc.pct = calcPct ( answerCount, incorrect );
  const id = LessonHistory.insert(doc);
  return { id: id, doc: doc };
};

const calcPct  = function( answerCount, incorrect ){
  let errors = 0; // # of incorrect answers
  for ( let key in incorrect ) {
    if ( lib.hasOwnProperty(incorrect,key)) {
      const v = incorrect[key];
      if ( v ) errors += 1;
    }
  }
  if ( answerCount > 0 ) return ( (answerCount - errors ) / answerCount ) * 100;
  return 0;
};

export const getNextLesson = function( StudentId ){
  const student = Students.findOne( StudentId );
  const history = LessonHistory.find( { student_id: StudentId }, { sort: { when: -1 }}).fetch();

  let retObj = { success: true, history: history, student: student };

  let ret;
  if ( history.length === 0 || true ) { // jones - force gf for now
    // get gathering facts lesson
    ret = getFirstLesson( student );
    retObj.lesson_type = 'gf';
  } else if ( history[0].lesson_type === 'gf') {
    // get draw conclusions lesson
    ret = getDcLesson( student );
    retObj.lesson_type = 'dc';
  } else {
    // get gathering facts lesson
    ret = getGfLesson( student );
    retObj.lesson_type = 'gf';
  }
  retObj.ret = ret;
  return retObj;
};

const getFirstLesson = function( student ){
  // get first gathering facts lesson based on age of the student
  const year = lib.int( lib.today().substr(0,4));
  const age = year - lib.int( student.year_of_birth );
  const grade = initialGradeLevel( age );
  //const recs = GatherFacts.find({ GradeLevel: { $ge: grade } }, { sort: { GradeLevel: 1 }, { limit: 1 } }).fetch();
  const recs = GatherFacts.find({ GradeLevel: { $gte: grade, $lt: grade + 2 } }).fetch();
  recs.sort( function(a,b){
    if ( a.GradeLevel < b.GradeLevel ) return -1;
    if ( a.GradeLevel > b.GradeLevel ) return 1;
    if ( a.Code < b.Code ) return -1;
    if ( a.Code > b.Code ) return 1;
    if ( a.Number < b.Number ) return -1;
    if ( a.Number > b.Number ) return 1;
    return 0;
  });
  const lesson = recs[0];
  const answers = GatherFactsAnswers.find({ LessonNum: lesson.LessonNum}).fetch();
  return { answers: answers, lesson: lesson };
};

const initialGradeLevel = function( age ){
  // estimate initial grade level based on student's age
  if (  age <= 5 ) return 0.5;
  if ( age === 6 || age === 7 ) return 1;
  if ( age === 8 || age === 9 ) return 2;
  if ( age === 10 || age === 11 ) return 3;
  if ( age === 12 || age === 13 ) return 5;
  if ( age === 14 || age === 15 ) return 7;
  return 8;
};
