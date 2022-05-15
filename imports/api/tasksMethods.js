import { check } from 'meteor/check';
import { TasksCollection, GatherFacts, GatherFactsAnswers } from '/imports/db/Collections';

Meteor.methods({
  'loadGatherFacts'() {
    let retObj = {};
    retObj.GatherFacts = GatherFacts.find().fetch();
    retObj.GatherFactsAnswers = GatherFactsAnswers.find().fetch();
    return retObj;
  },

  'tasks.remove'(taskId) {
    check(taskId, String);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    const task = TasksCollection.remove(taskId);

    if ( ! task ) {
      throw new Meteor.Error('Access Denied');
    }
  },

  'tasks.setIsChecked'(taskId, isChecked) {
    check(taskId, String);
    check(isChecked, Boolean);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    const task = TasksCollection.findOne({ _id: taskId, userId: this.userId });

    if ( ! task ) {
      throw new Meteor.Error('Access Denied');
    }

    TasksCollection.update(taskId, {
      $set: {
        isChecked
      }
    });
  }
});
