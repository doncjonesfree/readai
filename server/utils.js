import { getObject, putObject } from './aws';
const fs = require('fs');

export const checkS3 = function( callback ){
  // look at all audio and definition files on local computer and see if any are missing
  // on S3.  If missing, upload them.
  let retObj = { success: true };
  let folder = 'definition';
  const path = sprintf('/Users/donjones/meteor/readMp3/%s',folder);
  retObj.dir = fs.readdirSync(path);
  addMissingFiles( retObj.dir, 0, folder, path, { count: 0, missing: 0, foundList: [], missingList: []}, function(results){
    retObj.results = results;
    callback( retObj );
  });
};

const addMissingFiles = function( list, ix, folder, path, results, callback ){
  const debug = false; // jones
  if ( ix < list.length ) {
    if ( ix % 100 === 0 ) console.log('addMissingFiles %s of %s (missing = %s)',ix,list.length,results.missing);
    const f = list[ix];
    if ( f.substr(0,1) !== '.') {
      results.count += 1;
      const fullName = sprintf('%s/%s',folder,f);
      getObject( fullName, function(obj){
        if ( obj.error ) {
          results.missing += 1;
          results.missingList.push(fullName);
          results.missingList.push(obj.error);

          if ( debug ) {
            addMissingFiles( list, ix+1, folder, path, results, callback );
          } else {
            copyToTempFolder( folder, f );
            addMissingFiles( list, ix+1, folder, path, results, callback );
          }
        } else {
          results.foundList.push( fullName );
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

const copyToTempFolder = function( folder, f ){
  // copy file from main folder to a temporary folder so we can upload to S3
  const src = sprintf('/Users/donjones/meteor/readMp3/%s/%s',folder,f);
  const dest = sprintf('/Users/donjones/meteor/readMp3/%sTmp/%s',folder,f);
  fs.copyFileSync(src, dest);
};
