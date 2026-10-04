const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const crypto = require("crypto");

const User = require("./models/User");
const Post = require("./models/Post");
const Comment = require("./models/Comment");
const Activity = require("./models/Activity");
const Message = require("./models/Message");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


// =====================================================
// PASSWORD HELPERS
// =====================================================

function hashPassword(password) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}

function passwordMatches(input, stored) {
    if (!stored) return false;

    // New hashed passwords
    if (stored.startsWith("sha256:")) {
        return (
            stored ===
            "sha256:" + hashPassword(input)
        );
    }

    // Allows older accounts created before this update
    return stored === input;
}


// =====================================================
// ACTIVITY HELPER
// =====================================================

async function addActivity({
    type,
    actorUsername,
    targetUsername,
    postId = null,
    text
}) {
    try {
        if (!targetUsername) return;

        await Activity.create({
            type,
            actorUsername,
            targetUsername,
            postId,
            text
        });
    } catch (error) {
        console.error("Activity error:", error.message);
    }
}


// =====================================================
// AUTH
// =====================================================

// REGISTER
app.post("/api/auth/register", async (req, res) => {
    try {
        const {
            name,
            username,
            email,
            password,
            confirmPassword
        } = req.body;

        if (
            !name ||
            !username ||
            !email ||
            !password ||
            !confirmPassword
        ) {
            return res.status(400).json({
                message: "Please fill in all fields."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters."
            });
        }

        const cleanUsername =
            username.trim().toLowerCase();

        const cleanEmail =
            email.trim().toLowerCase();

        const existingUsername =
            await User.findOne({
                username: cleanUsername
            });

        if (existingUsername) {
            return res.status(409).json({
                message:
                    "Username already exists."
            });
        }

        const existingEmail =
            await User.findOne({
                email: cleanEmail
            });

        if (existingEmail) {
            return res.status(409).json({
                message:
                    "Email already registered."
            });
        }

        const user = await User.create({
            name: name.trim(),
            username: cleanUsername,
            email: cleanEmail,
            password:
                "sha256:" +
                hashPassword(password),
            bio: "IT student | Developer"
        });

        res.status(201).json({
            message:
                "Account created successfully.",
            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                bio: user.bio,
                role: user.role || "",
                location: user.location || "",
                website: user.website || "",
                profilePicture:
                    user.profilePicture,
                followers: 0,
                following: 0
            }
        });

    } catch (error) {
        console.error(
            "Register error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to create account."
        });
    }
});


// LOGIN
app.post("/api/auth/login", async (req, res) => {
    try {
        const {
            identifier,
            password
        } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                message:
                    "Please enter your username/email and password."
            });
        }

        const value =
            identifier.trim().toLowerCase();

        const user =
            await User.findOne({
                $or: [
                    { username: value },
                    { email: value }
                ]
            });

        if (!user) {
            return res.status(401).json({
                message:
                    "Account not found. Please register first."
            });
        }

        if (
            !passwordMatches(
                password,
                user.password
            )
        ) {
            return res.status(401).json({
                message:
                    "Incorrect username/email or password."
            });
        }

        res.json({
            message: "Login successful.",
            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                bio: user.bio,
                profilePicture:
                    user.profilePicture || "",
                followers:
                    user.followers.length,
                following:
                    user.following.length
            }
        });

    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            message: "Login failed."
        });
    }
});


// =====================================================
// USER ROUTES
// =====================================================

// GET USER
app.get("/api/users/:username", async (req, res) => {
    try {
        const username = req.params.username.toLowerCase();
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found." });

        let isFollowing = false;
        const currentUsername = (req.query.current || "").toLowerCase();
        if (currentUsername && currentUsername !== username) {
            const currentUser = await User.findOne({ username: currentUsername }).select("following");
            isFollowing = !!currentUser?.following?.some(id => id.toString() === user._id.toString());
        }

        res.json({
            _id: user._id, name: user.name, username: user.username, email: user.email,
            bio: user.bio || "", role: user.role || "", location: user.location || "",
            website: user.website || "", profilePicture: user.profilePicture || "",
            followers: user.followers.length, following: user.following.length, isFollowing
        });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ message: "Unable to load user." });
    }
});


// UPDATE PROFILE
app.put("/api/users/:username", async (req, res) => {
    try {
        const username =
            req.params.username.toLowerCase();

        const {
            name,
            bio,
            role,
            location,
            website,
            profilePicture
        } = req.body;

        const user =
            await User.findOne({
                username
            });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (name !== undefined) {
            user.name = name.trim();
        }

        if (bio !== undefined) {
            user.bio = bio.trim();
        }

        if (role !== undefined) {
            user.role = role.trim();
        }

        if (location !== undefined) {
            user.location = location.trim();
        }

        if (website !== undefined) {
            user.website = website.trim();
        }

        if (profilePicture !== undefined) {
            user.profilePicture =
                profilePicture;
        }

        await user.save();

        res.json({
            message:
                "Profile updated successfully.",
            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                bio: user.bio,
                role: user.role || "",
                location: user.location || "",
                website: user.website || "",
                profilePicture:
                    user.profilePicture,
                followers:
                    user.followers.length,
                following:
                    user.following.length
            }
        });

    } catch (error) {
        console.error(
            "Update profile error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to update profile."
        });
    }
});


