document.addEventListener("DOMContentLoaded", function () {
document.body.classList.add("taskflow-ready");
// ========================================
// USER
// ========================================

const storedUser = localStorage.getItem("taskflowUser");

if (!storedUser) {
    window.location.href = "/login.html";
    return;
}

let user;

try {
    user = JSON.parse(storedUser);
} catch (error) {
    localStorage.removeItem("taskflowUser");
    window.location.href = "/login.html";
    return;
}

const userId = user.id || user._id;

if (!userId) {
    window.location.href = "/login.html";
    return;
}


// ========================================
// ELEMENTS
// ========================================

const list = document.querySelector("#taskList");
const filter = document.querySelector("#taskFilter");
const search = document.querySelector("#pageSearch");

const modal = document.querySelector("#taskModal");
const form = document.querySelector("#taskForm");

const titleInput = document.querySelector("#taskTitle");
const descriptionInput = document.querySelector("#taskDescription");
const projectInput = document.querySelector("#taskProject");
const priorityInput = document.querySelector("#taskPriority");
const statusInput = document.querySelector("#taskStatus");
const assignedInput = document.querySelector("#taskAssignedTo");
const dueDateInput = document.querySelector("#taskDueDate");

const taskCommentInput =
    document.querySelector("#taskCommentInput");

const addTaskComment =
    document.querySelector("#addTaskComment");

const taskCommentsList =
    document.querySelector("#taskCommentsList");

const activeTasks =
    document.querySelector("#activeTasks");

const completedTasks =
    document.querySelector("#doneTasks");

const taskRate =
    document.querySelector("#taskRate");

const userName =
    document.querySelector("#userName");

const userUsername =
    document.querySelector("#userUsername");

const userAvatar =
    document.querySelector("#userAvatar");

const message =
    document.querySelector("#taskFormMessage");


// ========================================
// DATA
// ========================================

let tasks = [];
let projects = [];
let editingTaskId = null;

const pageParams =
    new URLSearchParams(window.location.search);

const requestedProjectId =
    pageParams.get("project");


// ========================================
// HELPERS
// ========================================

function escapeHTML(value) {

    return String(value || "")
        .replace(
            /[&<>"']/g,
            function (char) {

                return {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[char];

            }
        );

}


function formatDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


function isCompleted(task) {

    return String(task.status || "")
        .toLowerCase() === "completed";

}


function isOverdue(task) {

    if (!task.dueDate || isCompleted(task)) {
        return false;
    }

    const today = new Date();

    today.setHours(
        23,
        59,
        59,
        999
    );

    const due = new Date(task.dueDate);

    return due < today;

}


function getPriorityClass(priority) {

    return String(
        priority || "Medium"
    ).toLowerCase();

}


function showMessage(text, type = "") {

    if (!message) {
        return;
    }

    message.textContent = text;
    message.className =
        "form-message " + type;

}


function getTaskProjectId(task) {

    if (!task || !task.project) {
        return "";
    }

    if (typeof task.project === "string") {
        return task.project;
    }

    return task.project._id || "";
}


// ========================================
// DISPLAY USER
// ========================================

function displayUser() {

    const name =
        user.name ||
        user.username ||
        "User";

    const username =
        user.username ||
        "";

    if (userName) {
        userName.textContent = name;
    }

    if (userUsername) {
        userUsername.textContent =
            username
                ? "@" + username
                : "";
    }

    if (userAvatar) {
        userAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();
    }

    const topbarUserName = document.querySelector("#topbarUserName");
    const topbarUserUsername = document.querySelector("#topbarUserUsername");
    const topbarUserAvatar = document.querySelector("#topbarUserAvatar");

    if (topbarUserName) {
        topbarUserName.textContent = name;
    }

    if (topbarUserUsername) {
        topbarUserUsername.textContent = username ? "@" + username : "";
    }

    if (topbarUserAvatar) {
        topbarUserAvatar.textContent =
            name.charAt(0).toUpperCase();
    }

}


// ========================================
// LOAD PROJECTS
// ========================================

async function loadProjects() {

    if (!projectInput) {
        return;
    }

    projectInput.innerHTML = `
        <option value="">
            Loading projects...
        </option>
    `;

    try {

        const response =
            await fetch(
                `/api/projects/user/${encodeURIComponent(userId)}`
            );

        if (!response.ok) {
            throw new Error(
                "Could not load projects"
            );
        }

        const data =
            await response.json();

        projects =
            Array.isArray(data)
                ? data
                : data.projects || [];

        populateProjects();

        if (requestedProjectId) {
            const matchingProject =
                projects.find(
                    project =>
                        String(project._id) ===
                        String(requestedProjectId)
                );

            if (matchingProject) {
                projectInput.value =
                    matchingProject._id;
            }
        }

    } catch (error) {

        console.error(
            "Could not load projects:",
            error
        );

        projectInput.innerHTML = `
            <option value="">
                Could not load projects
            </option>
        `;

    }

}


// ========================================
// PROJECT DROPDOWN
// ========================================

function populateProjects() {

    if (!projectInput) {
        return;
    }

    projectInput.innerHTML = `
        <option value="">
            Select project
        </option>

        ${projects.map(
            project => `
                <option value="${escapeHTML(project._id)}">
                    ${escapeHTML(project.name)}
                </option>
            `
        ).join("")}
    `;

}


// ========================================
// OPEN PROJECT
// ========================================

function openProject(projectId) {

    if (!projectId) {

        alert(
            "This task is not connected to a project."
        );

        return;

    }

    window.location.href =
        `/project.html?id=${encodeURIComponent(projectId)}`;

}


// ========================================
// ADD OPEN PROJECT BUTTON TO MODAL
// ========================================

function createOpenProjectButton() {

    if (!projectInput) {
        return;
    }

    if (
        document.querySelector(
            "#openSelectedProject"
        )
    ) {
        return;
    }

    const button =
        document.createElement("button");

    button.type = "button";
    button.id = "openSelectedProject";
    button.className =
        "secondary-button project-open-button";

    button.textContent =
        "Open Project";

    button.addEventListener(
        "click",
        function () {

            openProject(
                projectInput.value
            );

        }
    );

    projectInput.parentElement.appendChild(
        button
    );

}


// ========================================
// LOAD USERS
// ========================================

async function loadUsers() {

    if (!assignedInput) {
        return;
    }

    try {

        const response =
            await fetch("/api/users");

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        const users =
            Array.isArray(data)
                ? data
                : data.users || [];

        assignedInput.innerHTML = `
            <option value="">
                Unassigned
            </option>

            ${users.map(
                person => `
                    <option value="${escapeHTML(person._id)}">
                        ${escapeHTML(
                            person.name ||
                            person.username ||
                            "User"
                        )}
                    </option>
                `
            ).join("")}
        `;

    } catch (error) {

        console.log(
            "Users endpoint unavailable."
        );

    }

}


// ========================================
// LOAD TASKS
// ========================================

async function loadTasks() {

    if (!list) {
        return;
    }

    

    try {

        const response =
            await fetch(
                `/api/tasks/user/${encodeURIComponent(userId)}`
            );

        if (!response.ok) {
            throw new Error(
                "Failed to load tasks"
            );
        }

        const data =
            await response.json();

        tasks =
            Array.isArray(data)
                ? data
                : data.tasks || [];

        console.log(
            "Tasks loaded:",
            tasks
        );

        render();

    } catch (error) {

        console.error(
            "Load tasks error:",
            error
        );

        list.innerHTML = `
            <div class="page-empty">

                <div>!</div>

                <h3>
                    Couldn't load tasks
                </h3>

                <p>
                    Please refresh and try again.
                </p>

            </div>
        `;

    }

}


// ========================================
// STATISTICS
// ========================================

function updateStats() {

    const total =
        tasks.length;

    const completed =
        tasks.filter(
            isCompleted
        ).length;

    const active =
        total - completed;

    const rate =
        total === 0
            ? 0
            : Math.round(
                completed /
                total *
                100
            );

    if (activeTasks) {
        activeTasks.textContent =
            active;
    }

    if (completedTasks) {
        completedTasks.textContent =
            completed;
    }

    if (taskRate) {
        taskRate.textContent =
            rate + "%";
    }

}


// ========================================
// RENDER
// ========================================

function render() {

    updateStats();

    if (!list) {
        return;
    }

    const mode =
        filter
            ? filter.value
            : "all";

    const query =
        search
            ? search.value
                .trim()
                .toLowerCase()
            : "";


    let visible =
        tasks.filter(
            function (task) {

                if (
                    mode ===
                    "completed"
                ) {
                    return isCompleted(task);
                }

                if (
                    mode ===
                    "active"
                ) {
                    return !isCompleted(task);
                }

                return true;

            }
        );


    if (query) {

        visible =
            visible.filter(
                function (task) {

                    const text = [

                        task.title,

                        task.description,

                        task.project?.name,

                        task.priority,

                        task.status,

                        task.assignedTo?.name,

                        task.assignedTo?.username

                    ]
                        .join(" ")
                        .toLowerCase();

                    return text.includes(
                        query
                    );

                }
            );

    }


    if (!visible.length) {

        list.innerHTML = `
            <div class="page-empty">

                <div>✓</div>

                <h3>
                    No tasks here
                </h3>

                <p>
                    Create a task and it will appear in your workspace.
                </p>

            </div>
        `;

        return;

    }


    list.innerHTML =
        visible
            .map(renderTask)
            .join("");

}


// ========================================
// RENDER TASK CARD
// ========================================

function renderTask(task) {

    const completed =
        isCompleted(task);

    const overdue =
        isOverdue(task);

    const priority =
        task.priority ||
        "Medium";

    const projectName =
        task.project?.name ||
        "No project";

    const projectId =
        getTaskProjectId(task);

    const assignedName =
        task.assignedTo?.name ||
        task.assignedTo?.username ||
        "Unassigned";


    return `
        <article
            class="
                page-task-item
                ${completed ? "is-done" : ""}
                ${overdue ? "is-overdue" : ""}
            "
            data-task-id="${escapeHTML(task._id)}"
        >

            <button
                type="button"
                class="
                    task-status-button
                    ${completed ? "done" : ""}
                "
                data-action="toggle"
                title="${
                    completed
                        ? "Mark as active"
                        : "Mark as done"
                }"
            >
                ${completed ? "✓" : "○"}
            </button>


            <div class="page-task-main">

                <div class="task-title-row">

                    <strong>
                        ${escapeHTML(task.title)}
                    </strong>

                    <span
                        class="
                            task-priority
                            ${getPriorityClass(priority)}
                        "
                    >
                        ${escapeHTML(priority)}
                    </span>

                </div>


                ${
                    task.description
                        ? `
                            <span>
                                ${escapeHTML(
                                    task.description
                                )}
                            </span>
                        `
                        : ""
                }


                <small>

                    ${escapeHTML(projectName)}

                    ·

                    ${escapeHTML(assignedName)}

                    ·

                    ${
                        task.dueDate
                            ? "Due " +
                              escapeHTML(
                                  formatDate(
                                      task.dueDate
                                  )
                              )
                            : "No due date"
                    }

                </small>


                ${
                    overdue
                        ? `
                            <em class="task-overdue">
                                ⚠ Overdue
                            </em>
                        `
                        : ""
                }

            </div>


            <div class="task-actions">

                ${
                    projectId
                        ? `
                            <button
                                type="button"
                                class="task-open-project secondary-button"
                                data-action="open-project"
                                title="Open project"
                            >
                                Open Project
                            </button>
                        `
                        : ""
                }


                <button
                    type="button"
                    class="task-edit"
                    data-action="edit"
                    title="Edit task"
                >
                    ✎
                </button>


                <button
                    type="button"
                    class="task-delete"
                    data-action="delete"
                    title="Delete task"
                >
                    ×
                </button>

            </div>

        </article>
    `;

}


// ========================================
// TASK ACTIONS
// ========================================

list?.addEventListener(
    "click",
    async function (event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }

        const taskElement =
            button.closest(
                "[data-task-id]"
            );

        if (!taskElement) {
            return;
        }

        const taskId =
            taskElement.dataset.taskId;

        const action =
            button.dataset.action;


        if (action === "toggle") {
            await toggleTask(taskId);
        }


        if (action === "delete") {
            await deleteTask(taskId);
        }


        if (action === "edit") {
            openEditTask(taskId);
        }


        if (action === "open-project") {

            const task =
                tasks.find(
                    item =>
                        String(item._id) ===
                        String(taskId)
                );

            if (task) {
                openProject(
                    getTaskProjectId(task)
                );
            }

        }

    }
);


// ========================================
// TOGGLE TASK
// ========================================

async function toggleTask(taskId) {

    const task =
        tasks.find(
            t =>
                String(t._id) ===
                String(taskId)
        );

    if (!task) {
        return;
    }

    const newStatus =
        isCompleted(task)
            ? "To Do"
            : "Completed";


    try {

        const response =
            await fetch(
                `/api/tasks/${taskId}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            status: newStatus
                        })

                }
            );


        if (!response.ok) {
            throw new Error(
                "Could not update task"
            );
        }


        const data =
            await response.json();

        const updated =
            data.task || data;


        tasks =
            tasks.map(
                task =>
                    String(task._id) ===
                    String(taskId)
                        ? updated
                        : task
            );


        render();

    } catch (error) {

        console.error(error);

        alert(
            "Could not update the task."
        );

    }

}


// ========================================
// DELETE TASK
// ========================================

async function deleteTask(taskId) {

    if (
        !confirm(
            "Are you sure you want to delete this task?"
        )
    ) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/tasks/${taskId}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {
            throw new Error(
                "Could not delete task"
            );
        }


        tasks =
            tasks.filter(
                task =>
                    String(task._id) !==
                    String(taskId)
            );


        render();

    } catch (error) {

        console.error(error);

        alert(
            "Could not delete the task."
        );

    }

}


// ========================================
// OPEN CREATE MODAL
// ========================================

function openModal() {

    editingTaskId = null;

    form?.reset();

    if (requestedProjectId && projectInput) {
        projectInput.value = requestedProjectId;
    }

    showMessage("");

    const heading =
        document.querySelector(
            ".modal-top h2"
        );

    if (heading) {
        heading.textContent =
            "Create Task";
    }


    const submitButton =
        form?.querySelector(
            "button[type='submit']"
        );

    if (submitButton) {
        submitButton.textContent =
            "Create Task";
    }


    if (taskCommentsList) {

        taskCommentsList.innerHTML = `
            <p class="no-comments">
                Save the task first to add comments.
            </p>
        `;

    }


    modal?.classList.add("show");

    titleInput?.focus();

}


function closeModal() {

    modal?.classList.remove("show");

    form?.reset();

    showMessage("");

    editingTaskId = null;

}


document.querySelector(
    "#newTaskBtn"
)?.addEventListener(
    "click",
    openModal
);


document.querySelector(
    "#closeTaskModal"
)?.addEventListener(
    "click",
    closeModal
);


document.querySelector(
    "#cancelTaskModal"
)?.addEventListener(
    "click",
    closeModal
);


modal?.addEventListener(
    "click",
    function (event) {

        if (
            event.target === modal
        ) {
            closeModal();
        }

    }
);


filter?.addEventListener(
    "change",
    render
);


search?.addEventListener(
    "input",
    render
);


// ========================================
// EDIT TASK
// ========================================

function openEditTask(taskId) {

    const task =
        tasks.find(
            t =>
                String(t._id) ===
                String(taskId)
        );

    if (!task) {
        return;
    }


    editingTaskId =
        taskId;


    if (titleInput) {
        titleInput.value =
            task.title || "";
    }


    if (descriptionInput) {
        descriptionInput.value =
            task.description || "";
    }


    if (projectInput) {
        projectInput.value =
            getTaskProjectId(task);
    }


    if (priorityInput) {
        priorityInput.value =
            task.priority || "Medium";
    }


    if (statusInput) {
        statusInput.value =
            task.status || "To Do";
    }


    if (assignedInput) {
        assignedInput.value =
            task.assignedTo?._id || "";
    }


    if (dueDateInput) {

        dueDateInput.value =
            task.dueDate
                ? String(task.dueDate).substring(
                    0,
                    10
                )
                : "";

    }


    const heading =
        document.querySelector(
            ".modal-top h2"
        );

    if (heading) {
        heading.textContent =
            "Edit Task";
    }


    const submitButton =
        form?.querySelector(
            "button[type='submit']"
        );

    if (submitButton) {
        submitButton.textContent =
            "Save Changes";
    }


    showMessage("");

    modal?.classList.add("show");

    loadTaskComments(taskId);

    titleInput?.focus();

}


// ========================================
// CREATE / UPDATE TASK
// ========================================

form?.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const title =
            titleInput?.value.trim() || "";


        if (!title) {

            showMessage(
                "Task title is required.",
                "error"
            );

            return;

        }


        if (
            !projectInput?.value
        ) {

            showMessage(
                "Please select a project.",
                "error"
            );

            return;

        }


        const payload = {

            title,

            description:
                descriptionInput
                    ? descriptionInput.value.trim()
                    : "",

            project:
                projectInput.value,

            createdBy:
                userId,

            priority:
                priorityInput?.value ||
                "Medium",

            status:
                statusInput?.value ||
                "To Do",

            assignedTo:
                assignedInput?.value ||
                null,

            dueDate:
                dueDateInput?.value ||
                null

        };


        try {

            let response;


            if (editingTaskId) {

                response =
                    await fetch(
                        `/api/tasks/${editingTaskId}`,
                        {

                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }
                    );

            } else {

                response =
                    await fetch(
                        "/api/tasks",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }
                    );

            }


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Could not save task."
                );

            }


            const savedTask =
                data.task ||
                data;


            if (editingTaskId) {

                tasks =
                    tasks.map(
                        task =>
                            String(task._id) ===
                            String(editingTaskId)
                                ? savedTask
                                : task
                    );

            } else {

                tasks.unshift(
                    savedTask
                );

            }


            // Immediately refresh the
            // task list and statistics
            render();


            showMessage(
                editingTaskId
                    ? "Task updated successfully."
                    : "Task created successfully.",
                "success"
            );


            // Give the user a moment
            // to see the success message
            setTimeout(
                closeModal,
                600
            );


        } catch (error) {

            console.error(
                "Task save error:",
                error
            );

            showMessage(
                error.message ||
                "Could not save task.",
                "error"
            );

        }

    }
);


// ========================================
// LOAD COMMENTS
// ========================================

async function loadTaskComments(taskId) {

    if (!taskCommentsList) {
        return;
    }

    taskCommentsList.innerHTML = `
        <p class="no-comments">
            Loading comments...
        </p>
    `;


    try {

        const response =
            await fetch(
                `/api/comments/task/${taskId}`
            );


        if (!response.ok) {
            throw new Error(
                "Could not load comments"
            );
        }


        const data =
            await response.json();


        const comments =
            Array.isArray(data)
                ? data
                : data.comments || [];


        if (!comments.length) {

            taskCommentsList.innerHTML = `
                <p class="no-comments">
                    No comments yet.
                </p>
            `;

            return;

        }


        taskCommentsList.innerHTML =
            comments
                .map(
                    comment => {

                        const author =
                            comment.author?.name ||
                            comment.author?.username ||
                            comment.username ||
                            "User";

                        const text =
                            comment.text ||
                            comment.content ||
                            "";

                        return `
                            <div class="task-comment">

                                <strong>
                                    ${escapeHTML(author)}
                                </strong>

                                <small>
                                    ${
                                        comment.createdAt
                                            ? escapeHTML(
                                                formatDate(
                                                    comment.createdAt
                                                )
                                            )
                                            : ""
                                    }
                                </small>

                                <p>
                                    ${escapeHTML(text)}
                                </p>

                            </div>
                        `;

                    }
                )
                .join("");


    } catch (error) {

        console.error(
            "Load comments error:",
            error
        );

        taskCommentsList.innerHTML = `
            <p class="no-comments">
                Comments could not be loaded.
            </p>
        `;

    }

}


// ========================================
// ADD COMMENT
// ========================================

addTaskComment?.addEventListener(
    "click",
    async function () {

        if (!editingTaskId) {

            alert(
                "Please save the task first before adding a comment."
            );

            return;

        }


        const text =
            taskCommentInput?.value.trim() ||
            "";


        if (!text) {

            alert(
                "Please write a comment."
            );

            return;

        }


        try {

            const response =
                await fetch(
                    "/api/comments",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                text,

                                task:
                                    editingTaskId,

                                author:
                                    userId

                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Could not add comment."
                );

            }


            if (taskCommentInput) {
                taskCommentInput.value = "";
            }


            await loadTaskComments(
                editingTaskId
            );


        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );

            alert(
                error.message ||
                "Could not add comment."
            );

        }

    }
);


// ========================================
// KEYBOARD SHORTCUTS
// ========================================

document.addEventListener(
    "keydown",
    function (event) {

        const tag =
            document.activeElement?.tagName;


        if (
            [
                "INPUT",
                "TEXTAREA",
                "SELECT"
            ].includes(tag)
        ) {
            return;
        }


        if (event.key === "/") {

            event.preventDefault();

            search?.focus();

        }


        if (
            event.key.toLowerCase() === "n"
        ) {

            openModal();

        }

    }
);


// ========================================
// LOGOUT
// ========================================

window.logoutUser =
    function () {

        localStorage.removeItem(
            "taskflowUser"
        );

        window.location.href =
            "/login.html";

    };
// ========================================
// START
// ========================================

displayUser();

createOpenProjectButton();

Promise.all([
    loadProjects(),
    loadUsers(),
    loadTasks()
]).then(function () {

    if (requestedProjectId && projectInput) {
        projectInput.value = requestedProjectId;
        openModal();
    }
});
});