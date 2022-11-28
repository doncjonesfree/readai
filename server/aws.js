import { AWS } from 'meteor/peerlibrary:aws-sdk';
import * as lib from '../imports/api/lib';
const fs = require('fs');

const DefaultBucket = 'read-audio';

export const putObject = function( fullPath, file, callback ){
  let retObj = { file: file };
  const s3 = getS3Object();
  const data = fs.readFileSync( fullPath, 'binary');
  const params = { Body: data, Bucket: DefaultBucket, Key: file };
  // left off here - probably writing bad data - abandoned is first word
  console.log('jones13',file);
  throw 'jones13'
  s3.putObject(params, function(err,data){
    if ( err ) {
      retObj.error = err;
    } else {
      retObj.data = data;
    }
    callback( retObj );
  });
};

export const getObject = function( file, callback ){
  let retObj = { file: file };
  const s3 = getS3Object();
  const params = { Bucket: DefaultBucket, Key: file };
  s3.getObject(params, function(err,data){
    if ( err ) {
      retObj.error = err;
    } else {
      retObj.data = data;
    }
    callback( retObj );
  });
};

export const deleteAwsFiles = function( list, callback ){
  let retObj = { list: list, message: sprintf('S3 Files Deleted: %s',list.length) };
  const s3 = getS3Object();
  deleteOneFile( s3, list, 0, 0, function(errorCount){
    retObj.errorCount = errorCount;
    callback( retObj );
  });
};

const deleteOneFile = function( s3, list, ix, errorCount, callback ){
  if ( ix < list.length ) {
    const Key = list[ix].Key;
    const params = { Bucket: DefaultBucket, Key: Key };
    s3.deleteObject(params, function(err,data){
      if ( err ) {
        console.log('s3.deleteObject error',err);
        errorCount += 1;
      }
      deleteOneFile( s3, list, ix+1, errorCount, callback );
    });
  } else {
    callback(errorCount);
  }
};

export const listAwsFiles = function( bucket, callback ) {
  // list files in a given bucket
  // Docs from: https://docs.aws.amazon.com/code-samples/latest/catalog/javascript-s3-s3_listobjects.js.html
  let retObj = { list: [] };
  if ( ! bucket ) bucket = DefaultBucket;

  retObj.bucket = bucket;

  const s3 = getS3Object('2006-03-01');

  const params = { Bucket: bucket };
  s3.listObjects( params, (err, data ) => {
    if ( err ) {
      retObj.error = err;
    } else {
      data.Contents.forEach((o) => {
        const Key = o.Key;
        const ETag = o.ETag;
        retObj.list.push( { Key: Key, ETag: ETag } );
      });
      retObj.data = data;
    }
    callback( retObj );
  })
};

const getS3Object = function( apiVersion ){
  const settings = Meteor.settings.aws;
  let obj = {};
  obj.region = 'us-west-2';
  obj.accessKeyId = settings.AWS_ACCESS_KEY_ID;
  obj.secretAccessKey = settings.AWS_SECRET_ACCESS_KEY;
  obj.signatureVersion = 'v4';
  if ( apiVersion ) obj.apiVersion = apiVersion;
  return new AWS.S3( obj );
};

export async function generateUploadURL( userName ) {
  // Before we send a file to S3 we need a URL.  This way we can send the file
  // directly to S3 from the console without having to send to the server first.

  const s3 = getS3Object();

  const imageName = sprintf('%s-%s',userName,lib.epoch()); // unique random string
  const bucketName = DefaultBucket;

  const params = ({
    Bucket: bucketName,
    Key: imageName,
    Expires: 60
  })

  const uploadURL = await s3.getSignedUrlPromise('putObject',params);
  return uploadURL;
}
