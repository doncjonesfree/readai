import { GatherFacts, GatherFactsAnswers, DrawConclusions } from '/imports/db/Collections';
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: Meteor.settings.openapi
});

export const getKeywords = function( callback ){
  let retObj = { success: true, message: 'not yet implemented' };

  retObj.GatherFacts = GatherFacts.find({},{ sort: { GradeLevel: 1 }}).fetch();
  callback( retObj );
};

export async function openAiWordDef( word, callback ) {
  let results = await openAiWordDef2( word );
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

async function openAiWordDef2( word ) {

  // const prompt = `I am a highly intelligent question answering bot. If you ask me a question that is rooted in truth, I will give you the answer. If you ask me a question that is nonsense, trickery, or has no clear answer, I will respond with \"Unknown\".\n\nQ: What is human life expectancy in the United States?\nA: Human life expectancy in the United States is 78 years.\n\nQ: Who was president of the United States in 1955?\nA: Dwight D. Eisenhower was president of the United States in 1955.\n\nQ: Which party did he belong to?\nA: He belonged to the Republican Party.\n\nQ: What is the square root of banana?\nA: Unknown\n\nQ: How does a telescope work?\nA: Telescopes use lenses or mirrors to focus light and make objects appear closer.\n\nQ: Where were the 1992 Olympics held?\nA: The 1992 Olympics were held in Barcelona, Spain.\n\nQ: How many squigs are in a bonk?\nA: Unknown\n\nQ: Where is the Valley of Kings?\nA:`;

  try {
    const openai = new OpenAIApi(configuration);
    const prompt = sprintf('Q: Can you define the word %s suitable for a small child without using the word %s in the definition?\nA:\nA:',word,word);
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
      console.log('Error in openAiWordDef2 word=%s status=%s',word,e.response.status);
      return e.response;
    }
    if ( e && e.response ) return e.response;
    return { status: 999, statusText: 'Unknown error' };
  }
};


// export const openAiWordDefOLD = function( word, callback ){
//
//   // const prompt = `I am a highly intelligent question answering bot. If you ask me a question that is rooted in truth, I will give you the answer. If you ask me a question that is nonsense, trickery, or has no clear answer, I will respond with \"Unknown\".\n\nQ: What is human life expectancy in the United States?\nA: Human life expectancy in the United States is 78 years.\n\nQ: Who was president of the United States in 1955?\nA: Dwight D. Eisenhower was president of the United States in 1955.\n\nQ: Which party did he belong to?\nA: He belonged to the Republican Party.\n\nQ: What is the square root of banana?\nA: Unknown\n\nQ: How does a telescope work?\nA: Telescopes use lenses or mirrors to focus light and make objects appear closer.\n\nQ: Where were the 1992 Olympics held?\nA: The 1992 Olympics were held in Barcelona, Spain.\n\nQ: How many squigs are in a bonk?\nA: Unknown\n\nQ: Where is the Valley of Kings?\nA:`;
//
//   const openai = new OpenAIApi(configuration);
//   const prompt = sprintf('Q: Can you define the word %s suitable for a small child without using the word %s in the definition?\nA:\nA:',word,word);
//   // const prompt = '\nQ: What is human life expectancy in the United States?\nA:';
//   try {
//     console.log('jones15',word);
//     openai.createCompletion({
//       model: "text-davinci-003",
//       prompt: prompt,
//       temperature: 0,
//       max_tokens: 100,
//       top_p: 1,
//       frequency_penalty: 0.0,
//       presence_penalty: 0.0,
//       stop: ["\n"],
//     })
//     .then(response => {
//       console.log('jones27',typeof(response),response);
//       callback( response.data );
//     })
//   } catch(e){
//     console.log('jones29 error openAiWordDef',e);
//     callback ( { error: sprintf('Error in word %s',word)})
//   }
// };