// GET USER SUGGESTIONS
app.get("/api/users", async (req, res) => {
    try {
        const currentUsername =
            (req.query.current || "")
                .toLowerCase();

        const currentUser =
            await User.findOne({
                username: currentUsername
            });

        let users =
            await User.find({
                username: {
                    $ne: currentUsername
                }
            }).select(
                "name username bio profilePicture followers following"
            );

        users =
            users.sort(
                () => Math.random() - 0.5
            );

        res.json(
            users.map(user => ({
                _id: user._id,
                name: user.name,
                username: user.username,
                bio: user.bio || "",
                profilePicture:
                    user.profilePicture || "",
                followers:
                    user.followers.length,
                following:
                    user.following.length,
                isFollowing:
                    currentUser
                        ? currentUser.following.some(
                            id =>
                                id.toString() ===
                                user._id.toString()
                        )
                        : false
            }))
        );

    } catch (error) {
        console.error(
            "Suggestions error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to load suggestions."
        });
    }
});


// FOLLOW
app.put(
    "/api/users/:userId/follow",
    async (req, res) => {
        try {
            const currentUsername =
                req.body.currentUsername
                    ?.toLowerCase();

            const currentUser =
                await User.findOne({
                    username:
                        currentUsername
                });

            const targetUser =
                await User.findById(
                    req.params.userId
                );

            if (
                !currentUser ||
                !targetUser
            ) {
                return res.status(404).json({
                    message:
                        "User not found."
                });
            }

            if (
                currentUser._id.equals(
                    targetUser._id
                )
            ) {
                return res.status(400).json({
                    message:
                        "You cannot follow yourself."
                });
            }

            const alreadyFollowing =
                currentUser.following.some(
                    id =>
                        id.equals(
                            targetUser._id
                        )
                );

            if (!alreadyFollowing) {
                currentUser.following.push(
                    targetUser._id
                );

                targetUser.followers.push(
                    currentUser._id
                );

                await currentUser.save();
                await targetUser.save();

                await addActivity({
                    type: "follow",
                    actorUsername:
                        currentUser.username,
                    targetUsername:
                        targetUser.username,
                    text:
                        `${currentUser.name} started following you`
                });
            }

            res.json({
                message:
                    "Followed successfully.",
                isFollowing: true,
                followers:
                    targetUser.followers.length,
                following:
                    currentUser.following.length
            });

        } catch (error) {
            console.error(
                "Follow error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to follow user."
            });
        }
    }
);


// UNFOLLOW
app.put(
    "/api/users/:userId/unfollow",
    async (req, res) => {
        try {
            const currentUser =
                await User.findOne({
                    username:
                        req.body.currentUsername
                            ?.toLowerCase()
                });

            const targetUser =
                await User.findById(
                    req.params.userId
                );

            if (
                !currentUser ||
                !targetUser
            ) {
                return res.status(404).json({
                    message:
                        "User not found."
                });
            }

            currentUser.following =
                currentUser.following.filter(
                    id =>
                        !id.equals(
                            targetUser._id
                        )
                );

            targetUser.followers =
                targetUser.followers.filter(
                    id =>
                        !id.equals(
                            currentUser._id
                        )
                );

            await currentUser.save();
            await targetUser.save();

            res.json({
                message:
                    "Unfollowed successfully.",
                isFollowing: false,
                followers:
                    targetUser.followers.length,
                following:
                    currentUser.following.length
            });

        } catch (error) {
            console.error(
                "Unfollow error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to unfollow user."
            });
        }
    }
);


// =====================================================
// DIRECT MESSAGES
// =====================================================

app.get("/api/messages", async (req, res) => {
    try {
        const user = (req.query.user || "").toLowerCase();
        const withUser = (req.query.with || "").toLowerCase();
        if (!user || !withUser) return res.json([]);
        const messages = await Message.find({
            $or: [
                { from: user, to: withUser },
                { from: withUser, to: user }
            ]
        }).sort({ createdAt: 1 }).limit(100);
        res.json(messages);
    } catch (error) {
        console.error("Messages load error:", error);
        res.status(500).json({ message: "Unable to load messages." });
    }
});

