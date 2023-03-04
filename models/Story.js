const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const StorySchema = new Schema(
  {
    title: String,
    description: String,
    storyBody: String,
    storyEnd: String,
    image: String,
    author: {type:Schema.Types.ObjectId, ref: 'User'},
  },
  {
    timestamps: true,
  }
);

const StoryModel = model('Story', StorySchema);

module.exports = StoryModel;
