const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");

const User = require("./models/User");
const Project = require("./models/Project");
const Task = require("./models/Task");
const Comment = require("./models/Comment");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ========================================
// DATABASE CONNECTION
// ========================================

async function connectDatabase() {

    try {

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB connected successfully"
        );

    } catch (error) {

        console.error(
            "MongoDB connection failed:"
        );

        console.error(
            error.message
        );

        process.exit(1);

    }

}


// ========================================
// HEALTH CHECK
// ========================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            message:
                "TaskFlow API is running 🚀"

        });

    }
);

// ========================================
// USER ROUTES
// ========================================

// ========================================
// GET USERS
// Used by task assignment dropdown
// ========================================

app.get(
    "/api/users",
    async (req, res) => {

        try {

            const users =
                await User.find({})
                    .select("name username avatar")
                    .sort({
                        name: 1
                    });

            res.json({

                success: true,

                users

            });

        } catch (error) {

            console.error(
                "Get users error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load users."

            });

        }

    }
);


// ========================================
// PROJECT ROUTES
// ========================================


// ========================================
// CREATE PROJECT
// ========================================

app.post(
    "/api/projects",
    async (req, res) => {

        try {

            const {
                name,
                description,
                goal,
                category,
                priority,
                status,
                startDate,
                dueDate,
                checklist,
                color,
                owner
            } = req.body;


            // --------------------------------
            // REQUIRED FIELDS
            // --------------------------------

            if (
                !name ||
                !description ||
                !category ||
                !priority ||
                !status ||
                !owner
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill in all required project fields."

                });

            }


            // --------------------------------
            // FIND OWNER
            // --------------------------------

            const user =
                await User.findById(owner);


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Project owner not found."

                });

            }


            // --------------------------------
            // CLEAN CHECKLIST
            // --------------------------------

            const cleanChecklist =
                Array.isArray(checklist)

                    ? checklist
                        .filter(
                            item =>
                                item &&
                                typeof item.text === "string" &&
                                item.text.trim()
                        )
                        .map(
                            item => ({

                                text:
                                    item.text.trim(),

                                completed:
                                    Boolean(
                                        item.completed
                                    )

                            })
                        )

                    : [];


            // --------------------------------
            // AUTOMATIC PROGRESS
            // --------------------------------

            const completedItems =
                cleanChecklist.filter(
                    item =>
                        item.completed
                ).length;


            const projectProgress =
                cleanChecklist.length === 0

                    ? 0

                    : Math.round(
                        (
                            completedItems /
                            cleanChecklist.length
                        ) * 100
                    );


            // --------------------------------
            // CREATE PROJECT
            // --------------------------------

            const project =
                await Project.create({

                    name:
                        name.trim(),

                    description:
                        description.trim(),

                    goal:
                        typeof goal === "string"
                            ? goal.trim()
                            : "",

                    category:
                        category,

                    priority:
                        priority,

                    status:
                        status,

                    startDate:
                        startDate || null,

                    dueDate:
                        dueDate || null,

                    checklist:
                        cleanChecklist,

                    progress:
                        projectProgress,

                    color:
                        color || "#7c3aed",

                    owner:
                        user._id,

                    members: [
                        user._id
                    ]

                });


            // --------------------------------
            // ADD PROJECT TO USER
            // --------------------------------

            await User.findByIdAndUpdate(

                user._id,

                {

                    $addToSet: {

                        projects:
                            project._id

                    }

                }

            );


            // --------------------------------
            // RETURN POPULATED PROJECT
            // --------------------------------

            const populatedProject =
                await Project.findById(
                    project._id
                )

                .populate(
                    "owner",
                    "name username avatar"
                )

                .populate(
                    "members",
                    "name username avatar"
                );


            res.status(201).json({

                success: true,

                message:
                    "Project created successfully.",

                project:
                    populatedProject

            });


        } catch (error) {

            console.error(
                "Create project error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Could not create project."

            });

        }

    }
);


// ========================================
// GET ALL PROJECTS FOR USER
// ========================================