app.post("/api/messages", async (req, res) => {
    try {
        const from = String(req.body.from || "").trim().toLowerCase();
        const to = String(req.body.to || "").trim().toLowerCase();
        const content = String(req.body.content || "").trim();
        if (!from || !to || !content) return res.status(400).json({ message: "Message cannot be empty." });
        if (from === to) return res.status(400).json({ message: "You cannot message yourself." });
        const [sender, recipient] = await Promise.all([User.findOne({ username: from }), User.findOne({ username: to })]);
        if (!sender || !recipient) return res.status(404).json({ message: "User not found." });
        const message = await Message.create({ from, to, content });
        res.status(201).json(message);
    } catch (error) {
        console.error("Message send error:", error);
        res.status(500).json({ message: "Unable to send message." });
    }
});


// =====================================================
// POST ROUTES
// =====================================================

// CREATE POST
app.post("/api/posts", async (req, res) => {
    try {
        const {
            username,
            content,
            photo = "",
            location = "",
            feeling = ""
        } = req.body;

        if (
            !username ||
            !content ||
            !content.trim()
        ) {
            return res.status(400).json({
                message:
                    "Post content is required."
            });
        }

        const cleanUsername =
            username.toLowerCase();

        const user =
            await User.findOne({
                username: cleanUsername
            });

        if (!user) {
            return res.status(401).json({
                message:
                    "User not found. Please login again."
            });
        }

        const post =
            await Post.create({
                username:
                    cleanUsername,
                content:
                    content.trim(),
                photo,
                location,
                feeling,
                likes: 0,
                likedBy: []
            });

        await addActivity({
            type: "post",
            actorUsername:
                cleanUsername,
            targetUsername:
                cleanUsername,
            postId: post._id,
            text:
                "You shared a new post"
        });

        res.status(201).json(post);

    } catch (error) {
        console.error(
            "Create post error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to create post."
        });
    }
});


// GET POSTS
async function ensureDailyVibePost() {
    const today = new Date().toISOString().slice(0, 10);
    const key = `[VYBE DAILY ${today}]`;
    const exists = await Post.findOne({ content: key });
    if (exists) return;
    const users = ["priya","neha","rohan","isha","arjun","ananya","rahul"];
    const messages = [
        "Today’s tiny win: showing up and getting one thing done. ✨",
        "Reminder: progress does not have to be loud to be real. 🌷",
        "New day, new ideas, same VYBE. What are you building today? 🚀",
        "A good playlist can turn an ordinary work session into a whole mood. 🎧",
        "Today’s challenge: learn one thing you didn’t know yesterday. 💡",
        "Small steps. Better habits. Bigger stories. 🌱"
    ];
    const seed = today.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
    const username = users[seed % users.length];
    await Post.create({
        username,
        content: `${messages[seed % messages.length]} ${key}`,
        photo: `https://picsum.photos/seed/vybe-daily-${today}/900/650`,
        location: "VYBE",
        feeling: "Feeling inspired",
        likes: 10 + (seed % 24),
        likedBy: [],
        createdAt: new Date()
    });
}

app.get("/api/posts", async (req, res) => {
    try {
        await ensureDailyVibePost();
        const currentUsername =
            (req.query.current || "")
                .toLowerCase();

        const currentUser =
            currentUsername
                ? await User.findOne({
                    username:
                        currentUsername
                })
                : null;

        const posts =
            await Post.find()
                .sort({
                    createdAt: -1
                })
                .limit(100);

        const usernames =
            [
                ...new Set(
                    posts.map(
                        post =>
                            post.username
                    )
                )
            ];

        const users =
            await User.find({
                username: {
                    $in: usernames
                }
            }).select(
                "name username profilePicture bio"
            );

        const userMap =
            new Map(
                users.map(user => [
                    user.username,
                    user
                ])
            );

        res.json(
            posts.map(post => ({
                _id: post._id,
                username:
                    post.username,
                content:
                    post.content,
                photo:
                    post.photo || "",
                location:
                    post.location || "",
                feeling:
                    post.feeling || "",
                likes:
                    post.likes || 0,
                liked:
                    currentUser
                        ? (Array.isArray(post.likedBy)
                            ? post.likedBy.some(
                                id =>
                                    id.toString() ===
                                    currentUser._id.toString()
                            )
                            : false)
                        : false,
                createdAt:
                    post.createdAt,
                author:
                    userMap.get(
                        post.username
                    )
                        ? {
                            name:
                                userMap.get(
                                    post.username
                                ).name,
                            username:
                                post.username,
                            profilePicture:
                                userMap.get(
                                    post.username
                                ).profilePicture ||
                                "",
                            bio:
                                userMap.get(
                                    post.username
                                ).bio || ""
                        }
                        : {
                            name:
                                post.username,
                            username:
                                post.username,
                            profilePicture:
                                "",
                            bio: ""
                        }
            }))
        );

    } catch (error) {
        console.error(
            "Get posts error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to load posts."
        });
    }
});
// =====================================================
// LIKE / UNLIKE
// =====================================================

