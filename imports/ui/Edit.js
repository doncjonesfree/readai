import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'edit_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Edit.onCreated(function EditOnCreated() {
  setd('mode',1);
  setd('gf_search',{});
  setd('gatherfacts',{ GatherFacts: [] });
});

Template.Edit.helpers({
  mode0() { return get('mode') === 0 },
  mode1() { return get('mode') === 1 },
  mode2() { return get('mode') === 2 },
  gf_search() { return get('gf_search')},
  edit_gf_lesson(){

    const inputHtml = function(obj, field){
      return sprintf('<input type="text" class="edit_gf_text" value="%s" data="%s">',obj[field],field);
    };

    const questionHtml = function(obj,msg,field){
      return sprintf('%s <input type="hidden" class="edit_gf_text" value="%s" data="%s">',msg,obj[field],field);
    };

    let op = get('edit_gf_lesson');
    if ( ! op ) return;
    op.answers.sort( function(a,b){
      if ( a.QuestionNum < b.QuestionNum ) return -1;
      if ( a.QuestionNum > b.QuestionNum ) return 1;
      return 0;
    });
    op.list = [];
    for ( let i=0; i < op.answers.length; i++ ) {
      const a = op.answers[i];
      let msg = '';
      if ( a.QuestionNum < 2 ) {
        msg = sprintf('%s ( LessonNum %s)',a.QuestionNum,a.LessonNum);
      } else {
        msg = a.QuestionNum;
      }
      op.list.push( { label: 'Question #', html: questionHtml(a,msg,'QuestionNum') } );
      op.list.push( { label: 'Question', html: inputHtml(a,'Question') } );
      for ( let i2=1; i2 < 1000; i2++ ) {
        const n = sprintf('Answer%s',i2);
        const v = a[n];
        if ( v ) {
          op.list.push( { label: n, html: inputHtml(a,n) } );
        } else {
          break;
        }
      }
      op.list.push( { label: 'Correct', html: inputHtml(a,'Correct') } );
    }
    return op;
  },
  gatherfacts() {
    const gatherfacts = get('gatherfacts');
    gatherfacts.GatherFacts.sort( function(a,b){
      if ( a.Code < b.Code ) return -1;
      if ( a.Code > b.Code ) return 1;
      if ( a.GradeLevel < b.GradeLevel ) return -1;
      if ( a.GradeLevel > b.GradeLevel ) return 1;
      if ( a.Color.toLowerCase() < b.Color.toLowerCase() ) return -1;
      if ( a.Color.toLowerCase() > b.Color.toLowerCase() ) return 1;
      if ( a.Number < b.Number ) return -1;
      if ( a.Number > b.Number ) return 1;
      return 0;
    });

    for ( let i=0; i < gatherfacts.GatherFacts.length; i++ ) {
      let g = gatherfacts.GatherFacts[i];
      if ( i % 2 === 1 ) g.cls = 'rpt_highlight';
    }

    return gatherfacts.GatherFacts;
  },
});

const checkError = function(arg,type){
  // type = integer, float or text
  let error = false;
  let v = arg;
  if ( type === 'integer') {
    if ( lib.verifyInteger(v) ) {
      v = lib.int(v);
    } else {
      error = true;
    }
  } else if ( type === 'float') {
    if ( lib.verifyFloat(v) ) {
      v = lib.float(v);
    } else {
      error = true;
    }
  }
  return { error: error, value: v };
};

const searchGatherFacts = function(e){
  const wait = '...';
  const html = $(e.currentTarget).html();
  if ( wait === html ) return;
  let doc = {}; // data values
  let src = {}; // what to search for
  let msg = '';
  $('.gf_src').each(function(i, obj) {
    const field = $(obj).attr('data');
    const type = $(obj).attr('data2');
    let v = $(obj).val().trim();
    if ( ! msg && v ) {
      const ret = checkError(v,type);
      if ( ret.error ) {
        msg = sprintf('Invalid "%s"',field);
      } else {
        src[field] = ret.value;
        doc[field] = ret.value;
        if ( field === 'GradeLevel') {
          const v = lib.int( ret.value );
          src[field] = { $gte: v, $lt: v+1 };
        } else if ( type === 'text' ) {
          src[field] = { $regex: new RegExp( ret.value,'i' ) };
        }
      }
    }
  });
  doc.error = msg;
  set('gf_search',doc);
  if ( ! msg ) {
    $(e.currentTarget).html(wait);
    Meteor.call('loadGatherFacts', src, function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error: Edit.js line 37',err);
        doc.error = 'Server Error!';
        set('gf_search',doc);
        set('gatherfacts',{ GatherFacts: [] });
      } else if ( results.GatherFacts.length === 0 ) {
        doc.error = 'No lessons found';
        set('gf_search',doc);
        set('gatherfacts',{ GatherFacts: [] });
      } else {
        set('gatherfacts',results);
        jones(results);
      }
    });
  }
};

