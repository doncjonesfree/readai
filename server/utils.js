import { getObject, putObject } from './aws';
const fs = require('fs');

export const checkS3 = function( callback ){
  // look at all audio and definition files on local computer and see if any are missing
  // on S3.  If missing, upload them.
  let retObj = { success: true };
  let folder = 'audio';
  const path = sprintf('/Users/donjones/meteor/readMp3/%s',folder);
  retObj.dir = fs.readdirSync(path);
  addMissingFiles( retObj.dir, 0, folder, path, { count: 0, missing: 0, foundList: [], missingList: []}, function(results){
    retObj.results = results;
    callback( retObj );
  });
};

const addMissingFiles = function( list, ix, folder, path, results, callback ){
  if ( ix < list.length && results.missingList.length === 0 ){ // jones
    const f = list[ix];
    if ( f.substr(0,1) !== '.') {
      results.count += 1;
      const fullName = sprintf('%s/%s',folder,f);
      getObject( fullName, function(obj){
        if ( obj.error ) {
          results.missing += 1;
          results.missingList.push(fullName);
          results.missingList.push(obj.error);

          putObject( sprintf('%s/%s',path,f), fullName, function(putResults){
            results.putResults = putResults;
            addMissingFiles( list, ix+1, folder, path, results, callback );
          });
        } else {
          results.foundList.push(fullName);
          addMissingFiles( list, ix+1, folder, path, results, callback );
        }
      });
    } else {
      addMissingFiles( list, ix+1, folder, path, results, callback );
    }
  } else {
    callback( results);
  }
};
