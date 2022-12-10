import { Cookies } from 'meteor/ostrio:cookies';
const cookies = new Cookies();

export const dateFormat = 'YYYY-MM-DD HH:mm:ss';
export const today = function() {
    // pacific time zone
    return currentMoment().format(dateFormat);
};

export const setCookie = function(key,value){
  const options = { expires: Infinity };
  cookies.set(key,value,options);
};

export const getCookie = function(key){
  return cookies.get(key)
};

export const prettyDate = function(d) {
  return moment(d,dateFormat).format('ddd MM/DD/YY h:mm a');
};

export const prettyDateShort = function(d) {
  // just the date YYYY-MM-DD or 5/24/2021
  if ( d.indexOf('/') > 0 ) {
    return moment(d,'MM/DD/YYYY').format('ddd MM/DD/YY');
  } else {
    return moment(d,'YYYY-MM-DD').format('ddd MM/DD/YY');
  }
};

export const toObject = function(array,field) {
  let obj = {};
  for ( let i=0; i < array.length; i++ ) {
    let a = array[i];
    obj[a[ field ]] = a;
  }
  return obj;
}

export const calculatePoints = function( lesson, thisQuestion ){
  const correctPoints = 10; // points for every correct answer
  const incorrectPoints = 5; // negagitive points for every incorrect answer
  let points = correctPoints * lesson.answers.length;
  if ( thisQuestion ) points = correctPoints;
  if ( lesson.incorrect ) {
    for ( let key in lesson.incorrect ) {
      if ( hasOwnProperty(lesson.incorrect,key)) {
        if ( ! thisQuestion || ( thisQuestion === int(key) )) {
          let v = lesson.incorrect[key];
          if ( v > 2 ) v = 2;
          points -= ( incorrectPoints * v );
        }
      }
    }
  }
  return Math.max(0,points);
};

export const getCurrentUser = function(){
  let u = Session.get('currentUser');
  if ( u ) return u;

  // Not currently signed in for this session, but check to
  // see if there is a cookie.  If so, use that as the login.
  u = getCookie('ltrSignin');
  if ( u && typeof(u) === 'object') {
    Session.set('currentUser',u);
    return u;
  }
  return '';
};

export const currentMoment = function(){
  // On server it's UTC time which is 7 hours past pacific time

  // may force to a certain time for testing
  // return moment('2021-03-18 12:00:00',dateFormat);
  return moment().tz('America/Los_Angeles');
};

export const buttonHtml = function(obj){
  // const button2 = { button: 'Cancel', cls: 'sh_change_mode', data: '2'};
  // op.push( { button: 'Save', id: 'student_save', error: get('error'), button2: button2  } );
  let cls, id, loadGatherFacts;
  let html = [];
  let title = '';
  if ( obj.title ) title = sprintf('title="%s"',obj.title);
  cls = '';
  if ( obj.cls ) cls = sprintf(' %s',obj.cls );
  id = '';
  if ( obj.id ) id = sprintf(' id="%s"',obj.id );
  data = '';
  if ( obj.data ) data = sprintf(' data="%s"',obj.data );
  html.push(  sprintf('<div class="button%s"%s%s%s>%s</div>',cls,id,title,data,obj.button ) );
  if ( obj.button2 ) {
    cls = '';
    if ( obj.button2.cls ) cls = sprintf(' %s',obj.button2.cls );
    id = '';
    if ( obj.button2.id ) id = sprintf(' id="%s"',obj.button2.id );
    data = '';
    if ( obj.button2.data ) data = sprintf(' data="%s"',obj.button2.data );
    html.push(  sprintf('<div class="button%s"%s%s>%s</div>',cls,id,data,obj.button2.button ) );
  }
  if ( obj.error ) {
    html.push(  sprintf('<div class="button-error">%s</div>',obj.error ) );
  }

  return html.join('\n');
};


export const inputCheckboxHtml = function(obj){
  // { label: id: placeholder: value:, title }
  let html = [];
  html.push('<form>')
    html.push( '<div class="input-wrapper">');
      if ( ! obj.value ) obj.value = '';
      if ( obj.label ) {
        html.push( sprintf('<label class="input-label" for="%s">%s</label>',obj.id,obj.label));
      }
      let checked = '';
      if ( obj.value ) checked = ' checked';
      html.push( '<div class="input-checkbox-message">' );
      html.push( sprintf('<input class="input-checkbox" type="checkbox" id="%s"%s>',obj.id,checked));
      html.push( obj.title );
      html.push( '</div>');
    html.push( '</div>');
  html.push('</form>');

  return html.join('\n');
};

