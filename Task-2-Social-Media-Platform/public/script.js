document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const raw =
            localStorage.getItem(
                "socialconnectUser"
            );

        if (!raw) {
            window.location.href =
                "login.html";
            return;
        }

        let user;

        try {
            user = JSON.parse(raw);
        } catch {
            localStorage.removeItem(
                "socialconnectUser"
            );

            window.location.href =
                "login.html";

            return;
        }

        // ==========================================
        // BASIC USER UI
        // ==========================================

        updateUserUI(user);

        setupLogout();

        setupNotificationPanel(user);

        setupComposer(user);

        // ==========================================
        // HOME DATA
        // ==========================================

        await loadHomeProfile(user);

        await loadFeed(user);

        await loadTrending(user);

        await loadSuggestions(user);

        updateGreeting();

    }
);


// =====================================================
// USER UI
// =====================================================

function updateUserUI(user) {

    document
        .querySelectorAll("#miniName")
        .forEach(el => {
            el.textContent =
                user.name ||
                user.username;
        });

    document
        .querySelectorAll("#miniUsername")
        .forEach(el => {
            el.textContent =
                "@" +
                user.username;
        });

    const avatarElements = [
        document.getElementById(
            "miniAvatar"
        ),
        document.getElementById(
            "topAvatar"
        ),
        document.getElementById(
            "composerAvatar"
        ),
        document.getElementById(
            "summaryAvatar"
        )
    ];

    avatarElements.forEach(el => {
        if (!el) return;

        renderAvatar(
            el,
            user.profilePicture,
            user.name
        );
    });

    const names = [
        "composerName",
        "summaryName"
    ];

    names.forEach(id => {
        const el =
            document.getElementById(id);

        if (el) {
            el.textContent =
                user.name ||
                user.username;
        }
    });

    const username =
        document.getElementById(
            "composerUsername"
        );

    if (username) {
        username.textContent =
            "@" + user.username;
    }

    const summaryUsername =
        document.getElementById(
            "summaryUsername"
        );

    if (summaryUsername) {
        summaryUsername.textContent =
            "@" + user.username;
    }

    const bio =
        document.getElementById(
            "summaryBio"
        );

    if (bio) {
        bio.textContent =
            user.bio ||
            "IT student · Developer";
    }
}


// =====================================================
// AVATAR
// =====================================================

function renderAvatar(
    element,
    image,
    name
) {

    element.innerHTML = "";

    if (image) {

        const img =
            document.createElement(
                "img"
            );

        img.src = image;
        img.alt = name || "Profile";

        element.appendChild(img);

    } else {

        const initials =
            getInitials(name);

        element.textContent =
            initials;
    }
}


function getInitials(name) {

    if (!name) return "SC";

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            word =>
                word[0].toUpperCase()
        )
        .join("");
}


// =====================================================
// LOGOUT
// =====================================================

function setupLogout() {

    document
        .querySelectorAll(
            "[data-logout]"
        )
        .forEach(button => {

            button.onclick = () => {

                localStorage.removeItem(
                    "socialconnectUser"
                );

                window.location.href =
                    "login.html";
            };
        });
}


// =====================================================
// GREETING
// =====================================================

function updateGreeting() {

    const greeting =
        document.getElementById(
            "greeting"
        );

    if (!greeting) return;

    const hour =
        new Date().getHours();

    let text = "Good evening";

    if (hour < 12) {
        text = "Good morning";
    } else if (hour < 18) {
        text = "Good afternoon";
    }

    greeting.textContent =
        text + " 👋";
}


// =====================================================
// HOME PROFILE
// =====================================================

async function loadHomeProfile(user) {

    try {

        const response =
            await fetch(
                `/api/users/${encodeURIComponent(
                    user.username
                )}`
            );

        if (!response.ok) return;

        const data =
            await response.json();

        localStorage.setItem(
            "socialconnectUser",
            JSON.stringify(data)
        );

        updateUserUI(data);

        const posts =
            document.getElementById(
                "homePostCount"
            );

        const followers =
            document.getElementById(
                "homeFollowerCount"
            );

        const following =
            document.getElementById(
                "homeFollowingCount"
            );

        if (followers) {
            followers.textContent =
                data.followers;
        }

        if (following) {
            following.textContent =
                data.following;
        }

        if (posts) {

            const postResponse =
                await fetch(
                    `/api/posts?current=${encodeURIComponent(
                        data.username
                    )}`
                );

            if (postResponse.ok) {

                const postData =
                    await postResponse.json();

                posts.textContent =
                    postData.filter(
                        post =>
                            post.username ===
                            data.username
                    ).length;
            }
        }

    } catch (error) {

        console.error(
            "Home profile error:",
            error
        );
    }
}