app.get(
    "/api/projects/user/:userId",
    async (req, res) => {

        try {

            const projects =
                await Project.find({

                    members:
                        req.params.userId

                })

                .populate(
                    "owner",
                    "name username avatar"
                )

                .populate(
                    "members",
                    "name username avatar"
                )

                .sort({

                    createdAt: -1

                });


            res.json({

                success: true,

                projects

            });


        } catch (error) {

            console.error(
                "Get projects error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load projects."

            });

        }

    }
);


// ========================================
// GET SINGLE PROJECT
// ========================================

app.get(
    "/api/projects/:projectId",
    async (req, res) => {

        try {

            const project =
                await Project.findById(
                    req.params.projectId
                )

                .populate(
                    "owner",
                    "name username avatar"
                )

                .populate(
                    "members",
                    "name username avatar"
                );


            if (!project) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Project not found."

                });

            }


            res.json({

                success: true,

                project

            });


        } catch (error) {

            console.error(
                "Get project error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load project."

            });

        }

    }
);


// ========================================
// UPDATE PROJECT
// ========================================

app.put(
    "/api/projects/:projectId",
    async (req, res) => {

        try {

            const {
                name,
                description,
                goal,
                category,
                priority,
                status,
                startDate,
                dueDate,
                checklist,
                color
            } = req.body;


            const updateData = {};


            // --------------------------------
            // PROJECT NAME
            // --------------------------------

            if (
                name !== undefined
            ) {

                if (
                    typeof name !== "string" ||
                    !name.trim()
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Project name cannot be empty."

                    });

                }


                updateData.name =
                    name.trim();

            }


            // --------------------------------
            // PROJECT DESCRIPTION
            // --------------------------------

            if (
                description !== undefined
            ) {

                if (
                    typeof description !== "string" ||
                    !description.trim()
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Project description cannot be empty."

                    });

                }


                updateData.description =
                    description.trim();

            }


            // --------------------------------
            // PROJECT GOAL
            // --------------------------------

            if (goal !== undefined) {

                updateData.goal =
                    typeof goal === "string"
                        ? goal.trim()
                        : "";

            }


            // --------------------------------
            // CATEGORY
            // --------------------------------

            if (
                category !== undefined
            ) {

                updateData.category =
                    category;

            }


            // --------------------------------
            // PRIORITY
            // --------------------------------

            if (
                priority !== undefined
            ) {

                updateData.priority =
                    priority;

            }


            // --------------------------------
            // STATUS
            // --------------------------------

            if (
                status !== undefined
            ) {

                updateData.status =
                    status;

            }


            // --------------------------------
            // START DATE
            // --------------------------------

            if (
                startDate !== undefined
            ) {

                updateData.startDate =
                    startDate || null;

            }


            // --------------------------------
            // DUE DATE
            // --------------------------------

            if (
                dueDate !== undefined
            ) {

                updateData.dueDate =
                    dueDate || null;

            }


            // --------------------------------
            // PROJECT TO-DO LIST
            // --------------------------------

            if (
                checklist !== undefined
            ) {

                const cleanChecklist =
                    Array.isArray(checklist)

                        ? checklist
                            .filter(
                                item =>
                                    item &&
                                    typeof item.text === "string" &&
                                    item.text.trim()
                            )
                            .map(
                                item => ({

                                    _id:
                                        item._id,

                                    text:
                                        item.text.trim(),

                                    completed:
                                        Boolean(
                                            item.completed
                                        )

                                })
                            )

                        : [];


                const completedItems =
                    cleanChecklist.filter(
                        item =>
                            item.completed
                    ).length;


                const projectProgress =
                    cleanChecklist.length === 0

                        ? 0

                        : Math.round(
                            (
                                completedItems /
                                cleanChecklist.length
                            ) * 100
                        );


                updateData.checklist =
                    cleanChecklist;


                updateData.progress =
                    projectProgress;

            }


            // --------------------------------
            // COLOR
            // --------------------------------

            if (
                color !== undefined
            ) {

                updateData.color =
                    color;

            }


            // --------------------------------
            // UPDATE DATABASE
            // --------------------------------

            const project =
                await Project.findByIdAndUpdate(

                    req.params.projectId,

                    updateData,

                    {

                        new: true,

                        runValidators: true

                    }

                )

                .populate(
                    "owner",
                    "name username avatar"
                )

                .populate(
                    "members",
                    "name username avatar"
                );


            if (!project) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Project not found."

                });

            }


            // --------------------------------
            // RETURN UPDATED PROJECT
            // --------------------------------

            res.json({

                success: true,

                message:
                    "Project updated successfully.",

                project

            });


        } catch (error) {

            console.error(
                "Update project error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Could not update project."

            });

        }

    }
);


