// ========================================
// TASKFLOW PROJECT
// CREATE + EDIT + CHECKLIST
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // ========================================
        // USER
        // ========================================

        const storedUser =
            localStorage.getItem(
                "taskflowUser"
            );


        if (!storedUser) {

            window.location.href =
                "/login.html";

            return;

        }


        let currentUser;


        try {

            currentUser =
                JSON.parse(
                    storedUser
                );

        } catch (error) {

            localStorage.removeItem(
                "taskflowUser"
            );

            window.location.href =
                "/login.html";

            return;

        }


        const userId =
            currentUser.id ||
            currentUser._id;


        if (!userId) {

            localStorage.removeItem(
                "taskflowUser"
            );

            window.location.href =
                "/login.html";

            return;

        }


        // ========================================
        // USER DISPLAY
        // ========================================

        const userName =
            document.querySelector(
                "#userName"
            );

        const userUsername =
            document.querySelector(
                "#userUsername"
            );

        const userAvatar =
            document.querySelector(
                "#userAvatar"
            );


        const displayName =
            currentUser.name ||
            currentUser.username ||
            "User";


        if (userName) {

            userName.textContent =
                displayName;

        }


        if (userUsername) {

            userUsername.textContent =
                currentUser.username
                    ? `@${currentUser.username}`
                    : "";

        }


        if (userAvatar) {

            userAvatar.textContent =
                displayName
                    .charAt(0)
                    .toUpperCase();

        }


        // ========================================
        // FORM ELEMENTS
        // ========================================

        const projectForm =
            document.querySelector(
                "#projectForm"
            );

        const projectName =
            document.querySelector(
                "#projectName"
            );

        const projectDescription =
            document.querySelector(
                "#projectDescription"
            );

        const projectGoal =
            document.querySelector(
                "#projectGoal"
            );

        const projectCategory =
            document.querySelector(
                "#projectCategory"
            );

        const projectPriority =
            document.querySelector(
                "#projectPriority"
            );

        const projectStatus =
            document.querySelector(
                "#projectStatus"
            );

        const projectStartDate =
            document.querySelector(
                "#projectStartDate"
            );

        const projectDueDate =
            document.querySelector(
                "#projectDueDate"
            );

        const projectColor =
            document.querySelector(
                "#projectColor"
            );

        const createProjectBtn =
            document.querySelector(
                "#createProjectBtn"
            );

        const formMessage =
            document.querySelector(
                "#formMessage"
            );


        // ========================================
        // CHECKLIST ELEMENTS
        // ========================================

        const checklistContainer =
            document.querySelector(
                "#checklistContainer"
            );

        const checklistInput =
            document.querySelector(
                "#checklistInput"
            );

        const addChecklistBtn =
            document.querySelector(
                "#addChecklistBtn"
            );

        const automaticProgressValue =
            document.querySelector(
                "#automaticProgressValue"
            );

        const automaticProgressFill =
            document.querySelector(
                "#automaticProgressFill"
            );

        const taskProgressText =
            document.querySelector(
                "#taskProgressText"
            );


        // ========================================
        // DATA
        // ========================================

        let checklist = [];

        let editingProjectId = null;


        // ========================================
        // URL
        // ========================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        const projectId =
            params.get("id");


        if (projectId) {

            editingProjectId =
                projectId;

        }


        // ========================================
        // MESSAGE
        // ========================================

        function showMessage(
            message,
            type
        ) {

            if (!formMessage) {
                return;
            }


            formMessage.textContent =
                message;


            formMessage.className =
                `form-message ${type}`;

        }


        // ========================================
        // CALCULATE PROGRESS
        // ========================================

        function calculateProgress() {

            const total =
                checklist.length;


            const completed =
                checklist.filter(
                    item =>
                        item.completed
                ).length;


            const percentage =
                total === 0

                    ? 0

                    : Math.round(
                        (
                            completed /
                            total
                        ) * 100
                    );


            if (
                automaticProgressValue
            ) {

                automaticProgressValue.textContent =
                    `${percentage}%`;

            }


            if (
                automaticProgressFill
            ) {

                automaticProgressFill.style.width =
                    `${percentage}%`;

            }


            if (
                taskProgressText
            ) {

                taskProgressText.textContent =
                    `${completed} of ${total} tasks completed`;

            }


            return percentage;

        }


        // ========================================
        // RENDER CHECKLIST
        // ========================================

        function renderChecklist() {

            if (!checklistContainer) {
                return;
            }


            checklistContainer.innerHTML =
                "";


            checklist.forEach(
                function (item, index) {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "checklist-item";


                    if (
                        item.completed
                    ) {

                        row.classList.add(
                            "completed"
                        );

                    }


                    const checkbox =
                        document.createElement(
                            "input"
                        );


                    checkbox.type =
                        "checkbox";


                    checkbox.checked =
                        Boolean(
                            item.completed
                        );


                    checkbox.addEventListener(
                        "change",
                        async function () {

                            checklist[index].completed =
                                checkbox.checked;


                            row.classList.toggle(
                                "completed",
                                checkbox.checked
                            );


                            calculateProgress();


                            if (
                                editingProjectId
                            ) {

                                await saveChecklist();

                            }

                        }
                    );


                    const text =
                        document.createElement(
                            "span"
                        );


                    text.className =
                        "checklist-text";


                    text.textContent =
                        item.text;


                    const removeButton =
                        document.createElement(
                            "button"
                        );


                    removeButton.type =
                        "button";


                    removeButton.className =
                        "remove-task-button";


                    removeButton.textContent =
                        "×";


                    removeButton.title =
                        "Remove task";


                    removeButton.addEventListener(
                        "click",
                        async function () {

                            checklist.splice(
                                index,
                                1
                            );


                            renderChecklist();

                            calculateProgress();


                            if (
                                editingProjectId
                            ) {

                                await saveChecklist();

                            }

                        }
                    );


                    row.appendChild(
                        checkbox
                    );


                    row.appendChild(
                        text
                    );


                    row.appendChild(
                        removeButton
                    );


                    checklistContainer.appendChild(
                        row
                    );

                }
            );


            calculateProgress();

        }


        // ========================================
        // ADD CHECKLIST ITEM
        // ========================================

        function addChecklistItem() {

            if (!checklistInput) {
                return;
            }


            const text =
                checklistInput.value.trim();


            if (!text) {

                checklistInput.focus();

                return;

            }


            checklist.push({

                text,

                completed: false

            });


            checklistInput.value =
                "";


            renderChecklist();


            checklistInput.focus();

        }


        if (addChecklistBtn) {

            addChecklistBtn.addEventListener(
                "click",
                addChecklistItem
            );

        }


        if (checklistInput) {

            checklistInput.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        addChecklistItem();

                    }

                }
            );

        }


        // ========================================
        // SAVE CHECKLIST
        // ========================================

        async function saveChecklist() {

            if (!editingProjectId) {
                return;
            }


            try {

                const response =
                    await fetch(
                        `/api/projects/${editingProjectId}/checklist`,
                        {

                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    checklist
                                })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Could not update checklist."
                    );

                }


                // Use server result
                // so progress stays synchronized.

                if (
                    data.project &&
                    Array.isArray(
                        data.project.checklist
                    )
                ) {

                    checklist =
                        data.project.checklist;

                }


                calculateProgress();


            } catch (error) {

                console.error(
                    "Checklist save error:",
                    error
                );

            }

        }


        // ========================================
        // LOAD PROJECT FOR EDIT
        // ========================================

        async function loadProject() {

            if (!editingProjectId) {
                return;
            }


            try {

                const response =
                    await fetch(
                        `/api/projects/${editingProjectId}`
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Could not load project."
                    );

                }


                const project =
                    data.project;


                // --------------------------------
                // CHANGE PAGE TITLE
                // --------------------------------

                const heading =
                    document.querySelector(
                        ".project-page-header h1"
                    );


                if (heading) {

                    heading.textContent =
                        "Edit project";

                }


                // --------------------------------
                // NAME
                // --------------------------------

                if (projectName) {

                    projectName.value =
                        project.name || "";

                }


                // --------------------------------
                // DESCRIPTION
                // --------------------------------

                if (projectDescription) {

                    projectDescription.value =
                        project.description || "";

                }

                if (projectGoal) {

                    projectGoal.value =
                        project.goal || "";

                }


                // --------------------------------
                // CATEGORY
                // --------------------------------

                if (projectCategory) {

                    projectCategory.value =
                        project.category || "";

                }


                // --------------------------------
                // PRIORITY
                // --------------------------------

                if (projectPriority) {

                    projectPriority.value =
                        project.priority || "";

                }


                // --------------------------------
                // STATUS
                // --------------------------------

                if (projectStatus) {

                    projectStatus.value =
                        project.status || "";

                }


                // --------------------------------
                // DATES
                // --------------------------------

                if (projectStartDate) {

                    projectStartDate.value =
                        project.startDate
                            ? project.startDate.substring(
                                0,
                                10
                            )
                            : "";

                }


                if (projectDueDate) {

                    projectDueDate.value =
                        project.dueDate
                            ? project.dueDate.substring(
                                0,
                                10
                            )
                            : "";

                }


                // --------------------------------
                // COLOR
                // --------------------------------

                if (projectColor) {

                    projectColor.value =
                        project.color ||
                        "#7c3aed";

                }


                // --------------------------------
                // CHECKLIST
                // --------------------------------

                checklist =
                    Array.isArray(
                        project.checklist
                    )
                        ? project.checklist.map(
                            item => ({

                                _id:
                                    item._id,

                                text:
                                    item.text,

                                completed:
                                    Boolean(
                                        item.completed
                                    )

                            })
                        )
                        : [];


                renderChecklist();


                calculateProgress();


                // --------------------------------
                // BUTTON
                // --------------------------------

                if (createProjectBtn) {

                    createProjectBtn.textContent =
                        "✓ Save Changes";

                }


            } catch (error) {

                console.error(
                    "Load project error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Could not load project.",
                    "error"
                );

            }

        }


        // ========================================
        // SAVE PROJECT
        // ========================================

        if (projectForm) {

            projectForm.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();


                    const name =
                        projectName.value.trim();


                    const description =
                        projectDescription.value.trim();


                    const goal =
                        projectGoal
                            ? projectGoal.value.trim()
                            : "";


                    const category =
                        projectCategory.value;


                    const priority =
                        projectPriority.value;


                    const status =
                        projectStatus.value;


                    const startDate =
                        projectStartDate.value ||
                        null;


                    const dueDate =
                        projectDueDate.value ||
                        null;


                    // --------------------------------
                    // VALIDATION
                    // --------------------------------

                    if (!name) {

                        showMessage(
                            "Please enter a project name.",
                            "error"
                        );

                        projectName.focus();

                        return;

                    }


                    if (!description) {

                        showMessage(
                            "Please enter a project description.",
                            "error"
                        );

                        projectDescription.focus();

                        return;

                    }


                    if (!category) {

                        showMessage(
                            "Please select a category.",
                            "error"
                        );

                        projectCategory.focus();

                        return;

                    }


                    if (!priority) {

                        showMessage(
                            "Please select a priority.",
                            "error"
                        );

                        projectPriority.focus();

                        return;

                    }


                    if (!status) {

                        showMessage(
                            "Please select a status.",
                            "error"
                        );

                        projectStatus.focus();

                        return;

                    }


                        if (
                            startDate &&
                            dueDate &&
                            new Date(dueDate) <
                            new Date(startDate)
                        ) {

                            showMessage(
                                "Due date cannot be earlier than start date.",
                                "error"
                            );

                            projectDueDate.focus();

                            return;

                        }


                        // --------------------------------
                        // BUTTON
                        // --------------------------------

                        createProjectBtn.disabled =
                            true;


                        createProjectBtn.textContent =
                            editingProjectId
                                ? "Saving..."
                                : "Creating...";


                        try {

                            const response =
                                await fetch(

                                    editingProjectId

                                        ? `/api/projects/${editingProjectId}`

                                        : "/api/projects",

                                    {

                                        method:
                                            editingProjectId
                                                ? "PUT"
                                                : "POST",

                                        headers: {

                                            "Content-Type":
                                                "application/json"

                                        },

                                        body:
                                            JSON.stringify({

                                                name,

                                                description,

                                                goal,

                                                category,

                                                priority,

                                                status,

                                                startDate,

                                                dueDate,

                                                checklist,

                                                color:
                                                    projectColor.value,

                                                owner:
                                                    userId

                                            })

                                    }

                                );


                            const data =
                                await response.json();


                            if (!response.ok) {

                                throw new Error(
                                    data.message ||
                                    "Could not save project."
                                );

                            }


                            showMessage(

                                editingProjectId

                                    ? "Project updated successfully!"

                                    : "Project created successfully!",

                                "success"

                            );


                            setTimeout(
                                function () {

                                    if (
                                        editingProjectId
                                    ) {

                                        window.location.reload();

                                    } else {

                                        window.location.href =
                                            "/dashboard.html";

                                    }

                                },
                                700
                            );


                        } catch (error) {

                            console.error(
                                "Save project error:",
                                error
                            );


                            showMessage(
                                error.message ||
                                "Could not save project.",
                                "error"
                            );


                            createProjectBtn.disabled =
                                false;


                            createProjectBtn.textContent =
                                editingProjectId
                                    ? "✓ Save Changes"
                                    : "＋ Create Project";

                        }

                    }
                );

            }


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
            // INITIALIZE
            // ========================================

            renderChecklist();

            calculateProgress();


            if (editingProjectId) {

                loadProject();

            }

        }
    );
