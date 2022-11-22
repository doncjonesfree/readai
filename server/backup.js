import { GatherFacts, GatherFactsAnswers, DrawConclusions } from '/imports/db/Collections';
import * as lib from '../imports/api/lib';
const fs = require('fs');

export const backupToText = function(){
  let fullPath,data

  const special = '^'; // special character

  const path = '/Users/donjones/Downloads/ReadBackups'
  let retObj = { function: 'backupToText', success: true };

  retObj.DrawConclusions = DrawConclusions.find().fetch();
  data = [];
  for ( let i=0; i < retObj.DrawConclusions.length; i++ ) {
    const d = JSON.stringify( retObj.DrawConclusions[i]);
    if ( d.indexOf( special  ) >= 0 ) {
      console.log('backup.js problem line 15 i=%s ix=%s',i,d.indexOf(special));
      console.log(retObj.DrawConclusions[i]);
      throw 'backup.js problem line 15';
    }
    data.push( d );
  }
  fullPath = sprintf('%s/DrawConclusions.txt',path);
  fs.writeFileSync(fullPath,data.join(special));
  return retObj;
};