// =====================================================
// FEED
// =====================================================

async function loadFeed(user) {

    const container =
        document.querySelector(
            ".posts"
        );

    if (!container) return;

    container.innerHTML =
        `<div class="feed-loading">
            <div class="loading-dot"></div>
            Loading your community...
        </div>`;

    try {

        const response =
            await fetch(
                `/api/posts?current=${encodeURIComponent(
                    user.username
                )}`
            );

        if (!response.ok) {
            throw new Error(
                "Unable to load posts"
            );
        }

        const posts =
            await response.json();

        if (!posts.length) {

            container.innerHTML =
                `<div class="empty-feed">
                    <div>✨</div>
                    <h3>Your feed is quiet</h3>
                    <p>Be the first person to share something.</p>
                </div>`;

            return;
        }

        // Build a fresh feed pack on every visit. There are intentionally more demo
        // accounts/posts than fit in the first viewport, so the home feed feels like a
        // real social timeline instead of repeating Rahul/Ananya every time.
        const shuffledPosts = shuffleArray(posts);
        const feedPosts = shuffledPosts.slice(0, Math.min(16, shuffledPosts.length));
        const shuffledBrands = shuffleArray(VYBE_BRAND_SPOTS).slice(0, 3);
        const brandIndexes = [5, 10, 15].filter(index => index < feedPosts.length);
        const brandByIndex = new Map(brandIndexes.map((index, i) => [index, shuffledBrands[i]]));

        const feedMarkup = feedPosts.map((post, index) => {
            const sponsor = brandByIndex.get(index);
            return `${sponsor ? sponsoredHTML(sponsor) : ""}${postHTML(post, user)}`;
        }).join("");

        container.innerHTML = feedMarkup + sponsoredHTML(shuffledBrands[3] || VYBE_BRAND_SPOTS[0]);

        setupPostActions(
            container,
            user
        );

        container.querySelectorAll("[data-sponsored-brand]").forEach(button => {
            button.addEventListener("click", () => {
                showToast(`${button.dataset.sponsoredBrand} · demo brand page opened ✨`);
            });
        });

    } catch (error) {

        console.error(
            "Feed error:",
            error
        );

        container.innerHTML =
            `<div class="empty-feed">
                <div>⚠️</div>
                <h3>Unable to load feed</h3>
                <p>Please check that the server is running.</p>
            </div>`;
    }
}


// =====================================================
// VYBE SPONSORED / BRAND DISCOVERY DATA
// =====================================================

const VYBE_BRAND_SPOTS = [
    { brand: "Luma Skin", badge: "SPONSORED", title: "Glow, without the extra steps.", copy: "Meet the everyday hydration set made for busy mornings and late nights.", cta: "Explore set", image: "https://picsum.photos/seed/vybe-luma/900/520", tag: "Beauty · Self care" },
    { brand: "NovaBean Coffee", badge: "VYBE PICK", title: "Your 10 AM deserves better coffee.", copy: "Small-batch beans, smooth roasts and a little more energy for your next idea.", cta: "See the roast", image: "https://picsum.photos/seed/vybe-novabean/900/520", tag: "Coffee · Lifestyle" },
    { brand: "Morrow Audio", badge: "SPONSORED", title: "Press play. Tune everything else out.", copy: "Wireless audio designed for deep work, long walks and your favourite playlists.", cta: "Discover Morrow", image: "https://picsum.photos/seed/vybe-morrow/900/520", tag: "Tech · Music" },
    { brand: "Northline Studio", badge: "FEATURED", title: "Objects that make your desk feel like yours.", copy: "Minimal desk accessories for people who collect ideas, not clutter.", cta: "Shop the edit", image: "https://picsum.photos/seed/vybe-northline/900/520", tag: "Design · Workspace" },
    { brand: "Aster Streetwear", badge: "SPONSORED", title: "Made for the after-hours.", copy: "Relaxed fits, everyday layers and pieces that work beyond the feed.", cta: "View drop", image: "https://picsum.photos/seed/vybe-aster/900/520", tag: "Fashion · Streetwear" },
    { brand: "Mango & Mint", badge: "VYBE PICK", title: "A little pause in the middle of the day.", copy: "Fresh sparkling blends for slow afternoons and spontaneous plans.", cta: "Find your flavour", image: "https://picsum.photos/seed/vybe-mangomint/900/520", tag: "Food · Drinks" }
];