const jones = function(obj){
  // see if queer comes up again -
  let count = 0;
  for ( let i=0; i < obj.GatherFacts.length; i++ ) {
    const gf = obj.GatherFacts[i];
    let p = gf.Paragraph;
    if ( p ) {
      if ( p.toLowerCase().indexOf('queer') >= 0 ) {
        count += 1;
      }
    }
  }
  console.log('jones162b queer count',count);
};

const getGfLessonGivenId = function(id){
  let list = get('gatherfacts').GatherFacts;
  let ret = {};
  for ( let i=0; i < list.length; i++ ) {
    const g = list[i];
    if ( g._id === id ) {
      ret.lesson = g;
      break;
    }
  }
  if ( ret.lesson ) {
    const LessonNum = ret.lesson.LessonNum
    ret.answers = [];
    list = get('gatherfacts').GatherFactsAnswers;
    for ( let i=0; i < list.length; i++ ) {
      const g = list[i];
      if ( g.LessonNum === LessonNum ) {
        ret.answers.push(g);
      }
    }
  }
  return ret;
};

const getGfLessonGivenKey = function(key){
  const sKey = key.split('_');
  const Code = sKey[0];
  const Color = sKey[1];
  const LessonNum = lib.int(sKey[2]);
  const Number = lib.int(sKey[3]);
  let list = get('gatherfacts').GatherFacts;
  let ret = {};
  for ( let i=0; i < list.length; i++ ) {
    const g = list[i];
    if ( g.Code == Code && g.Color === Color && g.LessonNum === LessonNum && g.Number === Number ) {
      ret.lesson = g;
      break;
    }
  }
  if ( ret.lesson ) {
    ret.answers = [];
    list = get('gatherfacts').GatherFactsAnswers;
    for ( let i=0; i < list.length; i++ ) {
      const g = list[i];
      if ( g.LessonNum === LessonNum ) {
        ret.answers.push(g);
      }
    }
  }
  return ret;
};

const gfSave = function(e,html){
  // $('#gf_popup').hide();

  const match = function(a1,a2){
    // return { _id: doc: } if changes found
    const id = a1._id;
    let doc = {};
    let count = 0;
    for ( let key in a1 ) {
      if ( lib.hasOwnProperty(a1,key) ) {
        const v1 = a1[key];
        const v2 = a2[key];
        if ( v1 !== v2 ) {
          doc[key] = v2;
          count += 1;
        }
      }
    }
    if ( count > 0 ) return { doc: doc, id: id };
    return '';
  };

  let edit_gf_lesson = get('edit_gf_lesson');
  const savedLesson = lib.copy(edit_gf_lesson);
  edit_gf_lesson.lesson.Paragraph = $('#edit_paragraph').val();
  let doc = [];
  $('.edit_gf_text').each(function(i, obj) {
    const data = $(obj).attr('data');
    let v = $(obj).val();
    if ( lib.verifyInteger(v) ) v = lib.int(v);
    doc.push( { data: data, v: v } );
  });
  let ix = -1;
  for ( let i=0; i < doc.length; i++ ) {
    const d = doc[i];
    if ( d.data === 'QuestionNum') ix = d.v - 1;
    if ( ix >= 0 ) {
      edit_gf_lesson.answers[ix][ d.data ] = d.v;
    }
  }

  // see which parts changed.
  let changes = [];
  if ( edit_gf_lesson.lesson.changed ) {
    const id = edit_gf_lesson.lesson._id;
    const doc = { Paragraph: edit_gf_lesson.lesson.Paragraph };
    changes.push( { id: id, doc: doc, collection: 'GatherFacts' });
  }

  // see if answers changed
  for ( let i=0; i < edit_gf_lesson.answers.length; i++ ) {
    const a1 = savedLesson.answers[i];
    const a2 = edit_gf_lesson.answers[i];
    const ret = match(a1,a2);
    if ( ret ) {
      changes.push( { id: ret.id, doc: ret.doc, collection: 'GatherFactsAnswers' });
    }
  }
  if ( changes.length > 0 ) {
    updateGatherFacts( changes );
    Meteor.call('updateCollection', changes , function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error in Edit.js line 245',err);
      }
    });
  }

  $(e.currentTarget).html(html);
  $('#gf_popup').hide();
};