const justInfoHtml = function(obj){
  // { label: placeholder: value:, title }
  let html = [];
  html.push( '<div class="input-wrapper">');
    let ph = '';
    if ( obj.placeholder ) ph = sprintf(' placeholder="%s"',obj.placeholder);
    let title = '';
    if ( obj.title ) title = sprintf(' title="%s"',obj.title);
    if ( ! obj.value ) obj.value = '';
    if ( obj.label ) {
      html.push( sprintf('<label class="input-label" for="%s">%s</label>',obj.id,obj.label));
    }
    html.push( sprintf('<input class="input-text" type="text" id="%s" value="%s" %s%s disabled>',obj.id,obj.value,ph,title));
  html.push( '</div>');

  return html.join('\n');
};

export const inputHtml = function(obj){
  // { label: id: placeholder: value:, title }
  let html = [];
  //html.push('<form>')
    html.push( '<div class="input-wrapper">');
      let ph = '';
      if ( obj.placeholder ) ph = sprintf(' placeholder="%s"',obj.placeholder);
      let title = '';
      if ( obj.title ) title = sprintf(' title="%s"',obj.title);
      if ( ! obj.value ) obj.value = '';
      if ( obj.label ) {
        html.push( sprintf('<label class="input-label" for="%s">%s</label>',obj.id,obj.label));
      }
      html.push( sprintf('<input class="input-text" type="text" id="%s" value="%s"%s%s>',obj.id,obj.value,ph,title))
    html.push( '</div>');
  //html.push('</form>');

  return html.join('\n');
};

export const flexEntryHtml = function(list){
  // left off here
  let html = [];
  for ( let i=0; i < list.length; i++ ) {
    const l = list[i];
    if ( l.button ) {
      // const button2 = { button: 'Cancel', cls: 'sh_change_mode', data: '2'};
      // op.push( { button: 'Save', id: 'student_save', error: get('error'), button2: button2  } );
      html.push( buttonHtml( l ) );
    } else if ( l.checkbox ) {
      html.push( inputCheckboxHtml( { id: l.id, label: l.label, title: l.message, value: l.value } ) );
    } else if ( l.just_info ) {
      // just showing data - cannot edit
      html.push( justInfoHtml( { label: l.label, title: l.message, value: l.value } ) );
    } else {
      // { label: id: placeholder: value:, title }
      html.push( inputHtml( { id: l.id, label: l.label, title: l.message, value: l.value } ) );
    }
  }
  return html.join('\n');
};

export const dataEntryHtml = function(list, argSettings){
  // probably deprecated
  let settings = { flexWidth: '100%', longText: '20em', shortText: '5em', labelWidth: '20%', valueWidth: '40%', messageWidth: '40%' };
  if ( argSettings ) settings = argSettings;
  let html = [];
  for ( let i=0; i < list.length; i++ ) {
    const l = list[i];
    html.push( sprintf('<div class="de_flex" style="width: %s;">',settings.flexWidth) );
      if ( l.button ) {
        html.push( sprintf('<div class="de_label" style="width: %s;"></div>',settings.labelWidth) );

        html.push( sprintf('<div class="de_value" style="width: %s;">',settings.valueWidth) );
        html.push( sprintf('<button id="%s">%s</button>',l.id,l.button));
        if ( l.button2 ) {
          //   const button2 = { button: 'Cancel', cls: 'sh_change_mode', data: '2'};
          const b2 = l.button2;
          html.push( sprintf('<button class="%s" data="%s">%s</button>',b2.cls,b2.data,b2.button));
        }
        if ( l.error ) {
          html.push( sprintf('<div class="de_error">%s</div>',l.error));
          l.message = '';
        }
        html.push( '</div>' );
      } else if ( l.checkbox ) {
        html.push( sprintf('<div class="de_label" style="width: %s;">%s</div>',settings.labelWidth, l.label) );
        html.push( sprintf('<div class="de_value" style="width: %s;">',settings.valueWidth) );
        html.push( sprintf('<input type="checkbox" id="%s" class="de_checkbox" %s>',l.id,l.value) );
        html.push( '</div>' );
      } else {
        html.push( sprintf('<div class="de_label" style="width: %s;">%s</div>',settings.labelWidth, l.label) );

        let v = l.value;
        if ( ! v ) v = '';
        html.push( sprintf('<div class="de_value" style="width: %s;">',settings.valueWidth) );
        let width = settings.longText;
        if ( l.short ) width = settings.shortText;
        if ( l.placeholder ) {
          html.push( sprintf('<input type="text" id="%s" value="%s" style="width: %s;" placeholder="%s">',l.id,v,width,l.placeholder));
        } else {
          html.push( sprintf('<input type="text" id="%s" value="%s" style="width: %s;">',l.id,v,width));
        }
        html.push( '</div>' );
      }
      if ( ! l.message ) l.message = '';
      html.push( sprintf('<div class="de_message" style="width: %s;">%s</div>',settings.messageWidth, l.message));

    html.push( '</div>' );
  }
  return html.join('\n');
};

