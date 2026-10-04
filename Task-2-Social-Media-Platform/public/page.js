document.addEventListener("DOMContentLoaded", async () => {
    const raw = localStorage.getItem("socialconnectUser");
    if (!raw) { location.href = "login.html"; return; }

    let user;
    try { user = JSON.parse(raw); }
    catch { localStorage.removeItem("socialconnectUser"); location.href = "login.html"; return; }

    const $ = id => document.getElementById(id);

    function applyUser(u) {
        if ($("miniName")) $("miniName").textContent = u.name || u.username;
        if ($("miniUsername")) $("miniUsername").textContent = "@" + u.username;
        if ($("miniAvatar")) {
            $("miniAvatar").innerHTML = u.profilePicture
                ? `<img src="${u.profilePicture}" alt="Profile">`
                : initials(u.name || u.username);
        }
        if ($("previewName")) $("previewName").textContent = u.name || u.username;
        if ($("previewAvatar")) $("previewAvatar").textContent = initials(u.name || u.username);
    }

    function initials(name) {
        return String(name || "?").split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase();
    }

    try {
        const response = await fetch(`/api/users/${encodeURIComponent(user.username)}`);
        if (response.ok) {
            const fresh = await response.json();
            user = fresh;
            localStorage.setItem("socialconnectUser", JSON.stringify(fresh));
        }
    } catch (error) { console.error("User refresh error:", error); }

    applyUser(user);

    document.querySelectorAll("[data-logout]").forEach(button => {
        button.onclick = () => {
            localStorage.removeItem("socialconnectUser");
            location.href = "login.html";
        };
    });

    // Activity page
    const list = $("activityList");
    if (list) {
        try {
            const response = await fetch(`/api/activity/${encodeURIComponent(user.username)}`);
            const items = response.ok ? await response.json() : [];
            list.innerHTML = items.length
                ? items.map(a => `<div class="activity-item"><div class="activity-icon">${a.type === "like" ? "♥" : a.type === "comment" ? "💬" : a.type === "follow" ? "＋" : "✦"}</div><div><strong>${escapeHTML(a.text)}</strong><span>${formatTime(a.createdAt)}</span></div></div>`).join("")
                : `<div class="empty-side">No activity yet. Start a conversation and your timeline will come alive.</div>`;
        } catch {
            list.innerHTML = `<div class="empty-side">Unable to load activity.</div>`;
        }
    }

    // Settings
    const settingsKeys = [
        "likeNotify", "commentNotify", "followNotify", "emailDigest",
        "motionToggle", "compactToggle", "onlineToggle", "personalizedToggle",
        "insightsToggle", "previewToggle"
    ];

    settingsKeys.forEach(id => {
        const el = $(id);
        if (el) el.checked = localStorage.getItem("vybe_" + id) === "true" || (el.defaultChecked && localStorage.getItem("vybe_" + id) !== "false");
    });

    const themeToggle = $("themeToggle");
    if (themeToggle) {
        const dark = localStorage.getItem("socialconnectTheme") === "dark";
        themeToggle.checked = dark;
        document.body.classList.toggle("dark-mode", dark);
        themeToggle.onchange = () => {
            const enabled = themeToggle.checked;
            localStorage.setItem("socialconnectTheme", enabled ? "dark" : "light");
            document.body.classList.toggle("dark-mode", enabled);
        };
    }

    const motionToggle = $("motionToggle");
    if (motionToggle) motionToggle.onchange = () => document.body.classList.toggle("reduce-motion", motionToggle.checked);

    const compactToggle = $("compactToggle");
    if (compactToggle) compactToggle.onchange = () => document.body.classList.toggle("compact-mode", compactToggle.checked);

    const visibility = $("visibilitySetting");
    if (visibility) visibility.value = localStorage.getItem("vybe_visibility") || "public";

    const save = $("saveSettings");
    if (save) {
        save.onclick = () => {
            settingsKeys.forEach(id => {
                const el = $(id);
                if (el) localStorage.setItem("vybe_" + id, String(el.checked));
            });
            if (visibility) localStorage.setItem("vybe_visibility", visibility.value);
            if (motionToggle) document.body.classList.toggle("reduce-motion", motionToggle.checked);
            if (compactToggle) document.body.classList.toggle("compact-mode", compactToggle.checked);
            const msg = $("settingsMessage");
            if (msg) { msg.textContent = "Preferences saved ✓"; setTimeout(() => msg.textContent = "", 1800); }
            save.textContent = "Saved ✓";
            setTimeout(() => save.textContent = "Save preferences", 1600);
        };
    }

    const reset = $("resetSettings");
    if (reset) reset.onclick = () => {
        settingsKeys.forEach(id => localStorage.removeItem("vybe_" + id));
        localStorage.removeItem("vybe_visibility");
        localStorage.setItem("socialconnectTheme", "light");
        location.reload();
    };

    const logoutSettings = $("logoutSettings");
    if (logoutSettings) logoutSettings.onclick = () => {
        localStorage.removeItem("socialconnectUser");
        location.href = "login.html";
    };
});

function formatTime(v) {
    const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
    if (s < 60) return "Just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d < 7 ? `${d}d ago` : new Date(v).toLocaleDateString();
}

function escapeHTML(v) {
    return String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
