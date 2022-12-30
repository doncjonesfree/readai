//const axios = require('axios');
import axios, {isCancel, AxiosError} from 'axios';

export async function getAssemblyAIToken( callback ) {
  try {
    const response = await axios.post('https://api.assemblyai.com/v2/realtime/token', // use account token to get a temp user token
      { expires_in: 3600 }, // can set a TTL timer in seconds.
      { headers: { authorization: Meteor.settings.AssemblyAI } });
    const { data } = response;
    callback( data );
  } catch (error) {
    callback( error );
  }
};