const updateGatherFacts = function( changes ){
  // change our local copy of gathering facts answers
  let edit_gf_lesson = get('edit_gf_lesson');
  let gatherfacts = get('gatherfacts');
  let list = gatherfacts.GatherFactsAnswers;
  let lessons = gatherfacts.GatherFacts;

  let answers = [];
  for ( let i=0; i < list.length; i++ ) {
    const g = list[i];
    if ( g.LessonNum === edit_gf_lesson.lesson.LessonNum ) {
      answers.push( { ix: i, rec: g } );
    }
  }

  if ( answers.length > 0 ) {
    for ( let i2=0; i2 < changes.length; i2++ ) {
      const c = changes[i2];
      if ( c.collection === 'GatherFactsAnswers') {
        for ( let key in c.doc ) {
          if ( lib.hasOwnProperty(c.doc,key)) {
            const v = c.doc[key];
            for ( let i=0; i < answers.length; i++ ) {
              const a = answers[i];
              if ( a.rec._id === c.id ) {
                list[ a.ix ][key] = v;
              }
            }
          }
        }
      } else {
        // we have a lesson paragraph change
        for ( let i=0; i < lessons.length; i++ ) {
          const lesson = lessons[i];
          if ( lesson.LessonNum === edit_gf_lesson.lesson.LessonNum  ) {
            lesson.Paragraph = c.doc.Paragraph;
          }
        }
      }
    }
  }
  set('gatherfacts',gatherfacts);
};

Template.Edit.events({
  'click #gf_save': function(e){
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    gfSave(e,html);
  },
  'click #popup_close'(e){
    const id = sprintf('#%s',$(e.currentTarget).attr('data'));
    $(id).hide();
  },
  'change #edit_paragraph'(e){
    let edit_gf_lesson = get('edit_gf_lesson');
    edit_gf_lesson.lesson.Paragraph = $('#edit_paragraph').val();
    edit_gf_lesson.lesson.changed = true;
    set('edit_gf_lesson',edit_gf_lesson);
  },
  'click #gf_edit_from_popup'(e){
    e.preventDefault();
    const lesson = Session.get('GFLesson_lesson');
    const id = lesson.lesson._id;
    const ret = getGfLessonGivenId(id);
    if ( ret.lesson && ret.answers ) {
      set('edit_gf_lesson',ret);
      $('#gf_lesson_popup').hide();
      $('#gf_popup').show();
      lib.playAudioFile('Buckeye');
    }
  },
  'click .gf_edit'(e){
    e.preventDefault();
    const key = $(e.currentTarget).attr('data');
    const ret = getGfLessonGivenKey(key);
    if ( ret.lesson && ret.answers ) {
      set('edit_gf_lesson',ret);
      $('#gf_popup').show();
    }
  },
  'click .gf_lesson'(e){
    e.preventDefault();
    const id = $(e.currentTarget).attr('data');
    const ret = getGfLessonGivenId(id);
    if ( ret.lesson && ret.answers ) {
      // set up for other template
      Session.set('GFLesson_lesson',ret);
      $('#gf_lesson_popup').show();
    }
  },
  'click #gf_search'(e){
    e.preventDefault();
    searchGatherFacts(e);
  },
  'keydown .gf_src'(e){
    if ( e.which === 13 ) {
      e.preventDefault();
      Meteor.setTimeout(function(){
        searchGatherFacts(e);
      },200);
    }
  },
  'click #home'() {
    FlowRouter.go('home'); //
  },
  'click #change_mode'(e) {
    const m = lib.int( $(e.currentTarget).attr('data'));
    set('mode',m);
  },
  'click #edit_gather_facts'(e){
    set('mode',2);
    lib.focus('#gs_start');
  },
});