function shuffleArray(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function sponsoredHTML(spot) {
    return `
        <article class="sponsored-card">
            <div class="sponsored-image-wrap">
                <img src="${spot.image}" alt="${escapeHTML(spot.brand)} product feature">
                <span class="sponsored-badge">${escapeHTML(spot.badge)}</span>
            </div>
            <div class="sponsored-body">
                <div class="sponsored-brand">${escapeHTML(spot.brand)} <span>✦</span></div>
                <h3>${escapeHTML(spot.title)}</h3>
                <p>${escapeHTML(spot.copy)}</p>
                <div class="sponsored-footer">
                    <span>${escapeHTML(spot.tag)}</span>
                    <button type="button" class="sponsored-cta" data-sponsored-brand="${escapeHTML(spot.brand)}">${escapeHTML(spot.cta)} ↗</button>
                </div>
            </div>
        </article>`;
}

// =====================================================
// POST HTML
// =====================================================

function postHTML(
    post,
    user
) {

    const author =
        post.author || {};

    const displayName =
        escapeHTML(
            author.name ||
            post.username
        );

    const username =
        escapeHTML(
            post.username
        );

    const avatar =
        author.profilePicture
            ? `<img src="${author.profilePicture}" alt="${displayName}">`
            : `<span>${getInitials(
                author.name ||
                post.username
            )}</span>`;

    const likedClass =
        post.liked
            ? "liked"
            : "";

    const photoHTML =
        post.photo
            ? `<div class="post-image-wrap">
                <img
                    class="post-image"
                    src="${post.photo}"
                    alt="Post image"
                >
            </div>`
            : "";

    const metaHTML =
        `
        ${
            post.location
                ? `<span>📍 ${escapeHTML(
                    post.location
                )}</span>`
                : ""
        }

        ${
            post.feeling
                ? `<span>• ${escapeHTML(
                    post.feeling
                )}</span>`
                : ""
        }
        `;

    return `
        <article
            class="post-card"
            data-post-id="${post._id}"
        >

            <div class="post-header">

                <div class="post-author profile-link"
                     data-profile-user="${username}"
                     role="link"
                     tabindex="0"
                     title="Open ${displayName}'s profile">

                    <div class="post-avatar">
                        ${avatar}
                    </div>

                    <div class="post-author-info">
                        <strong>
                            ${displayName}
                        </strong>

                        <span>
                            @${username}
                            ·
                            ${formatTime(
                                post.createdAt
                            )}
                        </span>
                    </div>

                </div>

                ${
                    post.username ===
                    user.username
                        ? `
                        <button
                            class="post-more"
                            data-delete-post="${post._id}"
                        >
                            ⋯
                        </button>
                        `
                        : ""
                }

            </div>


            <div class="post-content">

                <p>
                    ${escapeHTML(
                        post.content
                    )}
                </p>

                ${
                    metaHTML.trim()
                        ? `
                        <div class="post-meta">
                            ${metaHTML}
                        </div>
                        `
                        : ""
                }

            </div>

            ${photoHTML}


            <div class="post-actions">

                <button
                    class="post-action like-btn ${likedClass}"
                    data-like-post="${post._id}"
                >
                    <span class="action-icon">
                        ${post.liked
                            ? "♥"
                            : "♡"}
                    </span>

                    <span class="like-count">
                        ${post.likes || 0}
                    </span>
                </button>


                <button
                    class="post-action comment-toggle"
                    data-comment-post="${post._id}"
                >
                    <span class="action-icon">
                        💬
                    </span>

                    <span>
                        Comment
                    </span>
                </button>


                <button
                    class="post-action share-post"
                    data-share-post="${post._id}"
                >
                    <span class="action-icon">
                        ↗
                    </span>

                    <span>
                        Share
                    </span>
                </button>

            </div>


            <div
                class="comments-area"
                id="comments-${post._id}"
            ></div>

        </article>
    `;
}


// =====================================================
// POST ACTIONS
// =====================================================

function setupPostActions(
    container,
    user
) {

    container
        .querySelectorAll(
            "[data-like-post]"
        )
        .forEach(button => {

            button.onclick =
                async () => {

                    const postId =
                        button.dataset
                            .likePost;

                    const isLiked =
                        button.classList
                            .contains(
                                "liked"
                            );

                    button.disabled = true;

                    try {

                        const response =
                            await fetch(
                                `/api/posts/${postId}/${isLiked
                                    ? "unlike"
                                    : "like"
                                }`,
                                {
                                    method:
                                        "PUT",
                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },
                                    body:
                                        JSON.stringify({
                                            username:
                                                user.username
                                        })
                                }
                            );

                        const data =
                            await response.json();

                        if (!response.ok) {
                            throw new Error(
                                data.message
                            );
                        }

                        const card =
                            button.closest(
                                ".post-card"
                            );

                        const count =
                            button.querySelector(
                                ".like-count"
                            );

                        const icon =
                            button.querySelector(
                                ".action-icon"
                            );

                        count.textContent =
                            data.likes;

                        if (data.liked) {

                            button.classList.add(
                                "liked"
                            );

                            icon.textContent =
                                "♥";

                        } else {

                            button.classList.remove(
                                "liked"
                            );

                            icon.textContent =
                                "♡";
                        }

                    } catch (error) {

                        console.error(
                            "Like error:",
                            error
                        );

                    } finally {

                        button.disabled =
                            false;
                    }
                };
        });


    container
        .querySelectorAll(
            "[data-comment-post]"
        )
        .forEach(button => {

            button.onclick =
                () => {

                    const postId =
                        button.dataset
                            .commentPost;

                    showCommentBox(
                        postId,
                        user
                    );
                };
        });


    container
        .querySelectorAll(
            "[data-share-post]"
        )
        .forEach(button => {

            button.onclick =
                async () => {

                    const postId =
                        button.dataset.sharePost;

                    const card =
                        button.closest(
                            ".post-card"
                        );

                    const text =
                        card
                            ?.querySelector(
                                ".post-content p"
                            )
                            ?.textContent
                            ?.trim() ||
                        "Check this VYBE ✨";

                    const url =
                        `${window.location.origin}/index.html?post=${encodeURIComponent(postId)}`;

                    try {

                        if (navigator.share) {

                            await navigator.share({
                                title: "VYBE",
                                text,
                                url
                            });

                            showToast(
                                "VYBE shared successfully ✨"
                            );

                        } else {

                            await navigator.clipboard.writeText(
                                url
                            );

                            showToast(
                                "Post link copied ✨"
                            );
                        }

                    } catch (error) {

                        if (error?.name !== "AbortError") {

                            try {
                                await navigator.clipboard.writeText(url);
                                showToast("Post link copied ✨");
                            } catch {
                                showToast("Share link ready ✨");
                            }
                        }
                    }
                };
        });


    container
        .querySelectorAll(
            "[data-delete-post]"
        )
        .forEach(button => {

            button.onclick =
                async () => {

                    if (
                        !confirm(
                            "Delete this post?"
                        )
                    ) {
                        return;
                    }

                    try {

                        const response =
                            await fetch(
                                `/api/posts/${button.dataset.deletePost}`,
                                {
                                    method:
                                        "DELETE"
                                }
                            );

                        if (!response.ok) {
                            throw new Error(
                                "Delete failed"
                            );
                        }

                        await loadFeed(
                            user
                        );

                        showToast(
                            "Post deleted"
                        );

                    } catch (error) {

                        console.error(
                            error
                        );

                        showToast(
                            "Could not delete post"
                        );
                    }
                };
        });
}


