export const formatGFParagraph = function( arg ){
  let p = arg;
  const first = p.trim().split(' ')[0];
  const special = '@@@';
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
    p = addDivsForLongerWords(p);
    p = p.replace(/@@@/g,'<br><br>');
    return p;
  } else {
    return addDivsForLongerWords(p);
  }
};

export const listWordsFromGFParagraph = function( arg ){
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
      word = word.join('').toLowerCase();
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

export const addDivsForLongerWords = function(arg){
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

  const breakUpWord = function(w){
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
  let p = arg.replace(/\n/g,' ');
  let list = p.split(' ');
  let op = [];
  for ( let i=0; i < list.length; i++ ) {
    let w = list[i];
    let obj = breakUpWord(w);
    if ( obj.word.length >= 2 ) {
      if ( obj.word ) {
        op.push(sprintf('%s<div class="lesson_word">%s</div>%s',obj.before,obj.word,obj.after));
      } else {
        op.push(obj.before);
      }
    } else {
      op.push(w);
    }
  }
  return op.join('&nbsp;');
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