// ========================================
// UPDATE PROJECT TO-DO LIST
// ========================================

app.put(
    "/api/projects/:projectId/checklist",
    async (req, res) => {

        try {

            const {
                checklist
            } = req.body;


            if (
                !Array.isArray(checklist)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Project To-Do List must be an array."

                });

            }


            // --------------------------------
            // CLEAN TO-DO LIST
            // --------------------------------

            const cleanChecklist =
                checklist
                    .filter(
                        item =>
                            item &&
                            typeof item.text === "string" &&
                            item.text.trim()
                    )
                    .map(
                        item => ({

                            _id:
                                item._id,

                            text:
                                item.text.trim(),

                            completed:
                                Boolean(
                                    item.completed
                                )

                        })
                    );


            // --------------------------------
            // CALCULATE PROGRESS
            // --------------------------------

            const completedItems =
                cleanChecklist.filter(
                    item =>
                        item.completed
                ).length;


            const progress =
                cleanChecklist.length === 0

                    ? 0

                    : Math.round(
                        (
                            completedItems /
                            cleanChecklist.length
                        ) * 100
                    );


            // --------------------------------
            // UPDATE PROJECT
            // --------------------------------

            const project =
                await Project.findByIdAndUpdate(

                    req.params.projectId,

                    {

                        checklist:
                            cleanChecklist,

                        progress:
                            progress

                    },

                    {

                        new: true,

                        runValidators: true

                    }

                )

                .populate(
                    "owner",
                    "name username avatar"
                )

                .populate(
                    "members",
                    "name username avatar"
                );


            if (!project) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Project not found."

                });

            }


            res.json({

                success: true,

                message:
                    "Project To-Do List updated successfully.",

                project

            });


        } catch (error) {

            console.error(
                "To-Do List update error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not update Project To-Do List."

            });

        }

    }
);
// ========================================
// ADD MEMBER TO PROJECT
// ========================================

app.post(
    "/api/projects/:projectId/members",
    async (req, res) => {

        try {

            const {
                userId
            } = req.body;


            if (!userId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User ID is required."

                });

            }


            const user =
                await User.findById(
                    userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const project =
                await Project.findByIdAndUpdate(

                    req.params.projectId,

                    {

                        $addToSet: {

                            members:
                                user._id

                        }

                    },

                    {

                        new: true

                    }

                )

                .populate(
                    "owner",
                    "name username avatar"
                )

                .populate(
                    "members",
                    "name username avatar"
                );


            if (!project) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Project not found."

                });

            }


            await User.findByIdAndUpdate(

                user._id,

                {

                    $addToSet: {

                        projects:
                            project._id

                    }

                }

            );


            res.json({

                success: true,

                message:
                    "Member added successfully.",

                project

            });


        } catch (error) {

            console.error(
                "Add member error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not add member."

            });

        }

    }
);


// ========================================
// DELETE PROJECT
// ========================================

app.delete(
    "/api/projects/:projectId",
    async (req, res) => {

        try {

            const project =
                await Project.findById(
                    req.params.projectId
                );


            if (!project) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Project not found."

                });

            }


            // --------------------------------
            // FIND PROJECT TASKS
            // --------------------------------

            const projectTasks =
                await Task.find({

                    project:
                        project._id

                }).select("_id");


            const taskIds =
                projectTasks.map(
                    task => task._id
                );


            // --------------------------------
            // DELETE COMMENTS
            // --------------------------------

            if (
                taskIds.length > 0
            ) {

                await Comment.deleteMany({

                    task: {
                        $in:
                            taskIds
                    }

                });

            }


            // --------------------------------
            // DELETE TASKS
            // --------------------------------

            await Task.deleteMany({

                project:
                    project._id

            });


            // --------------------------------
            // DELETE PROJECT
            // --------------------------------

            await Project.findByIdAndDelete(

                project._id

            );


            // --------------------------------
            // REMOVE FROM USERS
            // --------------------------------

            await User.updateMany(

                {

                    projects:
                        project._id

                },

                {

                    $pull: {

                        projects:
                            project._id

                    }

                }

            );


            res.json({

                success: true,

                message:
                    "Project deleted successfully."

            });


        } catch (error) {

            console.error(
                "Delete project error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not delete project."

            });

        }

    }
);


