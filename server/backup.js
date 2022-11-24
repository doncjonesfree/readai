import { GatherFacts, GatherFactsAnswers, DrawConclusions } from '/imports/db/Collections';
import * as lib from '../imports/api/lib';
const fs = require('fs');

export const restoreFromText = function(){
  return { error: 'Restore is disabled for now'};
  let retObj = { function: 'restoreFromText', results: [] };

  GatherFacts.remove({});
  GatherFactsAnswers.remove({});
  DrawConclusions.remove({});

  const path = '/Users/donjones/Downloads/ReadBackups'

  restore( retObj, DrawConclusions, sprintf('%s/DrawConclusions.txt',path));
  restore( retObj, GatherFacts, sprintf('%s/GatherFacts.txt',path));
  restore( retObj, GatherFactsAnswers, sprintf('%s/GatherFactsAnswers.txt',path));

  retObj.GatherFacts = GatherFacts.find().fetch().length;
  retObj.GatherFactsAnswers = GatherFactsAnswers.find().fetch().length;
  retObj.DrawConclusions = DrawConclusions.find().fetch().length;

  return retObj;
};

const restore = function( retObj, collection, fullPath ){
  const file = fs.readFileSync(fullPath, "utf8");
  const lines = file.split('^');

  for ( let i=0; i < lines.length; i++ ) {
    let l = JSON.parse(lines[i]);
    delete l._id;
    collection.insert(l);
  }
  let o = {};
  o.lines = lines.length;
  o.line1 = lines[0];
  o.path = fullPath;
  retObj.results.push(o);

};

export const backupToText = function(){
  // backup all teaching files to text files
  return { error: 'Backup is disabled for now'};

  const path = '/Users/donjones/Downloads/ReadBackups'
  let retObj = { function: 'backupToText', success: true, results: [] };

  backup( retObj, DrawConclusions.find().fetch(), sprintf('%s/DrawConclusions.txt',path));
  backup( retObj, GatherFacts.find().fetch(), sprintf('%s/GatherFacts.txt',path));
  backup( retObj, GatherFactsAnswers.find().fetch(), sprintf('%s/GatherFactsAnswers.txt',path));

  return retObj;
};

const backup = function( retObj, list, fullPath ){
  const special = '^'; // special character
  const delSpecialList = [ 'db8ezMTSsZKRtfDLh', 'u8Sskqo2d2xfF4veh','TDBinWkSqC6bXW4Lh' ];

  let o = { path: fullPath, count: list.length, exceptions: 0 }
  let data = [];
  for ( let i=0; i < list.length; i++ ) {
    let r = list[i];
    let d = JSON.stringify( r );
    if ( d.indexOf( special  ) >= 0 ) {
      if ( delSpecialList.indexOf(r._id) >= 0 ) {
        o.exceptions += 1;
        d = d.replace(/\^/g,'');
        console.log('jones27');
        console.log(r);
        console.log(d);
        if ( d.indexOf( special  ) >= 0 ) throw 'jones30';
      } else {
        console.log('backup.js problem line 25 i=%s ix=%s',i,d.indexOf(special));
        console.log(r);
        throw 'backup.js problem line 25';
      }
    }
    data.push( d );
  }
  retObj.results.push(o);
  fs.writeFileSync(fullPath,data.join(special));
};
