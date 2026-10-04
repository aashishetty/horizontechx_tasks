document.addEventListener("DOMContentLoaded", async function () {

    const user = getUser();

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    const timeline = document.querySelector("#activityTimeline");
    const searchInput = document.querySelector("#pageSearch");
    const refreshButton = document.querySelector("#refreshActivity");
    const filterButtons = document.querySelectorAll(".activity-filter");

    // Display the currently logged-in user in the top bar.
    const topbarName = document.querySelector("#topbarUserName");
    const topbarUsername = document.querySelector("#topbarUserUsername");
    const topbarAvatar = document.querySelector("#topbarUserAvatar");

    const displayName = user.name || user.username || "User";

    if (topbarName) topbarName.textContent = displayName;
    if (topbarUsername) topbarUsername.textContent = user.username ? "@" + user.username : "";
    if (topbarAvatar) topbarAvatar.textContent = displayName.charAt(0).toUpperCase();

    let activities = [];
    let currentFilter = "all";

    function getUser() {
        try {
            return JSON.parse(
                localStorage.getItem("taskflowUser") || ""
            );
        } catch {
            return null;
        }
    }

    function escapeHtml(value) {
        return String(value || "").replace(
            /[&<>"']/g,
            function (character) {
                return {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[character];
            }
        );
    }

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function isCompleted(task) {
        return [
            "completed",
            "done",
            "complete"
        ].includes(
            String(task.status).toLowerCase()
        );
    }

    async function loadActivity() {

        activities = [];

        try {

            const id = user.id || user._id;

            const response = await fetch(
                `/api/projects/user/${encodeURIComponent(id)}`
            );

            if (response.ok) {

                const data = await response.json();

                (data.projects || []).forEach(function (project) {

                    activities.push({
                        time: project.createdAt,
                        icon: "✦",
                        title: "Project created",
                        text: `${project.name || "Untitled project"} was added to your workspace.`,
                        type: "project",
                        completed: false
                    });

                });

            }

        } catch (error) {

            console.error(
                "Could not load project activity:",
                error
            );

        }

        try {

            const key =
                "taskflowTasks_" +
                (user.id || user._id || user.username);

            const tasks = JSON.parse(
                localStorage.getItem(key) || "[]"
            );

            tasks.forEach(function (task) {

                const completed = isCompleted(task);

                activities.push({
                    time:
                        task.updatedAt ||
                        task.createdAt,
                    icon: completed ? "✓" : "○",
                    title:
                        completed
                            ? "Task completed"
                            : "Task created",
                    text: task.title || "Untitled task",
                    type: "task",
                    completed: completed
                });

            });

        } catch (error) {

            console.error(
                "Could not load task activity:",
                error
            );

        }

        activities.sort(function (a, b) {
            return new Date(b.time) - new Date(a.time);
        });

        renderActivity();

    }

    function renderActivity() {

        const query =
            String(searchInput?.value || "")
                .trim()
                .toLowerCase();

        const filtered = activities.filter(function (activity) {

            const matchesFilter =
                currentFilter === "all" ||
                activity.type === currentFilter ||
                (
                    currentFilter === "completed" &&
                    activity.completed
                );

            const searchable =
                `${activity.title} ${activity.text}`
                    .toLowerCase();

            return matchesFilter &&
                (!query || searchable.includes(query));

        });

        if (!filtered.length) {

            timeline.innerHTML = `
                <div class="page-empty">
                    <div>◷</div>
                    <h3>No activity found</h3>
                    <p>Try another filter or create a project or task.</p>
                </div>
            `;

            return;
        }

        timeline.innerHTML =
            filtered
                .slice(0, 30)
                .map(function (activity) {

                    return `
                        <div class="timeline-item">
                            <div class="timeline-icon">
                                ${escapeHtml(activity.icon)}
                            </div>

                            <div class="timeline-content">
                                <strong>
                                    ${escapeHtml(activity.title)}
                                </strong>

                                <p>
                                    ${escapeHtml(activity.text)}
                                </p>

                                <small>
                                    ${formatDate(activity.time)}
                                </small>
                            </div>
                        </div>
                    `;

                })
                .join("");

    }

    filterButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                currentFilter =
                    button.dataset.filter;

                filterButtons.forEach(function (item) {
                    item.classList.toggle(
                        "active",
                        item === button
                    );
                });

                renderActivity();

            }
        );

    });

    searchInput?.addEventListener(
        "input",
        renderActivity
    );

    refreshButton?.addEventListener(
        "click",
        loadActivity
    );

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key.toLowerCase() === "t" &&
                !["INPUT", "TEXTAREA"].includes(
                    document.activeElement.tagName
                )
            ) {
                window.location.href = "/my-tasks.html";
            }

            if (
                event.key.toLowerCase() === "p" &&
                !["INPUT", "TEXTAREA"].includes(
                    document.activeElement.tagName
                )
            ) {
                window.location.href = "/profile.html";
            }

            if (
                event.key.toLowerCase() === "s" &&
                !["INPUT", "TEXTAREA"].includes(
                    document.activeElement.tagName
                )
            ) {
                window.location.href = "/settings.html";
            }

        }
    );

    window.logoutUser = function () {

        localStorage.removeItem(
            "taskflowUser"
        );

        window.location.href =
            "/login.html";

    };

    await loadActivity();

});