// ========================================
// AUTHENTICATION ROUTES
// ========================================


// ========================================
// REGISTER
// ========================================

app.post(
    "/api/auth/register",
    async (req, res) => {

        try {

            const {
                name,
                username,
                email,
                password
            } = req.body;


            if (
                !name ||
                !username ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please fill in all fields."

                });

            }


            const cleanName =
                name.trim();


            const cleanUsername =
                username
                    .trim()
                    .toLowerCase();


            const cleanEmail =
                email
                    .trim()
                    .toLowerCase();


            const existingUsername =
                await User.findOne({

                    username:
                        cleanUsername

                });


            if (existingUsername) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Username already exists."

                });

            }


            const existingEmail =
                await User.findOne({

                    email:
                        cleanEmail

                });


            if (existingEmail) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const user =
                await User.create({

                    name:
                        cleanName,

                    username:
                        cleanUsername,

                    email:
                        cleanEmail,

                    password:
                        hashedPassword

                });


            res.status(201).json({

                success: true,

                message:
                    "Registration successful.",

                user: {

                    id:
                        user._id,

                    name:
                        user.name,

                    username:
                        user.username,

                    email:
                        user.email

                }

            });


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not create your account."

            });

        }

    }
);


// ========================================
// LOGIN
// ========================================

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const {
                identifier,
                password
            } = req.body;


            if (
                !identifier ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter your username/email and password."

                });

            }


            const cleanIdentifier =
                identifier
                    .trim()
                    .toLowerCase();


            const user =
                await User.findOne({

                    $or: [

                        {
                            username:
                                cleanIdentifier
                        },

                        {
                            email:
                                cleanIdentifier
                        }

                    ]

                });


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid username/email or password."

                });

            }


            const passwordMatches =
                await bcrypt.compare(

                    password,

                    user.password

                );


            if (!passwordMatches) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid username/email or password."

                });

            }


            res.json({

                success: true,

                message:
                    "Login successful.",

                user: {

                    id:
                        user._id,

                    name:
                        user.name,

                    username:
                        user.username,

                    email:
                        user.email

                }

            });


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not log you in."

            });

        }

    }
);


// ========================================
// TASK ROUTES
// ========================================


// ========================================
// CREATE TASK
// ========================================

app.post(
    "/api/tasks",
    async (req, res) => {

        try {

            const {
                title,
                description,
                project,
                assignedTo,
                createdBy,
                priority,
                dueDate
            } = req.body;


            if (
                !title ||
                !project ||
                !createdBy
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Task title, project and creator are required."

                });

            }


            const projectExists =
                await Project.findById(
                    project
                );


            if (!projectExists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Project not found."

                });

            }


            const creator =
                await User.findById(
                    createdBy
                );


            if (!creator) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Creator not found."

                });

            }


            const task =
                await Task.create({

                    title:
                        title.trim(),

                    description:
                        description
                            ? description.trim()
                            : "",

                    project,

                    assignedTo:
                        assignedTo || null,

                    createdBy,

                    priority:
                        priority || "Medium",

                    dueDate:
                        dueDate || null

                });


            const populatedTask =
                await Task.findById(
                    task._id
                )

                .populate(
                    "project",
                    "name"
                )

                .populate(
                    "assignedTo",
                    "name username avatar"
                )

                .populate(
                    "createdBy",
                    "name username avatar"
                );


            res.status(201).json({

                success: true,

                message:
                    "Task created successfully.",

                task:
                    populatedTask

            });


        } catch (error) {

            console.error(
                "Create task error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not create task."

            });

        }

    }
);


// ========================================
// GET USER TASKS
// ========================================

app.get(
    "/api/tasks/user/:userId",
    async (req, res) => {

        try {

            const tasks =
                await Task.find({

                    $or: [

                        {
                            createdBy:
                                req.params.userId
                        },

                        {
                            assignedTo:
                                req.params.userId
                        }

                    ]

                })

                .populate(
                    "project",
                    "name"
                )

                .populate(
                    "assignedTo",
                    "name username avatar"
                )

                .populate(
                    "createdBy",
                    "name username avatar"
                )

                .sort({

                    createdAt: -1

                });


            res.json({

                success: true,

                tasks

            });


        } catch (error) {

            console.error(
                "Get user tasks error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load tasks."

            });

        }

    }
);