app.put(
    "/api/posts/:postId/like",
    async (req, res) => {
        try {
            const username =
                req.body.username?.toLowerCase();

            const user = await User.findOne({ username });
            const post = await Post.findById(req.params.postId);

            if (!user || !post) {
                return res.status(404).json({
                    message: "User or post not found."
                });
            }

            if (!Array.isArray(post.likedBy)) {
                post.likedBy = [];
            }

            const alreadyLiked = post.likedBy.some(
                id => id.toString() === user._id.toString()
            );

            if (!alreadyLiked) {
                post.likedBy.push(user._id);
                post.likes = Math.max(0, Number(post.likes) || 0) + 1;
                await post.save();

                if (post.username !== user.username) {
                    await addActivity({
                        type: "like",
                        actorUsername: user.username,
                        targetUsername: post.username,
                        postId: post._id,
                        text: `${user.name} liked your post`
                    });
                }
            }

            res.json({ likes: post.likes, liked: true });
        } catch (error) {
            console.error("Like error:", error);
            res.status(500).json({ message: "Unable to like post." });
        }
    }
);

app.put(
    "/api/posts/:postId/unlike",
    async (req, res) => {
        try {
            const username =
                req.body.username?.toLowerCase();

            const user = await User.findOne({ username });
            const post = await Post.findById(req.params.postId);

            if (!user || !post) {
                return res.status(404).json({
                    message: "User or post not found."
                });
            }

            if (!Array.isArray(post.likedBy)) {
                post.likedBy = [];
            }

            const wasLiked = post.likedBy.some(
                id => id.toString() === user._id.toString()
            );

            if (wasLiked) {
                post.likedBy = post.likedBy.filter(
                    id => id.toString() !== user._id.toString()
                );
                post.likes = Math.max(0, (Number(post.likes) || 0) - 1);
                await post.save();
            }

            res.json({ likes: post.likes, liked: false });
        } catch (error) {
            console.error("Unlike error:", error);
            res.status(500).json({ message: "Unable to unlike post." });
        }
    }
);


// =====================================================
// DELETE POST
// =====================================================

app.delete(
    "/api/posts/:postId",
    async (req, res) => {

        try {

            const username =
                req.body.username
                    ?.toLowerCase();

            const post =
                await Post.findById(
                    req.params.postId
                );

            if (!post) {
                return res.status(404).json({
                    message:
                        "Post not found."
                });
            }

            if (
                post.username !==
                username
            ) {
                return res.status(403).json({
                    message:
                        "You can only delete your own posts."
                });
            }

            await Post.findByIdAndDelete(
                req.params.postId
            );

            await Comment.deleteMany({
                postId:
                    req.params.postId
            });

            res.json({
                message:
                    "Post deleted successfully."
            });

        } catch (error) {

            console.error(
                "Delete post error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to delete post."
            });
        }
    }
);


// =====================================================
// COMMENTS
// =====================================================

// CREATE COMMENT
app.post(
    "/api/comments",
    async (req, res) => {

        try {

            const {
                username,
                postId,
                content
            } = req.body;

            if (
                !username ||
                !postId ||
                !content ||
                !content.trim()
            ) {
                return res.status(400).json({
                    message:
                        "Comment content is required."
                });
            }

            const user =
                await User.findOne({
                    username:
                        username.toLowerCase()
                });

            const post =
                await Post.findById(
                    postId
                );

            if (!user || !post) {
                return res.status(404).json({
                    message:
                        "User or post not found."
                });
            }

            const comment =
                await Comment.create({
                    username:
                        user.username,
                    postId,
                    content:
                        content.trim()
                });

            if (
                post.username !==
                user.username
            ) {

                await addActivity({
                    type: "comment",
                    actorUsername:
                        user.username,
                    targetUsername:
                        post.username,
                    postId:
                        post._id,
                    text:
                        `${user.name} commented on your post`
                });
            }

            res.status(201).json(
                comment
            );

        } catch (error) {

            console.error(
                "Create comment error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to save comment."
            });
        }
    }
);


// GET COMMENTS
app.get(
    "/api/comments/:postId",
    async (req, res) => {

        try {

            const comments =
                await Comment.find({
                    postId:
                        req.params.postId
                }).sort({
                    createdAt: 1
                });

            res.json(comments);

        } catch (error) {

            console.error(
                "Get comments error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load comments."
            });
        }
    }
);


// DELETE COMMENT
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
                    message:
                        "Comment not found."
                });
            }

            const username =
                req.body.username
                    ?.toLowerCase();

            if (
                comment.username !==
                username
            ) {
                return res.status(403).json({
                    message:
                        "You can only delete your own comments."
                });
            }

            await Comment.findByIdAndDelete(
                req.params.commentId
            );

            res.json({
                message:
                    "Comment deleted successfully."
            });

        } catch (error) {

            console.error(
                "Delete comment error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to delete comment."
            });
        }
    }
);