// =====================================================
// COMMENTS
// =====================================================

async function showCommentBox(
    postId,
    user
) {

    const area =
        document.getElementById(
            `comments-${postId}`
        );

    if (!area) return;

    if (
        area.classList.contains(
            "open"
        )
    ) {
        area.classList.remove(
            "open"
        );

        area.innerHTML = "";

        return;
    }

    area.classList.add(
        "open"
    );

    area.innerHTML =
        `
        <div class="comment-composer">
            <input
                type="text"
                id="commentInput-${postId}"
                placeholder="Write a comment..."
            >

            <button
                type="button"
                id="commentSubmit-${postId}"
            >
                Post
            </button>
        </div>

        <div
            class="comment-list"
            id="commentList-${postId}"
        >
            Loading comments...
        </div>
        `;

    const submit =
        document.getElementById(
            `commentSubmit-${postId}`
        );

    const input =
        document.getElementById(
            `commentInput-${postId}`
        );

    submit.onclick =
        async () => {

            const content =
                input.value.trim();

            if (!content) return;

            submit.disabled = true;

            try {

                const response =
                    await fetch(
                        "/api/comments",
                        {
                            method:
                                "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    username:
                                        user.username,
                                    postId,
                                    content
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message
                    );
                }

                input.value = "";

                await loadComments(
                    postId
                );

            } catch (error) {

                showToast(
                    error.message ||
                    "Unable to comment"
                );

            } finally {

                submit.disabled =
                    false;
            }
        };

    await loadComments(
        postId
    );
}