// ========================================
// GET PROJECT TASKS
// ========================================

app.get(
    "/api/tasks/project/:projectId",
    async (req, res) => {

        try {

            const tasks =
                await Task.find({
                    project:
                        req.params.projectId
                })
                .populate(
                    "assignedTo",
                    "name username avatar"
                )
                .populate(
                    "createdBy",
                    "name username avatar"
                )
                .sort({
                    createdAt: -1
                });

            res.json({
                success: true,
                tasks
            });

        } catch (error) {

            console.error(
                "Get project tasks error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not load project tasks."
            });

        }

    }
);


// ========================================
// TASK STATISTICS
// ========================================

app.get(
    "/api/tasks/stats/:userId",
    async (req, res) => {

        try {

            const tasks =
                await Task.find({
                    createdBy:
                        req.params.userId
                });

            const total =
                tasks.length;

            const completed =
                tasks.filter(
                    task =>
                        task.status === "Completed"
                ).length;

            const active =
                tasks.filter(
                    task =>
                        task.status !== "Completed"
                ).length;

            const completionRate =
                total === 0
                    ? 0
                    : Math.round(
                        (
                            completed /
                            total
                        ) * 100
                    );

            res.json({

                success: true,

                stats: {
                    total,
                    active,
                    completed,
                    completionRate
                }

            });

        } catch (error) {

            console.error(
                "Task statistics error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load task statistics."

            });

        }

    }
);
// ========================================
// GET SINGLE TASK
// ========================================

app.get(
    "/api/tasks/:taskId",
    async (req, res) => {

        try {

            const task =
                await Task.findById(
                    req.params.taskId
                )

                .populate(
                    "project",
                    "name"
                )

                .populate(
                    "assignedTo",
                    "name username avatar"
                )

                .populate(
                    "createdBy",
                    "name username avatar"
                );


            if (!task) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            res.json({

                success: true,

                task

            });


        } catch (error) {

            console.error(
                "Get task error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load task."

            });

        }

    }
);
// ========================================
// COMMENT ROUTES
// ========================================

// GET COMMENTS FOR A TASK
app.get(
    "/api/comments/task/:taskId",
    async (req, res) => {

        try {

            const comments =
                await Comment.find({
                    task: req.params.taskId
                })
                .populate(
                    "author",
                    "name username avatar"
                )
                .sort({
                    createdAt: 1
                });

            res.json({
                success: true,
                comments
            });

        } catch (error) {

            console.error(
                "Get comments error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not load comments."
            });

        }

    }
);


// ADD COMMENT TO TASK
app.post(
    "/api/comments",
    async (req, res) => {

        try {

            const {
                text,
                task,
                author
            } = req.body;


            if (
                !text ||
                !task ||
                !author
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Comment text, task and author are required."
                });

            }


            const taskExists =
                await Task.findById(task);

            if (!taskExists) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });

            }


            const userExists =
                await User.findById(author);

            if (!userExists) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Author not found."
                });

            }


            const comment =
                await Comment.create({

                    text:
                        text.trim(),

                    task:
                        task,

                    author:
                        author

                });


            await Task.findByIdAndUpdate(

                task,

                {
                    $addToSet: {
                        comments:
                            comment._id
                    }
                }

            );


            const populatedComment =
                await Comment.findById(
                    comment._id
                )
                .populate(
                    "author",
                    "name username avatar"
                );


            res.status(201).json({

                success: true,

                message:
                    "Comment added successfully.",

                comment:
                    populatedComment

            });

        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not add comment."

            });

        }

    }
);

// ========================================
// UPDATE TASK
// ========================================