// =====================================================
// ACTIVITY
// =====================================================

app.get(
    "/api/activity/:username",
    async (req, res) => {

        try {

            const username =
                req.params.username
                    .toLowerCase();

            const activities =
                await Activity.find({
                    targetUsername:
                        username
                })
                .sort({
                    createdAt: -1
                })
                .limit(50);

            res.json(activities);

        } catch (error) {

            console.error(
                "Activity loading error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load activity."
            });
        }
    }
);


// =====================================================
// NOTIFICATIONS
// =====================================================

app.get(
    "/api/notifications/:username",
    async (req, res) => {

        try {

            const username =
                req.params.username
                    .toLowerCase();

            const notifications =
                await Activity.find({
                    targetUsername:
                        username
                })
                .sort({
                    createdAt: -1
                })
                .limit(30);

            res.json(
                notifications.map(
                    notification => ({
                        _id:
                            notification._id,
                        type:
                            notification.type,
                        text:
                            notification.text,
                        actorUsername:
                            notification.actorUsername,
                        postId:
                            notification.postId,
                        createdAt:
                            notification.createdAt
                    })
                )
            );

        } catch (error) {

            console.error(
                "Notifications error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load notifications."
            });
        }
    }
);


// =====================================================
// SEARCH
// =====================================================

app.get(
    "/api/search",
    async (req, res) => {

        try {

            const query =
                (req.query.q || "")
                    .trim();

            if (!query) {
                return res.json([]);
            }

            const regex =
                new RegExp(
                    query,
                    "i"
                );

            const users =
                await User.find({
                    $or: [
                        {
                            name:
                                regex
                        },
                        {
                            username:
                                regex
                        },
                        {
                            bio:
                                regex
                        }
                    ]
                })
                .select(
                    "name username bio profilePicture followers following"
                )
                .limit(20);

            const posts =
                await Post.find({
                    content:
                        regex
                })
                .sort({
                    createdAt: -1
                })
                .limit(20);

            res.json({
                users:
                    users.map(
                        user => ({
                            _id:
                                user._id,
                            name:
                                user.name,
                            username:
                                user.username,
                            bio:
                                user.bio || "",
                            profilePicture:
                                user.profilePicture ||
                                "",
                            followers:
                                user.followers.length,
                            following:
                                user.following.length
                        })
                    ),

                posts
            });

        } catch (error) {

            console.error(
                "Search error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to search."
            });
        }
    }
);


// =====================================================
// TRENDING
// =====================================================

app.get(
    "/api/trending",
    async (req, res) => {

        try {

            const posts =
                await Post.find()
                    .sort({
                        likes: -1,
                        createdAt: -1
                    })
                    .limit(20);

            const trends = [
                {
                    tag:
                        "#SocialConnect",
                    count:
                        posts.length
                },
                {
                    tag:
                        "#Technology",
                    count:
                        Math.floor(
                            Math.random() * 900
                        ) + 100
                },
                {
                    tag:
                        "#StudentLife",
                    count:
                        Math.floor(
                            Math.random() * 700
                        ) + 100
                },
                {
                    tag:
                        "#Developers",
                    count:
                        Math.floor(
                            Math.random() * 600
                        ) + 100
                },
                {
                    tag:
                        "#Weekend",
                    count:
                        Math.floor(
                            Math.random() * 500
                        ) + 100
                }
            ];

            res.json(
                trends.sort(
                    () =>
                        Math.random() - 0.5
                )
            );

        } catch (error) {

            console.error(
                "Trending error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load trending."
            });
        }
    }
);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            server: "running",
            mongodb:
                mongoose.connection.readyState ===
                1
                    ? "connected"
                    : "disconnected"
        });

    }
);


// =====================================================
// 404 API HANDLER
// =====================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({
            message:
                "API endpoint not found."
        });

    }
);
// =====================================================
// DEMO USER
// =====================================================

async function createDemoUser() {

    try {

        const existing =
            await User.findOne({
                username: "aashi"
            });

        if (existing) {
            return existing;
        }

        const demoUser =
            await User.create({

                name: "Aashi",

                username: "aashi",

                email:
                    "aashi@socialconnect.demo",

                password:
                    "sha256:" +
                    hashPassword(
                        "aashi123"
                    ),

                bio:
                    "IT student | Developer | Creating and connecting 🚀",

                profilePicture: "",

                followers: [],

                following: []
            });

        console.log(
            "Demo user created: @aashi"
        );

        return demoUser;

    } catch (error) {

        console.error(
            "Demo user error:",
            error
        );

        return null;
    }
}