export const docFromFields = function( list ){
  // works with dataEntryHtml and returns an object with data
  let doc = {};
  let error = '';
  for ( let i=0; i < list.length; i++ ) {
    const l = list[i];
    if ( l.just_info ) {
      doc[ l.id ] = l.data;
    } else if ( l.type === 'pin'){
      // 4 digit pin
      let v = $('#'+l.id).val();
      doc[ l.id ] = v;
      if ( ! error && ! verifyInteger(v) ) error = 'Pin must be a 4 digit #';
      if ( ! error ) {
        v = int(v);
        if ( ! error && v <= 0 ) error = 'Pin must be positive';
        if ( ! error && v > 9999 ) error = 'Pin must be a 4 digit #';
        if ( ! error && v < 1000 ) error = 'Pin must be a 4 digit #';
        if ( ! error ) doc[ l.id ] = v;
      }
    } else if ( ! l.button ) {
      if ( $('#'+l.id).attr('type') === 'checkbox') {
        const v = $('#'+l.id).is(':checked');
        doc[ l.id ] = v;
      } else {
        const v = $('#'+l.id).val();
        doc[ l.id ] = v;
        if ( ! error && ! v && l.required ) error = sprintf('%s is required',l.label);
        if ( ! error && v && l.type === 'email' && ! verifyEmail(v) ) error = sprintf('Invalid %s',l.label);
        if ( ! error && l.type === 'year' && ! verifyYear(v) ) error = sprintf('Invalid %s',l.label);
      }
    }
  }
  doc.created = today();
  return { doc: doc, error: error };
};

const verifyYear = function(arg){
  if ( verifyInteger(arg) ) {
    const v = int(arg);
    if ( v < 1900 ) return false;
    const currentYear = int( today().substr(0,4));
    if ( v > currentYear ) return false;
    return true;
  }

  return false;
};

export const verifyEmail = function( value ) {
    // see if given value is a given email
    // const filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    const filter  = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return filter.test(value);
};

export const formatGFParagraph = function( arg ){
  let p = arg;
  if ( typeof(p) === 'number') p = p.toString();
  const first = p.trim().split(' ')[0];
  const special = '@@@';
  let uniqueCount = 0;
  if ( first === '1.') {
    // we have a numbered list of choices
    let op = [];
    for ( let n=1; n < 1000; n++ ) {
      const ix = p.indexOf( sprintf('%s.',n));
      if ( ix < 0 ) break;
      let ix2 = p.indexOf( sprintf('%s.',n+1));
      if ( ix2 < 0 ) ix2 = p.length;
      op.push( p.substr(ix, ix2 - ix));
    }
    p = op.join(special); // unusual string
    const ret = addDivsForLongerWords(p,uniqueCount);
    p = ret.op;
    uniqueCount = p.uniqueCount;
    p = p.replace(/@@@/g,'<br><br>');
    return p;
  } else {
    const ret = addDivsForLongerWords(p,uniqueCount);
    uniqueCount = p.uniqueCount;
    return ret.op;
  }
};

export const epoch = function() {
    // ms since epoch
    return new Date().getTime();
};

let SoundInProgress = false;
export const lookupAndPlay = function( pre, e, word, callback, count ){
  if ( ! count ) count = 0;
  if ( SoundInProgress && count < 4 ) {
    Meteor.setTimeout(function(){
      lookupAndPlay( pre, e, word, callback, count + 1 );
    },1000);
  } else {
    SoundInProgress = true;
    Session.set(sprintf('%s%s',pre,word));
    if ( word === "can't") word = 'cant';
    googlePlaySound( word, function(){
      SoundInProgress = false;
    });
    // DictionaryLookup( word, function(results){
    //   playSound(results, function(){
    //     SoundInProgress = false;
    //     callback();
    //   });
    // });
  }
};