app.put(
    "/api/tasks/:taskId",
    async (req, res) => {

        try {

            const {
                title,
                description,
                project,
                assignedTo,
                status,
                priority,
                dueDate
            } = req.body;


            const updateData = {};


            if (title !== undefined) {

                if (
                    typeof title !== "string" ||
                    !title.trim()
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Task title cannot be empty."

                    });

                }

                updateData.title =
                    title.trim();

            }


            if (description !== undefined) {

                updateData.description =
                    typeof description === "string"
                        ? description.trim()
                        : "";

            }


            if (project !== undefined) {

                updateData.project =
                    project;

            }


            if (assignedTo !== undefined) {

                updateData.assignedTo =
                    assignedTo || null;

            }


            if (status !== undefined) {

                updateData.status =
                    status;

            }


            if (priority !== undefined) {

                updateData.priority =
                    priority;

            }


            if (dueDate !== undefined) {

                updateData.dueDate =
                    dueDate || null;

            }


            const task =
                await Task.findByIdAndUpdate(

                    req.params.taskId,

                    updateData,

                    {

                        new: true,

                        runValidators: true

                    }

                )

                .populate(
                    "project",
                    "name"
                )

                .populate(
                    "assignedTo",
                    "name username avatar"
                )

                .populate(
                    "createdBy",
                    "name username avatar"
                );


            if (!task) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            res.json({

                success: true,

                message:
                    "Task updated successfully.",

                task

            });


        } catch (error) {

            console.error(
                "Update task error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not update task."

            });

        }

    }
);


// ========================================
// DELETE TASK
// ========================================

app.delete(
    "/api/tasks/:taskId",
    async (req, res) => {

        try {

            const task =
                await Task.findById(
                    req.params.taskId
                );


            if (!task) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            await Comment.deleteMany({

                task:
                    task._id

            });


            await Task.findByIdAndDelete(

                task._id

            );


            res.json({

                success: true,

                message:
                    "Task deleted successfully."

            });


        } catch (error) {

            console.error(
                "Delete task error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not delete task."

            });

        }

    }
);

// ========================================
// TASK COMMENT ROUTES
// ========================================


// ========================================
// ADD COMMENT TO TASK
// ========================================

app.post(
    "/api/tasks/:taskId/comments",
    async (req, res) => {

        try {

            const {
                text,
                author
            } = req.body;


            // --------------------------------
            // REQUIRED FIELDS
            // --------------------------------

            if (
                !text ||
                !author
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Comment text and author are required."

                });

            }


            // --------------------------------
            // FIND TASK
            // --------------------------------

            const task =
                await Task.findById(
                    req.params.taskId
                );


            if (!task) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            // --------------------------------
            // FIND AUTHOR
            // --------------------------------

            const user =
                await User.findById(
                    author
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Author not found."

                });

            }


            // --------------------------------
            // CREATE COMMENT
            // --------------------------------

            const comment =
                await Comment.create({

                    text:
                        text.trim(),

                    task:
                        task._id,

                    author:
                        user._id

                });


            // --------------------------------
            // ADD COMMENT TO TASK
            // --------------------------------

            await Task.findByIdAndUpdate(

                task._id,

                {

                    $push: {

                        comments:
                            comment._id

                    }

                }

            );


            // --------------------------------
            // POPULATE COMMENT
            // --------------------------------

            const populatedComment =
                await Comment.findById(
                    comment._id
                )

                .populate(
                    "author",
                    "name username avatar"
                );


            res.status(201).json({

                success: true,

                message:
                    "Comment added successfully.",

                comment:
                    populatedComment

            });


        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not add comment."

            });

        }

    }
);


// ========================================
// GET TASK COMMENTS
// ========================================

app.get(
    "/api/tasks/:taskId/comments",
    async (req, res) => {

        try {

            const task =
                await Task.findById(
                    req.params.taskId
                );


            if (!task) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            const comments =
                await Comment.find({

                    task:
                        task._id

                })

                .populate(
                    "author",
                    "name username avatar"
                )

                .sort({

                    createdAt: 1

                });


            res.json({

                success: true,

                comments

            });


        } catch (error) {

            console.error(
                "Get comments error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load comments."

            });

        }

    }
);


// ========================================
// DELETE COMMENT
// ========================================

