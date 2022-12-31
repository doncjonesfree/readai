import { GatherFacts, GatherFactsAnswers, DrawConclusions } from '/imports/db/Collections';
import * as lib from '../imports/api/lib';

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: Meteor.settings.openapi
});

export const getHardestWords = function( text, callback ){
  let retObj = { text: text };

  const trim = function(s){
    if ( typeof(s) === 'object' && s.txt ) {
      return s.txt.trim().replace('.',',');
    } else if ( typeof(trim) === 'string' && trim.length > 0 ) {
      return s.trim().replace('.',',');
    }
    return s;
  };

  const combine = function(){
    let obj = {};

    const process = function(list){
      for ( let i=0; i < list.length; i++ ) {
        const l = list[i].toLowerCase().trim();
        const words = l.split(' ');
        for ( let i2=0; i2 < words.length; i2++ ) {
          const w = words[i2];
          if ( ! obj[w] ) obj[w] = true;
        }
      }
    };

    process( retObj.response1.split(',') );
    process( retObj.response2.split(',') );
    let op = [];
    for ( let w in obj ) {
      if ( lib.hasOwnProperty(obj,w)){
        if ( w ) op.push( { word: w, length: w.length } );
      }
    }
    // put the longer words first
    op.sort(function(a,b){
      if ( a.length > b.length ) return -1;
      if ( a.length < b.length ) return 1;
      return 0;
    });
    let op2 = [];
    for ( let i=0; i < op.length; i++ ) {
      op2.push( op[i].word );
    }
    return op2;
  };

  const prompt = sprintf('Q: Please isolate the key words in the following "%s"\nA:\nA:',text);
  retObj.prompt = prompt;
  openAiQuestion( prompt, function(response){
    retObj.response1 = trim(response);

    const prompt2 = sprintf('Q: Please isolate the 5 hardest words in the following "%s"\nA:\nA:',text);
    retObj.prompt2 = prompt2;
    openAiQuestion( prompt2, function(response2){
      retObj.response2 = trim(response2);
      retObj.response = combine();
      callback( retObj.response );
    });
  });
};

export const getKeywords = function( callback ){
  let retObj = { success: true, message: 'not yet implemented' };

  retObj.GatherFacts = GatherFacts.find({},{ sort: { GradeLevel: 1 }}).fetch();
  callback( retObj );
};

export async function openAiQuestion( prompt, callback ) {
  let results = await openAiQuestion2( prompt );
  let retObj = { txt: '' };
  if ( results && results.data && results.data.choices && results.data.choices.length > 0 ) {
    retObj.txt = results.data.choices[0].text;
    if ( ! retObj.txt ) {
      retObj.error = 8888;
      retObj.errorText = 'No result for some reason';
    }
  } else {
    retObj.error = results.status;
    retObj.errorText = results.statusText;
  }
  callback( retObj );
};

async function openAiQuestion2( prompt ) {

  // const prompt = `I am a highly intelligent question answering bot. If you ask me a question that is rooted in truth, I will give you the answer. If you ask me a question that is nonsense, trickery, or has no clear answer, I will respond with \"Unknown\".\n\nQ: What is human life expectancy in the United States?\nA: Human life expectancy in the United States is 78 years.\n\nQ: Who was president of the United States in 1955?\nA: Dwight D. Eisenhower was president of the United States in 1955.\n\nQ: Which party did he belong to?\nA: He belonged to the Republican Party.\n\nQ: What is the square root of banana?\nA: Unknown\n\nQ: How does a telescope work?\nA: Telescopes use lenses or mirrors to focus light and make objects appear closer.\n\nQ: Where were the 1992 Olympics held?\nA: The 1992 Olympics were held in Barcelona, Spain.\n\nQ: How many squigs are in a bonk?\nA: Unknown\n\nQ: Where is the Valley of Kings?\nA:`;

  try {
    const openai = new OpenAIApi(configuration);
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: ["\n"],
    });
    return response;
  } catch(e){
    if ( e && e.response && e.response.status ) {
      console.log('Error in openAiQuestion2 status=%s',e.response.status);
      return e.response;
    }
    if ( e && e.response ) return e.response;
    return { status: 999, statusText: 'Unknown error' };
  }
};
