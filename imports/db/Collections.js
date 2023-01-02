import { Mongo } from 'meteor/mongo';

export const WordPoints = new Mongo.Collection('word_points'); // points awarded for knowing words 
export const Definitions = new Mongo.Collection('definitions'); // definitions from OpenAI
export const WordList = new Mongo.Collection('word_list'); // study words
export const LessonHistory = new Mongo.Collection('lesson_history');
export const Students = new Mongo.Collection('students');
export const TasksCollection = new Mongo.Collection('tasks');
export const GatherFacts = new Mongo.Collection('gather_facts');
export const GatherFactsAnswers = new Mongo.Collection('gather_facts_answers');
export const DrawConclusions = new Mongo.Collection('draw_conclusions');
export const PowerBuilder = new Mongo.Collection('power_builder');
export const AudioFiles = new Mongo.Collection('audio_files');
export const Users = new Mongo.Collection('read_users');