app.delete(
    "/api/comments/:commentId",
    async (req, res) => {

        try {

            const comment =
                await Comment.findById(
                    req.params.commentId
                );


            if (!comment) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Comment not found."

                });

            }


            // --------------------------------
            // REMOVE COMMENT FROM TASK
            // --------------------------------

            await Task.findByIdAndUpdate(

                comment.task,

                {

                    $pull: {

                        comments:
                            comment._id

                    }

                }

            );


            // --------------------------------
            // DELETE COMMENT
            // --------------------------------

            await Comment.findByIdAndDelete(

                comment._id

            );


            res.json({

                success: true,

                message:
                    "Comment deleted successfully."

            });


        } catch (error) {

            console.error(
                "Delete comment error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not delete comment."

            });

        }

    }
);
// ========================================
// TASK COMMENT ROUTES
// ========================================


// ========================================
// ADD COMMENT TO TASK
// ========================================

app.post(
    "/api/tasks/:taskId/comments",
    async (req, res) => {

        try {

            const {
                text,
                author
            } = req.body;


            if (
                !text ||
                !text.trim() ||
                !author
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Comment text and author are required."

                });

            }


            // --------------------------------
            // FIND TASK
            // --------------------------------

            const task =
                await Task.findById(
                    req.params.taskId
                );


            if (!task) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            // --------------------------------
            // FIND AUTHOR
            // --------------------------------

            const user =
                await User.findById(
                    author
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Author not found."

                });

            }


            // --------------------------------
            // CREATE COMMENT
            // --------------------------------

            const comment =
                await Comment.create({

                    text:
                        text.trim(),

                    task:
                        task._id,

                    author:
                        user._id

                });


            // --------------------------------
            // ADD COMMENT TO TASK
            // --------------------------------

            await Task.findByIdAndUpdate(

                task._id,

                {

                    $push: {

                        comments:
                            comment._id

                    }

                }

            );


            // --------------------------------
            // RETURN COMMENT
            // --------------------------------

            const populatedComment =
                await Comment.findById(
                    comment._id
                )

                .populate(
                    "author",
                    "name username avatar"
                );


            res.status(201).json({

                success: true,

                message:
                    "Comment added successfully.",

                comment:
                    populatedComment

            });


        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not add comment."

            });

        }

    }
);


// ========================================
// GET TASK COMMENTS
// ========================================

app.get(
    "/api/tasks/:taskId/comments",
    async (req, res) => {

        try {

            const task =
                await Task.findById(
                    req.params.taskId
                );


            if (!task) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            const comments =
                await Comment.find({

                    task:
                        task._id

                })

                .populate(
                    "author",
                    "name username avatar"
                )

                .sort({

                    createdAt: 1

                });


            res.json({

                success: true,

                comments

            });


        } catch (error) {

            console.error(
                "Get comments error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load comments."

            });

        }

    }
);


// ========================================
// DELETE COMMENT
// ========================================

app.delete(
    "/api/tasks/:taskId/comments/:commentId",
    async (req, res) => {

        try {

            const comment =
                await Comment.findOne({

                    _id:
                        req.params.commentId,

                    task:
                        req.params.taskId

                });


            if (!comment) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Comment not found."

                });

            }


            await Comment.findByIdAndDelete(

                comment._id

            );


            await Task.findByIdAndUpdate(

                req.params.taskId,

                {

                    $pull: {

                        comments:
                            comment._id

                    }

                }

            );


            res.json({

                success: true,

                message:
                    "Comment deleted successfully."

            });


        } catch (error) {

            console.error(
                "Delete comment error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not delete comment."

            });

        }

    }
);
// ========================================
// COMMENT ROUTES
// ========================================


// ========================================
// GET COMMENTS FOR TASK
// ========================================

app.get(
    "/api/comments/task/:taskId",
    async (req, res) => {

        try {

            const comments =
                await Comment.find({
                    task: req.params.taskId
                })

                .populate(
                    "author",
                    "name username avatar"
                )

                .sort({
                    createdAt: 1
                });


            res.json({

                success: true,

                comments

            });


        } catch (error) {

            console.error(
                "Get comments error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load comments."

            });

        }

    }
);


// ========================================
// ADD COMMENT
// ========================================