async function loadComments(
    postId
) {

    const list =
        document.getElementById(
            `commentList-${postId}`
        );

    if (!list) return;

    try {

        const response =
            await fetch(
                `/api/comments/${postId}`
            );

        const comments =
            await response.json();

        if (!comments.length) {

            list.innerHTML =
                `<span class="no-comments">
                    No comments yet. Start the conversation!
                </span>`;

            return;
        }

        list.innerHTML =
            comments.map(
                comment =>
                    `
                    <div class="comment-item">
                        <div class="comment-avatar">
                            ${getInitials(
                                comment.username
                            )}
                        </div>

                        <div>
                            <strong>
                                @${escapeHTML(
                                    comment.username
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    comment.content
                                )}
                            </p>
                        </div>
                    </div>
                    `
            ).join("");

    } catch {

        list.innerHTML =
            `<span class="no-comments">
                Unable to load comments.
            </span>`;
    }
}


// =====================================================
// COMPOSER
// =====================================================

function setupComposer(
    user
) {

    const postButton =
        document.querySelector(
            ".post-button"
        );

    const textarea =
        document.getElementById(
            "postText"
        );

    if (!postButton || !textarea)
        return;

    let selectedPhoto = "";
    let selectedFeeling = "";
    let selectedLocation = "";

    // Photo
    const photoButton =
        document.getElementById(
            "photoButton"
        );

    if (photoButton) {

        const input =
            document.createElement(
                "input"
            );

        input.type = "file";
        input.accept =
            "image/*";
        input.style.display =
            "none";

        document.body.appendChild(
            input
        );

        photoButton.onclick =
            () => input.click();

        input.onchange =
            () => {

                const file =
                    input.files?.[0];

                if (!file) return;

                const reader =
                    new FileReader();

                reader.onload =
                    () => {

                        selectedPhoto =
                            reader.result;

                        photoButton.innerHTML =
                            "📷 <span>Photo added</span>";

                        showToast(
                            "Photo attached 📸"
                        );
                    };

                reader.readAsDataURL(
                    file
                );
            };
    }


    // VYBE MOOD + LOCATION STUDIO
    const feelingButton = document.getElementById("feelingButton");
    const locationButton = document.getElementById("locationButton");
    const vibeModal = document.getElementById("vibeModal");
    const vibeChoices = document.getElementById("vibeChoices");
    const vibeTitle = document.getElementById("vibeModalTitle");
    const vibeSubtitle = document.getElementById("vibeModalSubtitle");
    const vibeCustomInput = document.getElementById("vibeCustomInput");
    let vibeMode = "feeling";

    const feelings = [
        ["✨","Radiant"],["🎯","Focused"],["🌿","Grateful"],["🎨","Creative"],
        ["⚡","Excited"],["☁️","Calm"],["🚀","Motivated"],["🧸","Cozy"],
        ["🔭","Curious"],["👑","Unstoppable"]
    ];
    const locations = [
        ["🏠","At home"],["🎓","Campus"],["☕","Coffee shop"],["🌆","Mumbai"],
        ["🚆","On the move"],["🌴","Weekend escape"],["💻","Work mode"]
    ];

    function openVibeStudio(mode) {
        if (!vibeModal || !vibeChoices) return;
        vibeMode = mode;
        vibeTitle.textContent = mode === "feeling" ? "What’s your energy today? ✦" : "Where’s the VYBE? ⌖";
        vibeSubtitle.textContent = mode === "feeling" ? "Pick a mood and turn a plain post into a little story." : "Add a place without interrupting your flow.";
        const choices = mode === "feeling" ? feelings : locations;
        vibeChoices.innerHTML = choices.map(([icon,label]) => `<button type="button" class="vibe-choice" data-vibe-value="${escapeHTML(label)}"><span>${icon}</span><strong>${escapeHTML(label)}</strong></button>`).join("");
        vibeCustomInput.value = "";
        vibeModal.classList.add("show");
        vibeModal.setAttribute("aria-hidden","false");
        vibeChoices.querySelectorAll(".vibe-choice").forEach(btn => {
            btn.onclick = () => {
                const value = btn.dataset.vibeValue;
                if (mode === "feeling") {
                    selectedFeeling = "feeling " + value.toLowerCase();
                    if (feelingButton) feelingButton.innerHTML = `✨ <span>${escapeHTML(value)}</span>`;
                } else {
                    selectedLocation = value;
                    if (locationButton) locationButton.innerHTML = `⌖ <span>${escapeHTML(value)}</span>`;
                }
                closeVibeStudio();
            };
        });
    }

    function closeVibeStudio() {
        if (!vibeModal) return;
        vibeModal.classList.remove("show");
        vibeModal.setAttribute("aria-hidden","true");
    }

    if (feelingButton) feelingButton.onclick = () => openVibeStudio("feeling");
    if (locationButton) locationButton.onclick = () => openVibeStudio("location");
    document.getElementById("closeVibeModal")?.addEventListener("click", closeVibeStudio);
    document.getElementById("vibeDone")?.addEventListener("click", closeVibeStudio);
    vibeModal?.addEventListener("click", e => { if (e.target === vibeModal) closeVibeStudio(); });
    document.getElementById("vibeCustomApply")?.addEventListener("click", () => {
        const value = vibeCustomInput?.value.trim();
        if (!value) return;
        if (vibeMode === "feeling") {
            selectedFeeling = "feeling " + value;
            if (feelingButton) feelingButton.innerHTML = `✨ <span>${escapeHTML(value)}</span>`;
        } else {
            selectedLocation = value;
            if (locationButton) locationButton.innerHTML = `⌖ <span>${escapeHTML(value)}</span>`;
        }
        closeVibeStudio();
    });


    postButton.onclick =
        async () => {

            const content =
                textarea.value.trim();

            if (!content) {

                showToast(
                    "Write something first ✍️"
                );

                textarea.focus();

                return;
            }

            postButton.disabled =
                true;

            postButton.textContent =
                "Posting...";


            try {

                const response =
                    await fetch(
                        "/api/posts",
                        {
                            method:
                                "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    username:
                                        user.username,
                                    content,
                                    photo:
                                        selectedPhoto,
                                    feeling:
                                        selectedFeeling,
                                    location:
                                        selectedLocation
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Unable to create post."
                    );
                }

                textarea.value = "";

                selectedPhoto = "";
                selectedFeeling = "";
                selectedLocation = "";

                if (photoButton) {
                    photoButton.innerHTML =
                        "📷 <span>Photo</span>";
                }

                if (feelingButton) {
                    feelingButton.innerHTML =
                        "😊 <span>Feeling</span>";
                }

                if (locationButton) {
                    locationButton.innerHTML =
                        "📍 <span>Location</span>";
                }

                showToast(
                    "Post shared successfully! 🎉"
                );

                await loadFeed(
                    user
                );

                await loadHomeProfile(
                    user
                );

            } catch (error) {

                console.error(
                    "Create post error:",
                    error
                );

                showToast(
                    error.message ||
                    "Unable to create post."
                );

            } finally {

                postButton.disabled =
                    false;

                postButton.textContent =
                    "Share Post";
            }
        };
}