let SoundObj = '';

export const googlePlaySound = function( arg, callback ){
  // assume word has an mp3 file without looking
  // arg is a single word - but if * as first character, then we
  // should play the definition, not the word.
  const s3path = 'https://read-audio.s3.us-west-2.amazonaws.com';
  let word = arg;
  let url = sprintf('%s/audio/%s.mp3',s3path,word.toLowerCase());
  let definition = false;
  if ( word.substr(0,1) === '*') {
    // actually we want the definition, not the word itself
    word = word.substring(1);
    url = sprintf('%s/definition/%s.mp3',s3path,word.toLowerCase());
    definition = true;
  }

  if ( SoundObj ) SoundObj.stop(); // stop the previous sound

  let urlList = [ url ];
  if ( definition ) {
    urlList.push('/definition/no_definition_found.mp3');
  } else {
    urlList.push('/audio/no_word_found.mp3');
  }

  play( urlList, 0, function(success){
    if ( callback ) callback(success);
  });

};

const play = function( list, ix, callback ){
  // play the sound
  if ( ix < list.length ) {
    const url = list[ix];
    SoundObj = new Howl( { src: url });
    SoundObj.on('end',function(){
      Meteor.setTimeout(function(){
        SoundObj = '';
        callback( true ); // success
      },100);
    });
    SoundObj.on('loaderror',function(){
      // alert my gmail address so I can correct the missing word / definition
      sendMissingWordEmail( url );
      Meteor.setTimeout(function(){
        SoundObj = '';
        // try again - 2nd sound let's them know we don't have that word
        play( list, ix+1, callback );
      },100);
    });
    SoundObj.play();
  } else {
    callback( false );
  }
};

const sendMissingWordEmail = function( url ){
  // A word or definition is missing from S3 - send myself an email
  // https://read-audio.s3.us-west-2.amazonaws.com/audio/wagon.mp3
  // https://read-audio.s3.us-west-2.amazonaws.com/definition/wagon.mp3
  let word;
  let ix = url.indexOf('/audio/');
  let type = 'word';
  if ( ix < 0 ) {
    ix = url.indexOf('/definition/');
    type = 'definition';
    word = url.substring(ix+12);
  } else {
    word = url.substring(ix+7);
  }
  word = word.replace('.mp3','');
  let data = {};
  data.from = 'support@ltrfree.com';
  data.to = 'doncjones1@gmail.com';
  data.subject = sprintf('Don, "%s" is a missing %s',word,type);
  let lines = [];
  lines.push( 'Missing word in ltrfree.com' );
  lines.push( sprintf('Word: %s',word) );
  lines.push( sprintf('Type: %s',type) );
  data.text = lines.join('\n');
  Meteor.call('sendEmail', data,function(err,results){
    if ( err ) {
      console.log('Error: lib.js line 407',err);
    } else {
      let ok = false;
      if ( results && results.body && results.body.message && results.body.message.indexOf('Queued') >= 0 ) ok = true;
      if ( ! ok ) {
        console.log('sendEmail error:',results);
      }
    }
  });
};

const playSound = function(results, callback){
  let list = [];
  for ( let i2=0; i2 < results.length; i2++ ) {
    let url = '';
    const r = results[i2];
    if ( r && r.phonetics && r.phonetics.length > 0) {
      for ( let i=0; i < r.phonetics.length; i++ ) {
        const p = r.phonetics[i];
        if ( p.audio ) {
          if ( ! url ) {
            url = p.audio;
          } else if ( p.audio.indexOf('-us.') > 0 ) {
            url = p.audio;
            break;
          }
        }
      }
    }
    if ( url && list.indexOf(url) < 0 ) list.push(url);
  }
  Meteor.setTimeout(function(){
    playSoundList( list, 0, function(){
      callback();
    });
  },100);
};

const playSoundList = function( list, ix, callback ){
  if ( ix < list.length ) {
    const url = list[ix];
    let sound = new Howl( { src: url });
    sound.on('end',function(){
      Meteor.setTimeout(function(){
        playSoundList( list, ix+1, callback );
      },100);
    });
    sound.play();
  } else {
    callback();
  }
};


