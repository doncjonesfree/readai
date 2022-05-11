import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { TasksCollection, GatherFacts } from '/imports/db/Collections';
import '/imports/api/tasksMethods';
import '/imports/api/tasksPublications';

const insertTask = ( taskText, user ) => TasksCollection.insert({
   text: taskText,
   userId: user._id,
   createdAt: new Date(),
 });

const SEED_USERNAME = 'meteorite';
const SEED_PASSWORD = 'password';

Meteor.startup(() => {
  if (!Accounts.findUserByUsername(SEED_USERNAME)) {
    Accounts.createUser({
      username: SEED_USERNAME,
      password: SEED_PASSWORD,
    });
  }

  const user = Accounts.findUserByUsername(SEED_USERNAME);

  if (TasksCollection.find().count() === 0) {
    [
      'First Task',
      'Second Task',
      'Third Task',
      'Fourth Task',
      'Fifth Task',
      'Sixth Task',
      'Seventh Task'
    ].forEach(taskText => insertTask(taskText, user))
  }

  loadGatherFacts();

});

const loadGatherFacts = function(){
  // If not defined - create gather facts collection
  console.log('jones44',GatherFacts.find().count());
};