// =====================================================
// DUMMY USERS
// =====================================================

async function createDummyUsers() {

    const dummyUsers = [

        {
            name: "Priya Sharma",
            username: "priya",
            email:
                "priya@socialconnect.demo",
            bio:
                "Designer | Coffee lover ☕ | Creating beautiful things",
            profilePicture: "https://i.pravatar.cc/300?img=47",
            role: "Product designer",
            location: "Mumbai, India"
        },

        {
            name: "Neha Patel",
            username: "neha",
            email:
                "neha@socialconnect.demo",
            bio:
                "Developer | Tech enthusiast 💻 | Always learning",
            profilePicture: "https://i.pravatar.cc/300?img=32",
            role: "Software developer",
            location: "Pune, India"
        },

        {
            name: "Rohan Mehta",
            username: "rohan",
            email:
                "rohan@socialconnect.demo",
            bio:
                "Photography 📸 | Travel | Good vibes",
            profilePicture: "https://i.pravatar.cc/300?img=12",
            role: "Photographer",
            location: "Goa, India"
        },

        {
            name: "Isha Kulkarni",
            username: "isha",
            email:
                "isha@socialconnect.demo",
            bio:
                "Student | Music 🎧 | Exploring life",
            profilePicture: "",
            role: "Music explorer",
            location: "Mumbai, India"
        },

        {
            name: "Arjun Rao",
            username: "arjun",
            email:
                "arjun@socialconnect.demo",
            bio:
                "Software developer | Startup enthusiast 🚀",
            profilePicture: "",
            role: "Startup builder",
            location: "Bengaluru, India"
        },

        {
            name: "Ananya Singh",
            username: "ananya",
            email:
                "ananya@socialconnect.demo",
            bio:
                "Books 📚 | Art 🎨 | Student life",
            profilePicture: "https://i.pravatar.cc/300?img=49",
            role: "Student & reader",
            location: "Mumbai, India"
        },

        {
            name: "Rahul Desai",
            username: "rahul",
            email:
                "rahul@socialconnect.demo",
            bio:
                "Engineering student | Football ⚽",
            profilePicture: "https://i.pravatar.cc/300?img=68",
            role: "Engineering student",
            location: "Thane, India"
        },

        {
            name: "Meera Joshi",
            username: "meera",
            email: "meera@socialconnect.demo",
            bio: "UI/UX explorer | Matcha breaks 🍵 | Making interfaces feel human",
            profilePicture: "https://i.pravatar.cc/300?img=44",
            role: "UI/UX designer",
            location: "Mumbai, India"
        },

        {
            name: "Kabir Shah",
            username: "kabir",
            email: "kabir@socialconnect.demo",
            bio: "Building tiny apps with big energy ⚡ | Coffee + code",
            profilePicture: "https://i.pravatar.cc/300?img=53",
            role: "App developer",
            location: "Bengaluru, India"
        },

        {
            name: "Sana Khan",
            username: "sana",
            email: "sana@socialconnect.demo",
            bio: "Fashion, playlists and weekend cafés ✨",
            profilePicture: "https://i.pravatar.cc/300?img=25",
            role: "Content creator",
            location: "Pune, India"
        },

        {
            name: "Vihaan Kapoor",
            username: "vihaan",
            email: "vihaan@socialconnect.demo",
            bio: "Startup notes, street photography and late-night ideas 📷",
            profilePicture: "",
            role: "Founder in progress",
            location: "Delhi, India"
        },

        {
            name: "Tara Menon",
            username: "tara",
            email: "tara@socialconnect.demo",
            bio: "Books, beaches and better conversations 🌊📚",
            profilePicture: "https://i.pravatar.cc/300?img=5",
            role: "Writer & reader",
            location: "Mangaluru, India"
        },

        {
            name: "Dev Malhotra",
            username: "dev",
            email: "dev@socialconnect.demo",
            bio: "Music producer 🎛️ | Learning something new every week",
            profilePicture: "",
            role: "Music producer",
            location: "Hyderabad, India"
        }
    ];


    for (const data of dummyUsers) {
        const exists = await User.findOne({ username: data.username });

        if (!exists) {
            await User.create({
                name: data.name,
                username: data.username,
                email: data.email,
                password: "sha256:" + hashPassword("demo123"),
                bio: data.bio,
                role: data.role || "",
                location: data.location || "",
                profilePicture: data.profilePicture || "",
                followers: [],
                following: []
            });
            console.log(`Created dummy user @${data.username}`);
        } else {
            const updates = {};
            if (data.profilePicture !== undefined && exists.profilePicture !== data.profilePicture) updates.profilePicture = data.profilePicture;
            if (!exists.role && data.role) updates.role = data.role;
            if (!exists.location && data.location) updates.location = data.location;
            if (Object.keys(updates).length) await User.updateOne({ _id: exists._id }, { $set: updates });
        }
    }

}


