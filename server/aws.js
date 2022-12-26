import { AWS } from 'meteor/peerlibrary:aws-sdk';
import * as lib from '../imports/api/lib';
const fs = require('fs');

const DefaultBucket = 'read-audio';

export const uploadS3 = function( fullPath, file, callback ){
  // seems to work for mp3 files

  // Create an S3 client
  const s3 = getS3Object();

  // Set the bucket and key for the file you want to upload
  const bucket = DefaultBucket;
  const key = file;

  // Read the file into a buffer
  const fileBuffer = fs.readFileSync(fullPath);

  // Set the content type and other metadata for the file
  const word = getWord( file );
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: 'audio/mpeg',
    Metadata: {
      'artist': 'Learn To Read',
      'title': sprintf('Definition for "%s"',word)
    }
  };

  // Upload the file to S3
  s3.upload(params, function(err, data) {
    if (err) {
      console.log('uploadS3 Error!',err);
    } else {
      console.log(`Successfully uploaded ${key} to ${bucket}`);
    }
    callback();
  });
};

const getWord = function( file ){
  // extract the word out of the S3 key to be uploaded
  let op = file.replace(".mp3",'');
  const ix = op.indexOf('/');
  if ( ix > 0 ) op = op.substring(ix+1);
  return op;
};

export const putObject = function( fullPath, file, callback ){
  // This doesn't work for mp3 files. It sends data, but file contents wrong
  let retObj = { file: file };
  const s3 = getS3Object();
  // ascii, utf8, base64
  const data = fs.readFileSync( fullPath, 'utf8');
  let params = { Body: data, Bucket: DefaultBucket, Key: file };
  params.ContentType = 'audio/mp3';
  // left off here - probably writing bad data - abandoned is first word
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
