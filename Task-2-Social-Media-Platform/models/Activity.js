const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },

    actorUsername: {
        type: String,
        required: true,
        lowercase: true
    },

    targetUsername: {
        type: String,
        default: "",
        lowercase: true
    },

    postId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    text: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports =
    mongoose.models.Activity || mongoose.model("Activity", activitySchema);