// =====================================================
// DUMMY POSTS
// =====================================================

async function createDummyPosts() {
    const photoSeeds = {
        priya: "https://picsum.photos/seed/vybe-priya/900/650",
        neha: "https://picsum.photos/seed/vybe-neha/900/650",
        rohan: "https://picsum.photos/seed/vybe-rohan/900/650",
        isha: "https://picsum.photos/seed/vybe-isha/900/650",
        arjun: "https://picsum.photos/seed/vybe-arjun/900/650",
        ananya: "https://picsum.photos/seed/vybe-ananya/900/650",
        rahul: "https://picsum.photos/seed/vybe-rahul/900/650",
        meera: "https://picsum.photos/seed/vybe-meera/900/650",
        kabir: "https://picsum.photos/seed/vybe-kabir/900/650",
        sana: "https://picsum.photos/seed/vybe-sana/900/650",
        vihaan: "https://picsum.photos/seed/vybe-vihaan/900/650",
        tara: "https://picsum.photos/seed/vybe-tara/900/650",
        dev: "https://picsum.photos/seed/vybe-dev/900/650"
    };

    const dummyPosts = [
        { username: "priya", content: "Coffee, sunshine and a productive morning ☕✨", location: "Mumbai", feeling: "Feeling productive" },
        { username: "neha", content: "Finally finished my project! That feeling is unmatched 💻🎉", location: "Pune", feeling: "Feeling accomplished" },
        { username: "rohan", content: "Some moments are worth capturing forever 📸🌅", location: "Goa", feeling: "Feeling happy" },
        { username: "isha", content: "Music on. World off. 🎧💜", location: "Mumbai", feeling: "Feeling relaxed" },
        { username: "arjun", content: "Building something new today. Let's see where it goes 🚀", location: "Bengaluru", feeling: "Feeling excited" },
        { username: "ananya", content: "A good book and a quiet evening is all I need 📚✨", location: "Mumbai", feeling: "Feeling peaceful" },
        { username: "rahul", content: "Weekend plans: football, friends and absolutely no deadlines 😂⚽", location: "Thane", feeling: "Feeling great" },
        { username: "priya", content: "Little progress every day adds up to something amazing 🌸", location: "Mumbai", feeling: "Feeling motivated" },
        { username: "neha", content: "Debugging for two hours only to realize the bug was one missing bracket 😭💻", location: "Pune", feeling: "Feeling amused" },
        { username: "rohan", content: "Chasing sunsets, collecting stories and forgetting to check the time 🌅", location: "Goa", feeling: "Feeling free" },
        { username: "isha", content: "Found a song that instantly feels like a Friday evening 🎶", location: "Mumbai", feeling: "Feeling dreamy" },
        { username: "arjun", content: "Tiny prototype today. Big idea tomorrow. 🚀", location: "Bengaluru", feeling: "Feeling ambitious" },
        { username: "ananya", content: "A quiet corner, a good book and zero notifications. Perfect. 📚", location: "Mumbai", feeling: "Feeling peaceful" },
        { username: "rahul", content: "Football nights hit different when everyone actually shows up ⚽🔥", location: "Thane", feeling: "Feeling energetic" },
        { username: "meera", content: "Redesigned a tiny onboarding screen today and somehow it made my whole day better ✨", location: "Mumbai", feeling: "Feeling creative" },
        { username: "kabir", content: "The app finally works end-to-end. Never underestimate the happiness of a green build 🚀", location: "Bengaluru", feeling: "Feeling relieved" },
        { username: "sana", content: "Found the cutest little café and immediately added it to my weekend list ☕🤍", location: "Pune", feeling: "Feeling happy" },
        { username: "vihaan", content: "Three ideas, one notebook, zero sleep. Startup life is a strange little adventure 😅", location: "Delhi", feeling: "Feeling ambitious" },
        { username: "tara", content: "Currently reading something so good I keep missing my stop on the train 📚😂", location: "Mangaluru", feeling: "Feeling obsessed" },
        { username: "dev", content: "Made a beat from the sound of rain on my window. Unexpectedly good 🎛️🌧️", location: "Hyderabad", feeling: "Feeling inspired" },
        { username: "meera", content: "Reminder: a good interface should disappear and let the idea shine.", location: "Mumbai", feeling: "Feeling thoughtful" },
        { username: "kabir", content: "Weekend side-project update: 4 screens done, 2 bugs pretending to be features 😂", location: "Bengaluru", feeling: "Feeling amused" },
        { username: "sana", content: "Playlist of the day: soft pop, old Bollywood and one completely random techno track 🎶", location: "Pune", feeling: "Feeling vibey" },
        { username: "vihaan", content: "Met someone with a brilliant idea today. The best part of building is meeting builders.", location: "Delhi", feeling: "Feeling inspired" },
        { username: "tara", content: "Sunset walks are free therapy. No app required. 🌅", location: "Mangaluru", feeling: "Feeling peaceful" },
        { username: "dev", content: "New headphones, new mix, same 2 AM deadline. Let's go 🎧", location: "Hyderabad", feeling: "Feeling focused" }
    ];

    for (const data of dummyPosts) {
        const exists = await Post.findOne({ username: data.username, content: data.content });
        if (!exists) {
            await Post.create({ ...data, photo: photoSeeds[data.username] || "", likes: Math.floor(Math.random() * 35), likedBy: [] });
        } else if (!exists.photo && photoSeeds[data.username]) {
            exists.photo = photoSeeds[data.username];
            await exists.save();
        }
    }

    // A small deterministic daily post makes the demo feel alive on each new day.
    const today = new Date().toISOString().slice(0, 10);
    const dailyMessages = [
        "Today's tiny win: showing up and getting one thing done. ✨",
        "Reminder: progress does not have to be loud to be real. 🌷",
        "New day, new ideas, same VYBE. What are you building today? 🚀",
        "A good playlist can turn an ordinary work session into a whole mood. 🎧",
        "Today's challenge: learn one thing you didn't know yesterday. 💡",
        "Small steps. Better habits. Bigger stories. 🌱"
    ];
    const seed = today.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    const dailyUser = ["priya","neha","rohan","isha","arjun","ananya"][seed % 6];
    const dailyContent = dailyMessages[seed % dailyMessages.length];
    const dailyKey = `[VYBE DAILY ${today}]`;
    if (!(await Post.findOne({ content: { $regex: `\\[VYBE DAILY ${today}\\]` } }))) {
        await Post.create({ username: dailyUser, content: `${dailyContent} ${dailyKey}`, photo: `https://picsum.photos/seed/vybe-daily-${today}/900/650`, location: "VYBE", feeling: "Feeling inspired", likes: 12 + (seed % 23), likedBy: [], createdAt: new Date() });
    }

    console.log("Demo posts ready.");
}



