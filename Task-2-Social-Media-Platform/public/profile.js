document.addEventListener("DOMContentLoaded", async () => {
    const raw = localStorage.getItem("socialconnectUser");
    if (!raw) { location.href = "login.html"; return; }

    let viewer;
    try { viewer = JSON.parse(raw); }
    catch { localStorage.removeItem("socialconnectUser"); location.href = "login.html"; return; }

    const params = new URLSearchParams(location.search);
    const requested = (params.get("user") || viewer.username).toLowerCase();
    const isOwn = requested === String(viewer.username).toLowerCase();
    const $ = id => document.getElementById(id);
    const initials = n => String(n || "?").split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase();
    const escapeHTML = v => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

    function apply(u) {
        $("miniName").textContent = u.name || u.username;
        $("miniUsername").textContent = "@" + u.username;
        $("profileName").textContent = u.name || u.username;
        $("profileUsername").textContent = "@" + u.username;
        $("profileBio").textContent = u.bio || "Welcome to VYBE.";
        $("followerCount").textContent = u.followers || 0;
        $("followingCount").textContent = u.following || 0;

        const picture = $("profilePicture");
        picture.innerHTML = u.profilePicture
            ? `<img src="${u.profilePicture}" alt="${escapeHTML(u.name || u.username)}">`
            : initials(u.name || u.username);

        setOptionalFact("profileRole", u.role, "✦ ");
        setOptionalFact("profileLocation", u.location, "⌖ ");
        setOptionalFact("profileWebsite", u.website, "↗ ", true);
        $("editProfile").textContent = "Edit profile";
        $("editProfile").hidden = !isOwn;
        const followBtn = $("profileFollow");
        const messageBtn = $("profileMessage");
        if (followBtn) {
            followBtn.hidden = isOwn;
            followBtn.textContent = u.isFollowing ? "✓ Following" : "Follow +";
            followBtn.classList.toggle("following", !!u.isFollowing);
        }
        if (messageBtn) messageBtn.hidden = isOwn;
    }

    function setOptionalFact(id, value, prefix = "", link = false) {
        const el = $(id);
        if (!el) return;
        if (!value) { el.hidden = true; el.textContent = ""; return; }
        el.hidden = false;
        if (link) {
            const safe = String(value).startsWith("http") ? value : `https://${value}`;
            el.innerHTML = `<a href="${safe}" target="_blank" rel="noopener">${prefix}${escapeHTML(String(value).replace(/^https?:\/\//, ""))}</a>`;
        } else el.textContent = prefix + value;
    }

    document.querySelectorAll("[data-logout]").forEach(b => b.onclick = () => {
        localStorage.removeItem("socialconnectUser");
        location.href = "login.html";
    });

    let user = null;
    try {
        const response = await fetch(`/api/users/${encodeURIComponent(requested)}?current=${encodeURIComponent(viewer.username)}`);
        if (response.ok) user = await response.json();
    } catch (e) { console.error("Profile load error:", e); }

    if (!user) {
        if (isOwn) user = viewer;
        else { alert("This profile could not be found."); location.href = "explore.html"; return; }
    }

    if (isOwn) localStorage.setItem("socialconnectUser", JSON.stringify(user));
    apply(user);

    let allPosts = [];
    try {
        const postsResponse = await fetch(`/api/posts?current=${encodeURIComponent(viewer.username)}`);
        allPosts = postsResponse.ok ? await postsResponse.json() : [];
        const mine = allPosts.filter(p => p.username === user.username);
        $("postCount").textContent = mine.length;
        $("profilePosts").innerHTML = mine.length
            ? mine.map(p => p.photo
                ? `<div class="post-grid-card"><img src="${p.photo}" alt="Post by ${escapeHTML(user.name)}"></div>`
                : `<div class="post-grid-card text-post"><span>VYBE</span><p>${escapeHTML(p.content)}</p></div>`).join("")
            : `<div class="empty-side profile-empty">No posts yet. Share the first VYBE.</div>`;

        const liked = isOwn ? allPosts.filter(p => p.liked) : [];
        $("likedPosts").innerHTML = liked.length
            ? liked.map(p => `<div class="liked-post"><strong>@${escapeHTML(p.username)}</strong><p>${escapeHTML(p.content)}</p><span>${p.likes || 0} likes</span></div>`).join("")
            : `<div class="empty-side">${isOwn ? "Your liked posts will appear here." : "Liked posts are private to the account owner."}</div>`;
    } catch (e) { console.error("Posts load error:", e); }

    $("aboutGrid").innerHTML = `
        <div class="about-chip"><strong>Role</strong><span>${escapeHTML(user.role || "Not added yet")}</span></div>
        <div class="about-chip"><strong>Location</strong><span>${escapeHTML(user.location || "Not added yet")}</span></div>
        <div class="about-chip"><strong>Website</strong><span>${user.website ? `<a href="${user.website.startsWith("http") ? user.website : "https://"+user.website}" target="_blank">${escapeHTML(user.website)}</a>` : "Not added yet"}</span></div>
        <div class="about-chip"><strong>VYBE member</strong><span>${user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined,{month:"long",year:"numeric"}) : "Active member"}</span></div>`;

    document.querySelectorAll(".profile-tab").forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll(".profile-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".profile-tab-panel").forEach(panel => panel.classList.remove("active"));
            tab.classList.add("active");
            $("tab-" + tab.dataset.tab).classList.add("active");
        };
    });

    $("editProfile").onclick = () => {
        $("editName").value = user.name || "";
        $("editRole").value = user.role || "";
        $("editLocation").value = user.location || "";
        $("editWebsite").value = user.website || "";
        $("editBio").value = user.bio || "";
        $("profileMessage").textContent = "";
        $("editPreviewName").textContent = user.name || "You";
        $("editPreviewRole").textContent = user.role || "Your headline";
        $("editPreviewBio").textContent = user.bio || "Your profile story will appear here.";
        $("editPreviewAvatar").textContent = initials(user.name || user.username);
        $("editModal").classList.add("show");
    };

    [["editName","editPreviewName"],["editRole","editPreviewRole"],["editBio","editPreviewBio"]].forEach(([source,target]) => {
        $(source)?.addEventListener("input", () => {
            $(target).textContent = $(source).value.trim() || (target === "editPreviewName" ? "You" : target === "editPreviewRole" ? "Your headline" : "Your profile story will appear here.");
        });
    });

    const followBtn = $("profileFollow");
    if (followBtn && !isOwn) {
        followBtn.onclick = async () => {
            const following = !!user.isFollowing;
            followBtn.disabled = true;
            try {
                const response = await fetch(`/api/users/${user._id}/${following ? "unfollow" : "follow"}`, {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ currentUsername: viewer.username })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Unable to update follow.");
                user.isFollowing = data.isFollowing;
                user.followers = data.followers;
                user.following = data.following;
                $("followerCount").textContent = data.followers;
                followBtn.textContent = data.isFollowing ? "✓ Following" : "Follow +";
                followBtn.classList.toggle("following", data.isFollowing);
            } catch (error) {
                alert(error.message);
            } finally { followBtn.disabled = false; }
        };
    }

    const messageBtn = $("profileMessage");
    const dmModal = $("dmModal");
    if (messageBtn && !isOwn) {
        messageBtn.onclick = () => openDM(user);
    }

    async function openDM(recipient) {
        if (!dmModal) return;
        $("dmAvatar").innerHTML = recipient.profilePicture ? `<img src="${recipient.profilePicture}" alt="">` : initials(recipient.name || recipient.username);
        $("dmTitle").textContent = recipient.name || recipient.username;
        $("dmSubtitle").textContent = `@${recipient.username} · private VYBE`;
        dmModal.classList.add("show");
        dmModal.setAttribute("aria-hidden", "false");
        await loadDM(recipient);
    }

    async function loadDM(recipient) {
        const list = $("dmMessages");
        if (!list) return;
        list.innerHTML = `<div class="dm-loading">Loading your conversation ✦</div>`;
        try {
            const response = await fetch(`/api/messages?user=${encodeURIComponent(viewer.username)}&with=${encodeURIComponent(recipient.username)}`);
            const messages = response.ok ? await response.json() : [];
            list.innerHTML = messages.length ? messages.map(m => `<div class="dm-bubble ${m.from === viewer.username.toLowerCase() ? "mine" : "theirs"}"><p>${escapeHTML(m.content)}</p><span>${new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span></div>`).join("") : `<div class="dm-empty"><strong>Start a real conversation.</strong><span>Send a quick note to ${escapeHTML(recipient.name || recipient.username)}.</span></div>`;
            list.scrollTop = list.scrollHeight;
        } catch { list.innerHTML = `<div class="dm-empty">Conversation unavailable right now.</div>`; }
    }

    $("closeDmModal")?.addEventListener("click", () => { dmModal?.classList.remove("show"); dmModal?.setAttribute("aria-hidden","true"); });
    dmModal?.addEventListener("click", e => { if (e.target === dmModal) { dmModal.classList.remove("show"); dmModal.setAttribute("aria-hidden","true"); } });
    $("dmSend")?.addEventListener("click", async () => {
        const input = $("dmInput");
        const content = input?.value.trim();
        if (!content) return;
        const button = $("dmSend"); button.disabled = true;
        try {
            const response = await fetch("/api/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ from:viewer.username, to:user.username, content }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to send message.");
            input.value = ""; await loadDM(user);
        } catch (error) { alert(error.message); } finally { button.disabled = false; }
    });
    $("dmInput")?.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("dmSend")?.click(); } });

    $("closeModal").onclick = () => $("editModal").classList.remove("show");
    $("editModal").onclick = e => { if (e.target.id === "editModal") $("editModal").classList.remove("show"); };

    $("profileForm").onsubmit = async e => {
        e.preventDefault();
        const button = e.target.querySelector("button[type=submit]");
        button.disabled = true; button.textContent = "Saving...";
        try {
            const response = await fetch(`/api/users/${encodeURIComponent(user.username)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: $("editName").value.trim(), role: $("editRole").value.trim(),
                    location: $("editLocation").value.trim(), website: $("editWebsite").value.trim(),
                    bio: $("editBio").value.trim()
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to update profile.");
            user = data.user;
            localStorage.setItem("socialconnectUser", JSON.stringify(user));
            apply(user);
            $("editModal").classList.remove("show");
        } catch (error) { $("profileMessage").textContent = error.message; }
        finally { button.disabled = false; button.textContent = "Save changes"; }
    };
});
