document.addEventListener("DOMContentLoaded", async () => {
  const raw = localStorage.getItem("socialconnectUser");
  if (!raw) { location.href = "login.html"; return; }

  const user = JSON.parse(raw);
  const $ = id => document.getElementById(id);

  $("miniName").textContent = user.name || user.username;
  $("miniUsername").textContent = "@" + user.username;
  if ($("miniAvatar")) {
    $("miniAvatar").innerHTML = user.profilePicture
      ? `<img src="${user.profilePicture}" alt="${escapeHTML(user.name || user.username)}">`
      : getInitials(user.name || user.username);
  }

  document.querySelectorAll("[data-logout]").forEach(b => {
    b.onclick = () => {
      localStorage.removeItem("socialconnectUser");
      location.href = "login.html";
    };
  });

  let people = [];
  let posts = [];
  let tab = "people";

  async function load() {
    try {
      const [u, p] = await Promise.all([
        fetch(`/api/users?current=${encodeURIComponent(user.username)}`),
        fetch(`/api/posts?current=${encodeURIComponent(user.username)}`)
      ]);
      people = u.ok ? await u.json() : [];
      posts = p.ok ? await p.json() : [];
      render();
    } catch (e) {
      console.error(e);
      $("exploreResults").innerHTML = '<div class="empty-side">Unable to load Explore right now.</div>';
    }
  }

  function render() {
    const q = $("exploreSearch").value.trim().toLowerCase();
    const box = $("exploreResults");

    if (tab === "people") {
      const list = people
        .filter(p => !q || p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
        .slice(0, 12);

      box.className = "discover-grid";
      box.innerHTML = list.length
        ? list.map(p => `
          <article class="discover-card" data-profile-user="${escapeHTML(p.username)}">
            <div class="discover-card-top">
              <button class="discover-avatar profile-open-btn" data-open-profile="${escapeHTML(p.username)}" type="button" aria-label="Open ${escapeHTML(p.name)}'s profile">
                ${p.profilePicture ? `<img src="${p.profilePicture}" alt="${escapeHTML(p.name)}">` : getInitials(p.name || p.username)}
              </button>
              <span class="discover-status">${p.isFollowing ? "Following" : "On VYBE"}</span>
            </div>
            <button class="discover-name profile-open-btn" data-open-profile="${escapeHTML(p.username)}" type="button">${escapeHTML(p.name)}</button>
            <p class="discover-handle">@${escapeHTML(p.username)}</p>
            <p class="discover-bio">${escapeHTML(p.bio || "Exploring VYBE ✦")}</p>
            <div class="discover-meta"><span>${p.followers || 0} followers</span><span>${p.following || 0} following</span></div>
            <div class="discover-actions">
              <button class="profile-view-btn profile-open-btn" data-open-profile="${escapeHTML(p.username)}" type="button">View profile</button>
              <button class="discover-follow" data-follow="${p._id}" data-state="${p.isFollowing}" type="button">${p.isFollowing ? "Following" : "Follow"}</button>
            </div>
          </article>
        `).join("")
        : '<div class="empty-side">No people found.</div>';

      box.querySelectorAll("[data-open-profile]").forEach(btn => {
        btn.onclick = e => {
          e.stopPropagation();
          location.href = `profile.html?user=${encodeURIComponent(btn.dataset.openProfile)}`;
        };
      });

      box.querySelectorAll("[data-follow]").forEach(btn => {
        btn.onclick = async e => {
          e.stopPropagation();
          const following = btn.dataset.state === "true";
          btn.disabled = true;
          try {
            const r = await fetch(`/api/users/${btn.dataset.follow}/${following ? "unfollow" : "follow"}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentUsername: user.username })
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message || "Unable to update follow.");
            await load();
          } catch (error) {
            btn.disabled = false;
            alert(error.message);
          }
        };
      });
    } else {
      const list = posts
        .filter(p => !q || p.content.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
        .slice(0, 12);

      box.className = "discover-grid";
      box.innerHTML = list.length
        ? list.map(p => `
          <article class="discover-card discover-post-card">
            <button class="discover-post-author profile-open-btn" data-open-profile="${escapeHTML(p.username)}" type="button">
              <div class="discover-avatar small">
                ${p.author?.profilePicture ? `<img src="${p.author.profilePicture}" alt="">` : getInitials(p.author?.name || p.username)}
              </div>
              <span><strong>${escapeHTML(p.author?.name || p.username)}</strong><small>@${escapeHTML(p.username)}</small></span>
            </button>
            ${p.photo ? `<img class="discover-post-image" src="${p.photo}" alt="Post by ${escapeHTML(p.username)}">` : ""}
            <p class="discover-post-text">${escapeHTML(p.content)}</p>
            <div class="discover-meta"><span>♥ ${p.likes || 0} likes</span><button class="text-profile-link profile-open-btn" data-open-profile="${escapeHTML(p.username)}" type="button">Open profile ↗</button></div>
          </article>
        `).join("")
        : '<div class="empty-side">No posts found.</div>';

      box.querySelectorAll("[data-open-profile]").forEach(btn => {
        btn.onclick = () => { location.href = `profile.html?user=${encodeURIComponent(btn.dataset.openProfile)}`; };
      });
    }
  }

  document.querySelectorAll("[data-tab]").forEach(b => {
    b.onclick = () => {
      tab = b.dataset.tab;
      document.querySelectorAll(".explore-tab").forEach(x => x.classList.toggle("active", x === b));
      render();
    };
  });

  $("searchBtn").onclick = render;
  $("exploreSearch").oninput = render;
  await load();
});

function escapeHTML(v) {
  return String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function getInitials(v) {
  return String(v || "?").split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase();
}
