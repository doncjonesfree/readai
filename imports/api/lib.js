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

export const googlePlaySound = function( arg, callback ){
  // assume word has an mp3 file without looking
  let word = arg;
  let url = sprintf('/audio/%s.mp3',word.toLowerCase());
  if ( word.substr(0,1) === '*') {
    // actually we want the definition, not the word itself
    word = word.substring(1);
    url = sprintf('/definition/%s.mp3',word.toLowerCase());
  }
  playSoundList( [ url ], 0, function(){
    callback();
  });
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

export const listWordsFromGFParagraph = function( arg ){

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

  let p = formatGFParagraph( arg );
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

const lettersEtc = "abcdefghijklmnopqrstuvwxya'";
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
