const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true
        },

        completed: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: true
    }
);


const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        goal: {
            type: String,
            default: "",
            trim: true
        },

        category: {
            type: String,
            required: true,
            enum: [
                "College",
                "Work",
                "Personal",
                "Other"
            ]
        },

        priority: {
            type: String,
            required: true,
            enum: [
                "Low",
                "Medium",
                "High"
            ]
        },

        status: {
            type: String,
            required: true,
            enum: [
                "Planning",
                "In Progress",
                "On Hold",
                "Completed"
            ]
        },

        startDate: {
            type: Date,
            default: null
        },

        dueDate: {
            type: Date,
            default: null
        },

        checklist: {
            type: [checklistItemSchema],
            default: []
        },

        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        color: {
            type: String,
            default: "#7c3aed"
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },

    {
        timestamps: true
    }
);


module.exports =
    mongoose.model(
        "Project",
        projectSchema
    );
