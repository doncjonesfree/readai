import { Students, GatherFacts, GatherFactsAnswers, DrawConclusions, LessonHistory, WordList } from '/imports/db/Collections';
import * as lib from '../imports/api/lib';

export const addPoints = function(students){
  // given a list of students, add "points" to each student record
  const studentList = lib.makeList(students,'_id','');

  const history = LessonHistory.find( { student_id: { $in: studentList }}, { sort: { when: -1 } } ).fetch();
  const words = WordList.find( { student_id: { $in: studentList } }).fetch();

  let obj = {};
  for ( let i=0; i < history.length; i++ ) {
    const h = history[i];
    if ( h.points ) {
      if ( ! obj[ h.student_id ] ) obj[ h.student_id ] = 0;
      obj[ h.student_id ] += h.points;
    }
  }
  for ( let i=0; i < words.length; i++ ) {
    const h = words[i];
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

export const dcSaveLessonHistory = function( lesson, studentId ){
  // Save a drawing conclusion lesson into history
  let retObj = {};
  retObj.lesson = lesson;

  retObj.studentId = studentId;

  const find = { lesson_type: 'dc', Shape: lesson.Shape, Number: lesson.Number, student_id: studentId, grade_level: lesson.GradeLevel};
  retObj.PreviousLessonHistory = LessonHistory.find( find, { sort: { when: -1 }, limit: 1 } ).fetch();

  if ( retObj.PreviousLessonHistory.length > 0 && retObj.PreviousLessonHistory[0].answerCount < 10 ) {
    // We have an additional answer to a dc lesson in progress
    const p = retObj.PreviousLessonHistory[0];
    let doc = {};
    doc.answerCount = p.answerCount + 1;
    doc.qnumList = p.qnumList;
    doc.qnumList.push( lesson.QuestionNum );
    doc.incorrect = p.incorrect;
    if ( lesson.incorrect_count > 0 ) {
      doc.incorrect[ lesson.QuestionNum ] = lesson.incorrect_count;
    }
    doc.pct = calcPct ( doc.answerCount, doc.incorrect );
    doc.when = lib.today();
    LessonHistory.update(p._id, { $set: doc });
    retObj.updated_id = p._id;
    retObj.doc = doc;
  } else {
    let doc = {};
    doc.answerCount = 1;
    doc.grade_level = lesson.GradeLevel;
    doc.qnumList = [ lesson.QuestionNum ];
    doc.pct = 100;
    doc.incorrect = {};
    if ( lesson.incorrect_count > 0 ) {
      doc.incorrect[ lesson.QuestionNum ] = lesson.incorrect_count;
      doc.pct = 0;
    }
    doc.lesson_id = lesson._id;
    doc.lesson_type = 'dc';
    doc.points = lesson.points;
    doc.student_id = studentId;
    doc.Shape = lesson.Shape;
    doc.Number = lesson.Number;
    doc.when = lib.today();

    LessonHistory.insert(doc);

    retObj.doc = doc;
  }

  retObj.LessonHistory = LessonHistory.find({},{ sort: { when: -1 }}).fetch();
  return retObj;
};

export const saveLessonHistory = function( doc ){
  // For GF Lessons only see dcSaveLessonHistory for DC lessons

  // remove all previous lesson history - still debugging
  // const recs = LessonHistory.find().fetch();
  // for ( let i=0; i < recs.length; i++ ) {
  //   const r = recs[i];
  //   LessonHistory.remove(r._id);
  // }

  doc.when = lib.today();
  doc.pct = calcPct ( doc.answerCount, doc.incorrect );
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

const deleteHistory = function( StudentId ){
  // for debugging
  // delete lesson history for the current student
  const history = LessonHistory.find( { student_id: StudentId } ).fetch();
  for ( let i=0; i < history.length; i++ ) {
    const h = history[i];
    LessonHistory.remove(h._id);
  }
};

export const getNextLesson = function( StudentId ){
  // deleteHistory( StudentId );
  const student = Students.findOne( StudentId );
  const history = LessonHistory.find( { student_id: StudentId }, { sort: { when: -1 } }).fetch();

  let retObj = { success: true, history: history, student: student };
  let ret;

  const forceDcLesson = true; // jones - for debugging
  if ( forceDcLesson && history.length > 0 ) {
    ret = getDcLesson( student, history );
    if ( ret ) {
      retObj.lesson_type = 'dc';
      retObj.ret = ret;
      return retObj;
    }
  }

  if ( history.length === 0 ) {
    // get gathering facts lesson
    ret = getFirstLesson( student );
    retObj.lesson_type = 'gf';
  } else if ( history[0].lesson_type === 'gf' || ( history[0].lesson_type === 'dc' && history[0].answerCount < 10 ) ) {
    // get draw conclusions lesson
    ret = getDcLesson( student, history );
    if ( ret ) {
      retObj.lesson_type = 'dc';
    } else {
      ret = getGfLesson( student, history );
      retObj.lesson_type = 'gf';
    }
  } else {
    // get gathering facts lesson
    ret = getGfLesson( student, history );
    retObj.lesson_type = 'gf';
  }
  retObj.ret = ret;
  return retObj;
};

const getGfLesson = function( student, history ){
  // Get next gf lesson
  //
  const gfResults = getLessonResults( 'gf', history );
  const grade = gfResults.average_grade;
  const done = gfResults.done;
  let recs;
  if ( done ) {
    recs = GatherFacts.find({ GradeLevel: { $gte: grade, $lt: grade + 2 }, _id: { $nin: done } }).fetch();
  } else {
    recs = GatherFacts.find({ GradeLevel: { $gte: grade, $lt: grade + 2 } }).fetch();
  }
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

const getDcLesson = function( student, history ){
  // We had at least one gf lesson, now pick a dc lesson
  let recs;
  const mostRecent = LessonHistory.find({ lesson_type: 'dc', student_id: student._id },{ sort: { when: -1 }, limit: 1}).fetch();
  if ( mostRecent.length > 0 && mostRecent[0].answerCount < 10 ) {
    // we haven't asked all questions yet
    const mr = mostRecent[0];
    // first the first missing question
    let QuestionNum = 0;
    for ( let i=1; i <= 10; i++ ) {
      if ( mr.qnumList.indexOf(i) < 0 ) {
        QuestionNum = i;
        break;
      }
    }
    if ( QuestionNum > 0 ) {
      const dc = DrawConclusions.findOne( mr.lesson_id );
      recs = DrawConclusions.find({ GradeLevel: dc.GradeLevel, Shape: dc.Shape, Number: dc.Number, QuestionNum: QuestionNum } ).fetch();
      if ( recs.length > 0 ) return [ recs[0] ]; // should only be one record anyway
    }
  }
  // Not in the middle of a lesson - start a new lesson
  const gfResults = getLessonResults( 'gf', history );
  const dcResults = getLessonResults( 'dc', history );
  let grade;
  let done = '';
  if ( dcResults.count ) {
    grade = dcResults.average_grade;
    done = dcResults.done;
  } else {
    grade = gfResults.average_grade;
  }
  if ( done ) {
    recs = DrawConclusions.find({ GradeLevel: { $gte: grade, $lt: grade + 5 }, QuestionNum: 1, _id: { $nin: done } }, { limit: 2 }).fetch();
  } else {
    recs = DrawConclusions.find({ GradeLevel: { $gte: grade, $lt: grade + 5 }, QuestionNum: 1 }, { limit: 2 }).fetch();
  }
  // if ( s === 'C') return 'Circle';
  // if ( s === 'S') return 'Square';
  // if ( s === 'T') return 'Triangle';
  // if ( s === 'D') return 'Diamond';
  const shapeOrder = 'CSTD';
  recs.sort( function(a,b){
    if ( a.GradeLevel < b.GradeLevel ) return -1;
    if ( a.GradeLevel > b.GradeLevel ) return 1;
    const aShape = shapeOrder.indexOf(a.Shape);
    const bShape = shapeOrder.indexOf(b.Shape);
    if ( aShape < bShape ) return -1;
    if ( aShape > bShape ) return 1;
    if ( a.Number < b.Number ) return -1;
    if ( a.Number > b.Number ) return 1;
    if ( a.QuestionNum < b.QuestionNum ) return -1;
    if ( a.QuestionNum > b.QuestionNum ) return 1;
    return 0;
  });
  if ( recs.length === 0 ) return ''; // should not happen
  const lesson = recs[0];
  // dc lessons start at grade 2.8,  if the student is less than 2.3, then don't
  // do a dc lesson until they have progressed further.
  if ( grade < 2.3 ) return '';
  return DrawConclusions.find({ Shape: lesson.Shape, Number: lesson.Number, GradeLevel: lesson.GradeLevel },{sort: { QuestionNum: 1 } }).fetch();
};

const getLessonResults = function( lesson_type, history ){
  let op = { count: 0, gradeTotal: 0, done: [] };
  for ( let i=0; i < history.length; i++ ) {
    const h = history[i];
    if ( h.lesson_type === lesson_type ) {
      if ( op.count < 5 ) { // look at most recent lessons only
        op.done.push( h._id );
        op.count += 1;
        let grade = h.grade_level;
        if ( h.pct < 30 ) {
          grade = Math.max(0.5, grade - 2 );
        } else if ( h.pct < 60 ) {
          grade = Math.max(0.5, grade - 1 );
        } else if ( h.pct < 80 ) {
          // grade = grade; // leave grade level the same
        } else if ( h.pct < 100 ) {
          // small increase
          grade = Math.min(13, grade + 0.2 );
        } else {
          // 100%
          grade = Math.min(13, grade + 0.5 );
        }
        op.gradeTotal += grade;
      } else {
        break;
      }
    }
  }
  if ( op.count ) op.average_grade = op.gradeTotal / op.count;
  return op;
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
  // Start very easy and progress from there
  if (  age <= 5 ) return 0.5;
  if ( age <= 9 ) return 1;
  if ( age <= 11 ) return 2;
  if ( age <= 13 ) return 3;
  if ( age <= 15 ) return 4;
  return 5;
};