export const DictionaryLookup = function( word, callback ){
  Meteor.call('DictionaryLookup', word , function(err,results){
    if ( err ) {
      console.log('Error in GFLessons.js line 17',err);
    }
    callback(results);
  });
};

export const listWordsFromGFParagraph = function( arg, alreadyFormatted ){
  // arg is the paragraph
  const removeBadCharacters = function(arg){
    // given a word - remove any characters that cannot be part of the word
    // example: 'Hammerstein
    let w = arg;
    const badList = ["'", '"'];
    // quote as first or last character can't be correct
    for ( let i=0; i < badList.length; i++ ) {
      const c = badList[i];
      if ( w.substr(0,1) === c) w = w.substring(1);
      if ( w.substr( w.length-1,1) === c) w = w.substr(0,w.length-1);
    }
    return w;
  };

  let p;
  if ( alreadyFormatted ) {
    p = arg;
  } else {
    p = formatGFParagraph( arg );
  }
  // each word we care about has class="lesson_word" in a div around it
  let ix = p.indexOf('class="lesson_word"')
  let obj = {}; // words found
  let count = 0;
  while ( ix >= 0 && p.length > 0 ) {
    // <div class="lesson_word">ran</div>
    count += 1;
    if ( count > 1000) {
      console.log('listWordsFromGFParagraph infinite loop');
      break;
    }
    let found = false;
    let word = [];
    let lastIx = ix;
    for ( let i=ix+10; i < p.length; i++ ) {
      lastIx = i;
      const c = p.substr(i,1);
      if ( found && c === '<') {
        break;
      } else if ( found ) {
        word.push(c);
      } else if ( c === '>' ) {
        found = true;
        word = [];
      }
    }
    if ( word.length > 0 ) {
      word = removeBadCharacters( word.join('').toLowerCase() );
      if ( ! obj[word]) obj[word] = true;
    }
    p = p.substr(lastIx);
    ix = p.indexOf('class="lesson_word"')
  }
  let list = [];
  for ( let w in obj ) {
    if ( hasOwnProperty(obj,w)) {
      list.push(w);
    }
  }
  return list;
};

const lettersEtc = "abcdefghijklmnopqrstuvwxyz'";
const partOfWord = function(c){
  return lettersEtc.indexOf(c.toLowerCase()) >= 0;
};

export const addDivsForLongerWords = function(arg, argUniqueCount){
  const semiComing = function(w,ix){
    // true if a semi colon is coming soon - like in &quot;
    for ( let i=ix; i < w.length; i++ ) {
      const c = w.substr(i,1);
      if ( c === ';') {
        if ( i - ix < 6 ) return true;
        return false;
      }
    }
    return false;
  };

  const breakUpQuotes = function(list){
    // given &quot;Why, break that into two words
    let op = [];
    for ( let i=0; i < list.length; i++ ) {
      let w = list[i];
      const ix = w.indexOf('&quot;');
      if ( ix < 0 ) {
        // no quote to deal with
        op.push(w);
      } else {
        let before = '';
        if ( ix > 0 ) before = w.substr(0,ix); // word before the quote
        let after = '';
        if ( (ix+6) < w.length ) {
          after = w.substring(ix+6);
        }
        if ( before && after ) {
          op.push(before);
          op.push( sprintf('&quot;%s',after));
        } else {
          op.push(w);
        }
      }
    }
    return op;
  };

  const clean = function(w){
    // change <i>horns</i> to horns
    const list = ['<i>','</i>','<b>','</b>'];
    let op = w;
    for ( let i=0; i < list.length; i++ ) {
      const src = list[i];
      op = op.replace(src,'');
    }
    return op;
  };

  const breakUpWord = function(w){
    // special case "<i>horns</i>"
    const ix1 = w.indexOf('<i>');
    const ix2 = w.indexOf('</i>');
    if ( ix1 >= 0 && ix2 > 0 ) {
      return { before: w.substr(0,ix1+3), word: w.substr(ix1+3, ix2 - ix1 - 3 ), after: w.substring(ix2) };
    }

    let before = [];
    let word = [];
    let after = [];
    let waitForSemi = false;
    for ( let i=0; i < w.length; i++ ) {
      let c = w.substr(i,1);
      if ( waitForSemi ) {
        before.push(c);
        if ( c === ';' ) waitForSemi = false;
        continue;
      }
      if ( c === '&' && semiComing(w,i+1) && word.length === 0 ) {
        waitForSemi = true;
        before.push(c);
        continue;
      }
      if ( partOfWord(c) && after.length === 0 ) {
        word.push(c);
      } else if ( word.length > 0 ) {
        after.push(c);
      } else {
        before.push(c);
      }
    }
    before = before.join('');
    after = after.join('');
    word = word.join('');
    return { before: before, word: word, after: after };
  };

  if ( ! arg ) arg = '';
  let p = copy(arg).replace(/\n/g,' ');
  let list = breakUpQuotes( p.split(' ') );
  let op = [];
  let uniqueCount = argUniqueCount; // differentiate between words so we can tell which word was clicked if same word is multiple times
  for ( let i=0; i < list.length; i++ ) {
    let w = list[i];
    let obj = breakUpWord(w);
    if ( obj.word.length >= 2 ) {
      if ( obj.word ) {
        const cleanWord = clean(obj.word);
        uniqueCount += 1;
        op.push(sprintf('%s<div class="lesson_word" data="%s" data2="%s">%s</div><div class="word_def" data="%s" data2="%s">D</div>%s',obj.before,cleanWord,uniqueCount,obj.word,cleanWord,uniqueCount,obj.after));
      } else {
        op.push(obj.before);
      }
    } else {
      op.push(w);
    }
  }
  return { op: op.join('&nbsp;'), uniqueCount: uniqueCount };
};

