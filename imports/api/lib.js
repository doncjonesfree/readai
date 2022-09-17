export const dateFormat = 'YYYY-MM-DD HH:mm:ss';
export const today = function() {
    // pacific time zone
    return currentMoment().format(dateFormat);
};

export const getCurrentUser = function(){
  const u = Session.get('currentUser');
  if ( u ) return u;
  return '';
};

export const currentMoment = function(){
  // On server it's UTC time which is 7 hours past pacific time

  // may force to a certain time for testing
  // return moment('2021-03-18 12:00:00',dateFormat);
  return moment().tz('America/Los_Angeles');
};


export const dataEntryHtml = function(list, argSettings){
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
        if ( l.error ) {
          html.push( sprintf('<div class="de_error">%s</div>',l.error));
          l.message = '';
        }
        html.push( '</div>' );
      } else if ( l.checkbox ) {
        html.push( sprintf('<div class="de_label" style="width: %s;">%s</div>',settings.labelWidth, l.label) );
        html.push( sprintf('<div class="de_value" style="width: %s;">',settings.valueWidth) );
        html.push( sprintf('<input type="checkbox" id="%s" class="de_checkbox">',l.id) );
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
    if ( ! l.button ) {
      const v = $('#'+l.id).val();
      doc[ l.id ] = v;
      if ( ! error && ! v && l.required ) error = sprintf('%s is required',l.label);
      if ( ! error && v && l.type === 'email' && ! verifyEmail(v) ) error = sprintf('Invalid %s',l.label);
      if ( ! error && l.type === 'year' && ! verifyYear(v) ) error = sprintf('Invalid %s',l.label);
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
  let word = arg;
  let url = sprintf('/audio/%s.mp3',word.toLowerCase());
  if ( word.substr(0,1) === '*') {
    // actually we want the definition, not the word itself
    word = word.substring(1);
    url = sprintf('/definition/%s.mp3',word.toLowerCase());
  }

  if ( SoundObj ) SoundObj.stop(); // stop the previous sound

  // play the sound
  SoundObj = new Howl( { src: url });
  SoundObj.on('end',function(){
    Meteor.setTimeout(function(){
      SoundObj = '';
      if ( callback ) callback();
    },100);
  });
  SoundObj.play();
};

export const wordExists = function(word, callback){
  Meteor.call('wordExists', word , function(err,results){
    if ( err ) {
      console.log('Error in lib.js line 76',err);
    }
    callback(results);
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
