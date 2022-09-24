/*

https://blaze-tutorial.meteor.com/simple-todos/01-creating-app.html
https://blaze-tutorial.meteor.com/simple-todos/02-collections.html
https://blaze-tutorial.meteor.com/simple-todos/03-forms-and-events.html
https://blaze-tutorial.meteor.com/simple-todos/04-update-and-remove.html
https://blaze-tutorial.meteor.com/simple-todos/05-styles.html
https://blaze-tutorial.meteor.com/simple-todos/06-filter-tasks.html
https://blaze-tutorial.meteor.com/simple-todos/07-adding-user-accounts.html
https://blaze-tutorial.meteor.com/simple-todos/08-methods.html
https://blaze-tutorial.meteor.com/simple-todos/09-publications.html
https://blaze-tutorial.meteor.com/simple-todos/10-running-on-mobile.html

*/

meteor add dev-error-overlay
meteor add reactive-dict
meteor add accounts-password
meteor npm install --save bcrypt
meteor remove insecure
meteor remove autopublish
meteor add-platform ios (meteor run ios) - skipped
meteor add-platform android (meteor run android) skipped
meteor add meteortesting:mocha
meteor npm install --save-dev chai

To run test:
TEST_WATCH=1 meteor test --driver-package meteortesting:mocha

meteor add quave:testing

https://guide.meteor.com/testing.html - more info on meteor testing

https://www.youtube.com/watch?v=rwLoviLzG6s - auto scaling video
https://cloud-guide.meteor.com/triggers.html - auto scaling documentation

meteor add ostrio:flow-router-extra -- https://guide.meteor.com/routing.html#client-side
meteor add kadira:blaze-layout - to go to route
meteor add session
meteor add liyu:sprintfjs

meteor add fetch -- replaces https

meteor add bojicas:howler2 -- to play audio files -- https://github.com/goldfire/howler.js/tree/2.0

// Look at google api text to speech - see if that is a solution
https://www.youtube.com/watch?v=HSuwhalBGx0 - video on how to use it for npm
https://www.npmjs.com/package/@google-cloud/text-to-speech - npm
npm docs say: npm i @google-cloud/text-to-speech
I used: meteor npm install --save @google-cloud/text-to-speech

meteor add pauldowman:dotenv - store store things in environment variables, docs: https://atmospherejs.com/pauldowman/dotenv

meteor add momentjs:moment
meteor add mrt:moment-timezone

meteor add ostrio:cookies -- https://atmospherejs.com/ostrio/cookies