export const numbersOnly = function(arg) {
  // returns just the numbers in the given string
  let op = [];
  const v = arg.toString();
  for ( let i=0; i < v.length; i++ ) {
    const c = v.substr(i,1);
    if ( isNumber(c)) op.push(c);
  }
  return op.join('');
};

export const numberToLetter = function(n){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if ( n <= 26 ) return letters.substr(n-1,1);
  return 'Z';
};

export const hasOwnProperty = function (data, key) {
  return Object.prototype.hasOwnProperty.call(data, key);
};

export const makeList = function( recs, field, field1 ){
  // Make a list of a single field within list of recs
  let list = [];
  for ( let i=0; i < recs.length; i++ ) {
    const r = recs[i];
    const v = r[ field ];
    if ( v && list.indexOf(v) < 0 ) list.push(v);
  }
  if ( list.length === 0 && typeof(field1) !== 'undefined' ) list.push(field1);
  return list;
}

export const focus = function(id,count){
  if ( ! count ) count = 0;
  if ( $(id).length ) {
    $(id).focus();
  } else if ( count > 10 ) {
    console.log('focus timed out ',id);
  } else {
    Meteor.setTimeout(function(){
      focus(id,count+1);
    },200);
  }
};

export const isNumber = function(c){
  const numbers = '1234567890';
  return numbers.indexOf(c) >= 0;
};


export const verifyInteger = function(value) {
  if ( typeof(value) === 'string') {
    // make sure "," in number doesn't mess us up.
    let v = value.replace(/,/g,'');
    if ( numbersOnly(v) !== v ) return false;
    let v1 = parseInt(v);
    let v2 = parseFloat(v);
    if ( isNaN(v1) || isNaN(v2)) return false;
    return v1 === v2;
  } else if ( typeof(value) === 'number') {
    let v1 = parseInt(value);
    let v2 = parseFloat(value);
    if ( isNaN(v1) || isNaN(v2)) return false;
    return v1 === v2;
  } else {
    return false;
  }
};

export const copy = function(obj) {
  try {
    return JSON.parse( JSON.stringify(obj));
  } catch(err) {
    console.log('Error in copy',err,obj);
    return {};
  }
};

export const float = function(n) {
  if ( typeof(n) === 'string' && n.indexOf(',') >= 0 ) n = n.replace(/,/g,'');
  let op = parseFloat(n);
  if ( isNaN(op)) op = 0;
  return op;
};

export const int = function(n) {
  let v = n;
  if ( typeof(n) === 'string') {
    // make sure "," in number doesn't mess us up.
    v = n.replace(/,/g,'');
  }
  let op = parseInt(v);
  if ( isNaN(op)) op = 0;
  return op;
};

export const verifyFloat = function(arg) {
    if (typeof(arg) === 'number') return true;
    if (typeof(arg) !== 'string') return false;
    var v = arg.trim();
    var n = parseFloat(v);
    if (isNaN(n)) return false;
    for (var i=0; i < v.length; i++) {
        var c = v.substr(i,1);
        if ('1234567890.-'.indexOf(c) < 0) return false;
    }
    return true;
};