// =====================================================
// TRENDING
// =====================================================

async function loadTrending(
    user
) {

    const container =
        document.getElementById(
            "trendingList"
        );

    if (!container) return;

    try {

        const response =
            await fetch(
                `/api/posts?current=${encodeURIComponent(
                    user.username
                )}`
            );

        const posts =
            await response.json();

        const shuffled =
            [...posts]
                .sort(
                    () =>
                        Math.random() -
                        0.5
                )
                .slice(0, 5);

        container.innerHTML =
            shuffled.map(
                (post, index) =>
                    `
                    <div class="trending-item">

                        <span class="trending-number">
                            ${String(
                                index + 1
                            ).padStart(
                                2,
                                "0"
                            )}
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    post.content
                                )}
                            </strong>

                            <span>
                                ${post.likes || 0}
                                likes
                            </span>
                        </div>

                    </div>
                    `
            ).join("");

    } catch {

        container.innerHTML =
            `<div class="empty-side">
                Trending is loading...
            </div>`;
    }
}


// =====================================================
// WHO TO FOLLOW
// =====================================================

async function loadSuggestions(user) {
    const container = document.getElementById("suggestedUsers");
    if (!container) return;

    try {
        const response = await fetch(`/api/users?current=${encodeURIComponent(user.username)}`);
        const users = response.ok ? await response.json() : [];
        const selected = shuffleArray(users).slice(0, 4);

        container.innerHTML = selected.map(person => `
            <div class="suggested-user" data-profile-user="${escapeHTML(person.username)}">
                <div class="suggested-avatar">
                    ${person.profilePicture
                        ? `<img src="${person.profilePicture}" alt="${escapeHTML(person.name)}">`
                        : getInitials(person.name)}
                </div>
                <div class="suggested-info">
                    <strong>${escapeHTML(person.name)}</strong>
                    <span>@${escapeHTML(person.username)}</span>
                </div>
                <div class="follow-actions">
                    <button type="button" class="message-mini-btn" data-message-user="${escapeHTML(person.username)}" aria-label="Message ${escapeHTML(person.name)}">✉</button>
                    <button type="button" class="follow-btn ${person.isFollowing ? "following" : ""}"
                        data-follow-id="${person._id}" data-following="${person.isFollowing}">
                        ${person.isFollowing ? "✓" : "+"}
                    </button>
                </div>
            </div>
        `).join("") || `<div class="empty-side">No new people yet.</div>`;

        container.querySelectorAll("[data-profile-user]").forEach(row => {
            row.addEventListener("click", event => {
                if (event.target.closest(".follow-btn")) return;
                location.href = `profile.html?user=${encodeURIComponent(row.dataset.profileUser)}`;
            });
        });

        container.querySelectorAll("[data-message-user]").forEach(button => {
            button.onclick = event => {
                event.stopPropagation();
                const person = users.find(u => String(u.username).toLowerCase() === String(button.dataset.messageUser).toLowerCase());
                if (person) openHomeDM(person, user);
            };
        });

        container.querySelectorAll("[data-follow-id]").forEach(button => {
            button.onclick = async event => {
                event.stopPropagation();
                const isFollowing = button.dataset.following === "true";
                try {
                    const response = await fetch(`/api/users/${button.dataset.followId}/${isFollowing ? "unfollow" : "follow"}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ currentUsername: user.username })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    button.dataset.following = String(data.isFollowing);
                    button.textContent = data.isFollowing ? "✓" : "+";
                    button.classList.toggle("following", data.isFollowing);
                    showToast(data.isFollowing ? "Following ✨" : "Unfollowed");
                } catch (error) {
                    showToast(error.message || "Unable to update follow.");
                }
            };
        });
    } catch {
        container.innerHTML = `<div class="empty-side">No suggestions available.</div>`;
    }
}


// =====================================================
// QUICK MESSAGE
// =====================================================

let activeHomeDMRecipient = null;
let activeHomeDMViewer = null;

function openHomeDM(recipient, viewer) {
    const modal = document.getElementById("dmModal");
    if (!modal) return;

    activeHomeDMRecipient = recipient;
    activeHomeDMViewer = viewer;

    const avatar = document.getElementById("dmAvatar");
    const title = document.getElementById("dmTitle");
    const subtitle = document.getElementById("dmSubtitle");

    if (avatar) renderAvatar(avatar, recipient.profilePicture, recipient.name || recipient.username);
    if (title) title.textContent = recipient.name || recipient.username;
    if (subtitle) subtitle.textContent = `@${recipient.username} · private VYBE`;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    loadHomeDM();
}

async function loadHomeDM() {
    const list = document.getElementById("dmMessages");
    if (!list || !activeHomeDMRecipient || !activeHomeDMViewer) return;

    list.innerHTML = `<div class="dm-loading">Loading your conversation ✦</div>`;

    try {
        const response = await fetch(`/api/messages?user=${encodeURIComponent(activeHomeDMViewer.username)}&with=${encodeURIComponent(activeHomeDMRecipient.username)}`);
        const messages = response.ok ? await response.json() : [];

        list.innerHTML = messages.length
            ? messages.map(m => `
                <div class="dm-bubble ${String(m.from).toLowerCase() === String(activeHomeDMViewer.username).toLowerCase() ? "mine" : "theirs"}">
                    <p>${escapeHTML(m.content)}</p>
                    <span>${new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span>
                </div>
              `).join("")
            : `<div class="dm-empty"><strong>Start a real conversation.</strong><span>Send a quick note and break the ice.</span></div>`;

        list.scrollTop = list.scrollHeight;
    } catch {
        list.innerHTML = `<div class="dm-empty">Conversation unavailable right now.</div>`;
    }
}

function closeHomeDM() {
    const modal = document.getElementById("dmModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    activeHomeDMRecipient = null;
}

function setupHomeDM() {
    const modal = document.getElementById("dmModal");
    if (!modal) return;

    document.getElementById("closeDmModal")?.addEventListener("click", closeHomeDM);
    modal.addEventListener("click", event => {
        if (event.target === modal) closeHomeDM();
    });

    const input = document.getElementById("dmInput");
    const send = document.getElementById("dmSend");

    async function sendHomeDM() {
        const content = input?.value.trim();
        if (!content || !activeHomeDMRecipient || !activeHomeDMViewer) return;

        send.disabled = true;
        try {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({
                    from: activeHomeDMViewer.username,
                    to: activeHomeDMRecipient.username,
                    content
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to send message.");
            input.value = "";
            await loadHomeDM();
        } catch (error) {
            showToast(error.message || "Unable to send message.");
        } finally {
            send.disabled = false;
            input?.focus();
        }
    }

    send?.addEventListener("click", sendHomeDM);
    input?.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendHomeDM();
        }
    });
}

document.addEventListener("DOMContentLoaded", setupHomeDM);

// =====================================================
// NOTIFICATIONS
// =====================================================

function setupNotificationPanel() {
    // Notifications were intentionally removed from VYBE's UI.
}


// =====================================================
// TOAST
// =====================================================

function showToast(
    message
) {

    let toast =
        document.getElementById(
            "scToast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "scToast";

        toast.className =
            "sc-toast";

        document.body.appendChild(
            toast
        );
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        window.scToastTimer
    );

    window.scToastTimer =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            2500
        );
}


// =====================================================
// HELPERS
// =====================================================

function formatTime(
    dateString
) {

    const date =
        new Date(dateString);

    const seconds =
        Math.floor(
            (Date.now() - date.getTime()) /
            1000
        );

    if (seconds < 60) {
        return "Just now";
    }

    const minutes =
        Math.floor(
            seconds / 60
        );

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days =
        Math.floor(
            hours / 24
        );

    if (days < 7) {
        return `${days}d ago`;
    }

    return date.toLocaleDateString();
}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}