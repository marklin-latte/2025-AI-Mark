import { Schema, model, Document } from "mongoose";

export interface ILearningRecord extends Document {
  _id: string;
  youLearned: string;
  yourOutput: string;
  feedback: string;
  afterThoughtQuestions: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

const LearningRecordSchema = new Schema<ILearningRecord>(
  {
    youLearned: {
      type: String,
      required: true,
    },
    yourOutput: {
      type: String,
      required: true,
    },
    feedback: {
      type: String,
      required: true,
    },
    afterThoughtQuestions: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const LearningRecord = model<ILearningRecord>(
  "LearningRecord",
  LearningRecordSchema
);
