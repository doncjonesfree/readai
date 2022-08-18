import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'edit_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

let allWords = [];

Template.Edit.onCreated(function EditOnCreated() {
  // mode:
  // 1 = just show Gather Facts Button and Draw conclusion buttons
  // 2 = search for given gather facts lesson
  // 3 = test each word in audio
  // 4 = search for draw conclusions lesson
  setd('mode',1);
  setd('gf_search',{});
  setd('gatherfacts',{ GatherFacts: [] });
});

const refresh = function(arg){
  const n = sprintf('refresh_%s',arg);
  let v = get(n);
  if ( typeof(v) === 'undefined') v = 0;
  set(n,v+1);
};

const getRefresh = function(arg){
  const n = sprintf('refresh_%s',arg);
  return get(n);
};

const shapeName = function( Shape ){
  if ( Shape === 'C') return 'Circle';
  if ( Shape === 'D') return 'Diamond';
  if ( Shape === 'S') return 'Square';
  if ( Shape === 'T') return 'Triangle';
  return Shape;
};

Template.Edit.helpers({
  mode0() { return get('mode') === 0 },
  mode1() { return get('mode') === 1 },
  mode2() { return get('mode') === 2 },
  mode3() { return get('mode') === 3 },
  mode4() { return get('mode') === 4 },
  edit_dc_lesson: function(){
    const shapeName = function(s){
      if ( s === 'C') return 'Circle';
      if ( s === 'S') return 'Square';
      if ( s === 'D') return 'Diamond';
      if ( s === 'T') return 'Triangle';
      return s;
    };

    let html;

    let edit_dc_lesson = get('edit_dc_lesson');
    if ( ! edit_dc_lesson ) return '';
    let list = [];
    const lesson = sprintf('%s #%s Question %s', shapeName(edit_dc_lesson.Shape),edit_dc_lesson.Number,edit_dc_lesson.QuestionNum);
    list.push( { label: 'Lesson', name: '', value: lesson });
    html = [];
    html.push( sprintf('<textarea class="dc_textarea dc_data" data="%s">%s</textarea>','Question',edit_dc_lesson.Question))
    list.push( { label: 'Question', name: 'Question', html: html.join('\n') });
    for ( let i=1; i <= 4; i++ ) {
      const n = sprintf('Answer%s',i);
      html = [];
      html.push( sprintf('<input type="text" class="dc_text dc_data" data="%s" value="%s">',n,edit_dc_lesson[n]))
      list.push( { label: sprintf('Answer %s',i) , name: n, html: html.join('\n') });
    }
    html = [];
    html.push( sprintf('<input type="text" class="dc_text_short dc_data" data="%s" value="%s">','Correct',edit_dc_lesson.Correct))
    list.push( { label: 'Correct', name: 'Correct', html: html.join('\n') });
    list.push( { label: 'Grade Level', name: 'GradeLevel', value: edit_dc_lesson.GradeLevel });
    return list;
  },
  dc_search(){
    let dc_search = get('dc_search');
    if ( ! dc_search ) return '';
    if ( ! dc_search.GradeLevel ) dc_search.GradeLevel = [];
    if ( ! dc_search.list ) dc_search.list = [];
    if ( dc_search.list && dc_search.list.length > 0 ) {
      for ( let i=0; i < dc_search.list.length; i++ ) {
        let s = dc_search.list[i];
        s.shapeName = shapeName( s.Shape );
        if ( i % 2 === 1 ) s.cls = 'rpt_highlight';
      }
    }
    return dc_search;
  },
  testWord(){
    const dmy = getRefresh('testWord');
    let obj = {};
    let testWord = get('testWord');
    obj.ix = testWord.ix;
    obj.ok_count = '';
    if ( testWord.ok_count ) obj.ok_count = testWord.ok_count;
    if ( ! allWords || allWords.length === 0 ) {
      loadAllWords( function(){
        refresh('testWord');
      });
      obj.word = 'loading...';
    } else if ( allWords[ obj.ix ] ){
      obj.word = allWords[ obj.ix ].word;
      obj.google_ok = false;
      if ( allWords[ obj.ix ].google_ok ) obj.google_ok = true;
    } else {
      obj.word = 'Error...';
    }
    obj.message = sprintf('%s of %s',obj.ix,allWords.length);
    if ( allWords[ obj.ix ] && allWords[ obj.ix ].gf_id ) {
      const lesson = getGfLessonGivenId(allWords[ obj.ix ].gf_id);
      if ( lesson && lesson.lesson ) {
        const l = lesson.lesson;
        obj.message = sprintf('%s %s %s %s',obj.message,l.Code,l.Color,l.Number);
      }
    }
    return obj;
  },
  local() {
    return Meteor.isDevelopment;
  },
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
    const gatherfacts = loadGatherFacts();

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

const searchDrawConclusions = function(e, GradeLevel ){
  const wait = '...';
  const html = $(e.currentTarget).html();
  if ( wait === html ) return;
  $(e.currentTarget).html(wait);
  let dc_search = get('dc_search');
  if ( ! dc_search ) dc_search = {};
  dc_search.src = GradeLevel;
  Meteor.call('loadDrawConclusions', GradeLevel, function(err,results){
    $(e.currentTarget).html(html);
    if ( err ) {
      console.log('Error: Edit.js line 161',err);
      dc_search.error = 'Server Error!';
      set('dc_search',dc_search);
    } else {
      dc_search.list = results;
      set('dc_search',dc_search);
    }
  });
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
        queerTest(results);
      }
    });
  }
};

