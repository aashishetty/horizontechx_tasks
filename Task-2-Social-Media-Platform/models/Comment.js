const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true
        },

        content: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Comment", commentSchema);