// =====================================================
// DEMO INTERACTIONS
// =====================================================

async function createDemoInteractions() {
    try {
        const aashi = await User.findOne({ username: "aashi" });
        const priya = await User.findOne({ username: "priya" });
        const neha = await User.findOne({ username: "neha" });
        const rohan = await User.findOne({ username: "rohan" });

        if (!aashi || !priya || !neha || !rohan) return;

        // Give the demo profile a realistic starting network.
        const addId = (arr, id) => {
            if (!arr.some(existing => existing.toString() === id.toString())) {
                arr.push(id);
            }
        };

        addId(aashi.following, priya._id);
        addId(aashi.following, neha._id);
        addId(priya.followers, aashi._id);
        addId(neha.followers, aashi._id);
        addId(aashi.followers, rohan._id);
        addId(rohan.following, aashi._id);

        await Promise.all([
            aashi.save(),
            priya.save(),
            neha.save(),
            rohan.save()
        ]);

        const existingActivity =
            await Activity.countDocuments({ targetUsername: "aashi" });

        if (existingActivity === 0) {
            await Activity.insertMany([
                {
                    type: "follow",
                    actorUsername: "rohan",
                    targetUsername: "aashi",
                    text: "Rohan started following you"
                },
                {
                    type: "like",
                    actorUsername: "priya",
                    targetUsername: "aashi",
                    text: "Priya liked your post"
                },
                {
                    type: "comment",
                    actorUsername: "neha",
                    targetUsername: "aashi",
                    text: "Neha commented on your post"
                }
            ]);
        }

        console.log("Demo interactions ready.");
    } catch (error) {
        console.error("Demo interaction error:", error.message);
    }
}


// =====================================================
// DATABASE CONNECTION
// =====================================================

async function startServer() {

    try {

        if (!process.env.MONGO_URI) {

            console.error(
                "MONGO_URI is missing from .env"
            );

            process.exit(1);
        }


        await mongoose.connect(
            process.env.MONGO_URI,
            {
                serverSelectionTimeoutMS:
                    15000,
                connectTimeoutMS:
                    15000
            }
        );


        console.log(
            "MongoDB connected successfully"
        );


        // Create demo account
        await createDemoUser();


        // Create dummy accounts
        await createDummyUsers();


        // Create sample posts
        await createDummyPosts();
        await createDemoInteractions();


        // Start Express
        app.listen(
            PORT,
            () => {

                console.log(
                    `Server running at http://localhost:${PORT}`
                );

            }
        );


    } catch (error) {

        console.error(
            "MongoDB connection error:",
            error
        );

        process.exit(1);
    }
}


// =====================================================
// START
// =====================================================

startServer();