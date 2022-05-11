import { Mongo } from 'meteor/mongo';

export const TasksCollection = new Mongo.Collection('tasks');
export const GatherFacts = new Mongo.Collection('gather_facts');