app.post(
    "/api/comments",
    async (req, res) => {

        try {

            const {
                text,
                task,
                author
            } = req.body;


            // --------------------------------
            // REQUIRED FIELDS
            // --------------------------------

            if (
                !text ||
                !task ||
                !author
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Comment text, task and author are required."

                });

            }


            // --------------------------------
            // CHECK TASK
            // --------------------------------

            const taskExists =
                await Task.findById(
                    task
                );


            if (!taskExists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            // --------------------------------
            // CHECK AUTHOR
            // --------------------------------

            const user =
                await User.findById(
                    author
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Author not found."

                });

            }


            // --------------------------------
            // CREATE COMMENT
            // --------------------------------

            const comment =
                await Comment.create({

                    text:
                        text.trim(),

                    task:
                        task,

                    author:
                        author

                });


            // --------------------------------
            // ADD COMMENT TO TASK
            // --------------------------------

            await Task.findByIdAndUpdate(

                task,

                {

                    $addToSet: {

                        comments:
                            comment._id

                    }

                }

            );


            // --------------------------------
            // POPULATE COMMENT
            // --------------------------------

            const populatedComment =
                await Comment.findById(
                    comment._id
                )

                .populate(
                    "author",
                    "name username avatar"
                );


            res.status(201).json({

                success: true,

                message:
                    "Comment added successfully.",

                comment:
                    populatedComment

            });


        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not add comment."

            });

        }

    }
);
// ========================================
// TASK COMMENT ROUTES
// ========================================


// ========================================
// ADD COMMENT TO TASK
// ========================================

app.post(
    "/api/comments",
    async (req, res) => {

        try {

            const {
                text,
                task,
                author
            } = req.body;


            // --------------------------------
            // REQUIRED FIELDS
            // --------------------------------

            if (
                !text ||
                !task ||
                !author
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Comment text, task and author are required."

                });

            }


            // --------------------------------
            // CHECK TASK
            // --------------------------------

            const existingTask =
                await Task.findById(task);


            if (!existingTask) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found."

                });

            }


            // --------------------------------
            // CHECK AUTHOR
            // --------------------------------

            const existingUser =
                await User.findById(author);


            if (!existingUser) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // --------------------------------
            // CREATE COMMENT
            // --------------------------------

            const comment =
                await Comment.create({

                    text:
                        text.trim(),

                    task:
                        task,

                    author:
                        author

                });


            // --------------------------------
            // ADD COMMENT TO TASK
            // --------------------------------

            await Task.findByIdAndUpdate(

                task,

                {

                    $push: {

                        comments:
                            comment._id

                    }

                }

            );


            // --------------------------------
            // POPULATE COMMENT
            // --------------------------------

            const populatedComment =
                await Comment.findById(
                    comment._id
                )

                .populate(
                    "author",
                    "name username avatar"
                );


            res.status(201).json({

                success: true,

                message:
                    "Comment added successfully.",

                comment:
                    populatedComment

            });


        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not add comment."

            });

        }

    }
);


// ========================================
// GET COMMENTS FOR TASK
// ========================================

app.get(
    "/api/comments/task/:taskId",
    async (req, res) => {

        try {

            const comments =
                await Comment.find({

                    task:
                        req.params.taskId

                })

                .populate(
                    "author",
                    "name username avatar"
                )

                .sort({

                    createdAt: 1

                });


            res.json({

                success: true,

                comments

            });


        } catch (error) {

            console.error(
                "Get comments error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not load comments."

            });

        }

    }
);


// ========================================
// DELETE COMMENT
// ========================================

app.delete(
    "/api/comments/:commentId",
    async (req, res) => {

        try {

            const comment =
                await Comment.findById(
                    req.params.commentId
                );


            if (!comment) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Comment not found."

                });

            }


            // --------------------------------
            // REMOVE COMMENT FROM TASK
            // --------------------------------

            await Task.findByIdAndUpdate(

                comment.task,

                {

                    $pull: {

                        comments:
                            comment._id

                    }

                }

            );


            // --------------------------------
            // DELETE COMMENT
            // --------------------------------

            await Comment.findByIdAndDelete(

                comment._id

            );


            res.json({

                success: true,

                message:
                    "Comment deleted successfully."

            });


        } catch (error) {

            console.error(
                "Delete comment error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Could not delete comment."

            });

        }

    }
);
// ========================================
// START SERVER
// ========================================

async function startServer() {

    await connectDatabase();


    app.listen(
        PORT,
        () => {

            console.log(
                `TaskFlow running at http://localhost:${PORT}`
            );

        }
    );

}


startServer();