const queerTest = function(obj){
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
  console.log('queer count',count);
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

const loadGatherFacts = function(){
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
  return gatherfacts;
};

const saveAllWordsTemp = function( specialWord ){
  // run through current lessons and save all unique words in a file
  // only run this once, then the allWords.txt file is saved
  // If specialWord is specified we are just looking for where this word is located
  const gatherfacts = loadGatherFacts();
  let words = {};
  let wordCount = 0;
  let currentLesson = '';
  let specialList = [];

  const addToWords = function(list,gf){
    for ( let i=0; i < list.length; i++ ) {
      const w = list[i];
      if ( specialWord ) {
        if ( w === specialWord ) {
          specialList.push(gf);
        }
      }

      if ( ! words[w] ) {
        words[w] = { word: w, gf_id: gf._id }; // saves first id of gather facts that has this word
        wordCount += 1;
      }
    }
  };

  for ( let i=0; i < gatherfacts.GatherFacts.length; i++ ) {
    const gf = gatherfacts.GatherFacts[i];
    currentLesson = gf;
    const p1 = gf.Paragraph;
    addToWords( lib.listWordsFromGFParagraph(p1), gf );
    for ( let i2=0; i2 < gatherfacts.GatherFactsAnswers.length; i2++ ) {
      const a = gatherfacts.GatherFactsAnswers[i2];
      if ( a.LessonNum === gf.LessonNum ) {
        for ( let answer=1; answer < 1000; answer++ ) {
          const k = sprintf('Answer%s',answer);
          if ( typeof(a[k]) === 'undefined') break;
          let v = a[k];
          if ( typeof(v) === 'string') v = v.trim();
          if ( v ) {
            addToWords( lib.listWordsFromGFParagraph(v), gf );
          }
        }
        addToWords( lib.listWordsFromGFParagraph(a.Question), gf );
      }
    }
  }
  if ( specialWord ) {
    return specialList;
  } else {
    loadAllWords(function(){
      // Update allWords with any changes
      let newWords = []; // new list of all words
      for ( let i=0; i < allWords.length; i++ ) {
        let o = allWords[i];
        if ( words[ o.word ] ) {
          newWords.push(o);
          words[ o.word ].found = true;
        }
      }
      for ( let w in words ){
        if ( lib.hasOwnProperty(words,w)) {
          if ( ! words[w].found ) {
            console.log('New Word Added:',words[w]);
            newWords.push( words[w] );
          }
        }
      }
      allWords = newWords;
      saveAllWordsFile(function(){
        console.log('allWords file saved %s words.',allWords.length);
      });
    });
  }
};

const testSounds = function(){
  loadAllGatherFacts( function(){
    loadAllWords( function(){
      setd('testWord', { ix: 0 } ); // ix of current word
      set('mode',3);
    });
  });
};

const loadAllWords = function(callback){
  Meteor.call('getFile', 'allWords.txt', function(err,results){
    if ( err ) {
      console.log('Error: Edit.js line 438',err);
    } else {
      allWords = results;
      allWords.sort( function(a,b){
        if ( a.word < b.word ) return -1;
        if ( a.word > b.word ) return 1;
        return 0;
      });
      callback();
    }
  });
};

const saveAllWordsFile = function( callback ){
  const tmp = JSON.stringify(allWords);
  Meteor.call('saveFile', 'allWords.txt',tmp, function(err,results){
    if ( err ) {
      console.log('Error: Edit.js line 461',err);
    }
    console.log('saveAllWordsFile, %s words',allWords.length);
    if ( callback ) callback();
  });
};

const loadAllGatherFacts = function( callback ){
  let src = {};
  Meteor.call('loadGatherFacts', src, function(err,results){
    if ( err ) {
      console.log('Error: Edit.js line 508',err);
    } else if ( results.GatherFacts.length === 0 ) {
      console.log('Error: Edit.js line 510','No records found');
    } else {
      set('gatherfacts',results);
      callback();
    }
  });
};

const getDcLessonGivenId = function(id){
  const dc_search = get('dc_search');
  for ( let i=0; i < dc_search.list.length; i++ ) {
    const s = dc_search.list[i];
    if ( s._id === id ) return s;
  }
  return '';
};

let WordPlayBackBusy = 0;
let PreviousWordPlayed = '';

Template.Edit.events({
  'click #dc_save'(e){
    e.preventDefault();
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( html === wait ) return;
    let edit_dc_lesson = get('edit_dc_lesson');
    let doc = {};
    let count = 0;
    $('.dc_data').each(function(i, obj) {
      const field = $(obj).attr('data');
      let v = $(obj).val();
      if ( lib.verifyInteger(v) ) v = lib.int(v);
      if ( v !== edit_dc_lesson[ field ] ) {
        doc[field] = v;
        count += 1;
      }
    });

    if ( count > 0 ) {
      // we changed something
      const changes = [ { collection: 'DrawConclusions', id: edit_dc_lesson._id, doc: doc } ];
      $(e.currentTarget).html(wait);
      $(e.currentTarget).html(wait);
      Meteor.call('updateCollection', changes , function(err,results){
        $(e.currentTarget).html(html);
        if ( err ) {
          console.log('Error in Edit.js line 245',err);
        }
      });
    }
    $('#dc_popup').hide();
  },
  'click .dc_edit'(e){
    e.preventDefault();
    const id = $(e.currentTarget).attr('data');
    const ret = getDcLessonGivenId(id);
    if ( ret ) {
      set('edit_dc_lesson',ret);
      $('#dc_popup').show();
    }
    console.log('jones573a',id,ret);
  },
  'click .dc_lesson'(e){
    const id = $(e.currentTarget).attr('data');
    console.log('jones573b',id);
  },
  'change #dc_select_grade'(e){
    e.preventDefault();
    const GradeLevel = $(e.currentTarget).val();
    if ( GradeLevel ) searchDrawConclusions(e, lib.float(GradeLevel));
  },
  'click #gf_reload_all_words': function(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( html === wait ) return;
    $(e.currentTarget).html(wait);
    loadAllGatherFacts( function(){
      saveAllWordsTemp();
      $(e.currentTarget).html(html);
    });
  },
  'click #test_create_all_definitions': function(e){
    Meteor.call('createDefinitionAudio', allWords, function(err,results){
      if ( err ) {
        console.log('Error in Edit.js line 538',err);
      } else {
        console.log('createDefinitionAudio results',results);
        console.log('createDefinitionAudio allWords',allWords);
      }
    });
  },
  'click #test_create_all_words': function(e){
    Meteor.call('createAllSingleWordAudio', allWords, function(err,results){
      if ( err ) {
        console.log('Error in Edit.js line 540',err);
      } else {
        console.log('createAllSingleWordAudio results',results);
        console.log('createAllSingleWordAudio allWords',allWords);
      }
    });
  },
  'click #test_word_save_changes': function(e){
    // save changes in allWords.txt file
    wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    saveAllWordsFile(function(){
      Meteor.setTimeout(function(){
        $(e.currentTarget).html(html);
        let testWord = get('testWord');
        testWord.ok_count = 0;
        set('testWord',testWord);
        refresh('testWord');
      },500);
    });
  },
  'click #test_word_ok': function(e){
    // sound is ok as is
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    let testWord = get('testWord');
    const ix = testWord.ix;
    allWords[ix].google_ok = true;
    testWord.ix += 1;
    if ( ! testWord.ok_count ) testWord.ok_count = 0;
    testWord.ok_count += 1;
    set('testWord',testWord);
    $(e.currentTarget).html(html);
  },
  'click #test_word_not_ok': function(e){
    // sound is ok as is
    let testWord = get('testWord');
    const ix = testWord.ix;
    allWords[ix].google_ok = false;
    refresh('testWord');
  },
  'click .test_word_skip': function(e){
    const v = lib.int( $(e.currentTarget).attr('data'));
    let testWord = get('testWord');
    testWord.ix = Math.max(0,testWord.ix + v);
    if ( v > 0 ) {
      // skip to next word that is not ok
      while ( testWord.ix < allWords.length ) {
        if ( ! allWords[ testWord.ix ].google_ok ) break;
        testWord.ix += 1;
      }
    }
    set('testWord',testWord);
  },
  'click #gf_test_sounds': function(e){
    testSounds();
  },
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
  'click #edit_draw_conclusions'(e){
    const wait = '...';
    const html = $(e.currentTarget).html();
    if ( wait === html ) return;
    $(e.currentTarget).html(wait);
    Meteor.call('dcGradeLevels', function(err,results){
      $(e.currentTarget).html(html);
      if ( err ) {
        console.log('Error in Edit.js line 717',err);
      } else {
        set('dc_search', { GradeLevel: results } );
        set('mode',4);
      }
    });
  },
});
