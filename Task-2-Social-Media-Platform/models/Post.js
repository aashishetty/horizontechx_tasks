const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },

    content: {
        type: String,
        required: true,
        trim: true
    },

    photo: {
        type: String,
        default: ""
    },

    location: {
        type: String,
        default: ""
    },

    feeling: {
        type: String,
        default: ""
    },

    likes: {
        type: Number,
        default: 0
    },

    likedBy: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Post", postSchema);