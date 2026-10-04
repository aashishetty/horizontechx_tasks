const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
{
title: {
type: String,
required: true,
trim: true
},
    description: {
        type: String,
        default: "",
        trim: true
    },

    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    status: {
        type: String,
        enum: ["To Do", "In Progress", "Completed"],
        default: "To Do"
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },

    dueDate: {
        type: Date,
        default: null
    },

    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
},
{
    timestamps: true
}

);

module.exports = mongoose.model("Task", taskSchema);

