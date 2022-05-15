import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import * as lib from '../api/lib';

const pre = 'edit_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {
  Session.set(pre + n,v)
};
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Edit.onCreated(function HomeOnCreated() {
  setd('mode',1);
  setd('gf_search',{});
  setd('gatherfacts',{ GatherFacts: [] });
});

Template.Edit.helpers({
  mode0() { return get('mode') === 0 },
  mode1() { return get('mode') === 1 },
  mode2() { return get('mode') === 2 },
  gf_search() { return get('gf_search')},
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
      }
    });
  }
};

Template.Edit.events({
  'click .gf_edit'(e){
    const data = $(e.currentTarget).attr('data').split('_');
    const LessonNum = lib.int(data[0]);
    const Number = lib.int(data[1]);
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
