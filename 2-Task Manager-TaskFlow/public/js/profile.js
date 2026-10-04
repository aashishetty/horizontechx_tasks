document.addEventListener("DOMContentLoaded", async function () {

    const user = getUser();

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    const topbarName = document.querySelector("#topbarUserName");
    const topbarUsername = document.querySelector("#topbarUserUsername");
    const topbarAvatar = document.querySelector("#topbarUserAvatar");

    const displayName = user.name || user.username || "User";

    if (topbarName) topbarName.textContent = displayName;
    if (topbarUsername) topbarUsername.textContent = user.username ? "@" + user.username : "";
    if (topbarAvatar) topbarAvatar.textContent = displayName.charAt(0).toUpperCase();

    const name = document.querySelector("#profileName");
    const handle = document.querySelector("#profileHandle");
    const bio = document.querySelector("#profileBio");
    const avatar = document.querySelector("#profileAvatar");
    const role = document.querySelector("#profileRole");
    const location = document.querySelector("#profileLocation");

    const nameInput = document.querySelector("#profileNameInput");
    const usernameInput =
        document.querySelector("#profileUsernameInput");
    const emailInput =
        document.querySelector("#profileEmailInput");
    const bioInput =
        document.querySelector("#profileBioInput");
    const roleInput =
        document.querySelector("#profileRoleInput");
    const locationInput =
        document.querySelector("#profileLocationInput");

    const form =
        document.querySelector("#profileForm");

    const message =
        document.querySelector("#profileMessage");

    function getUser() {

        try {
            return JSON.parse(
                localStorage.getItem("taskflowUser") || ""
            );
        } catch {
            return null;
        }

    }

    function render() {

        const display =
            user.name ||
            user.username ||
            "User";

        name.textContent = display;

        handle.textContent =
            user.username
                ? "@" + user.username
                : "";

        bio.textContent = user.bio || "";

        role.textContent = user.role || "";
        role.hidden = !user.role;

        location.textContent = user.location || "";
        location.hidden = !user.location;

        avatar.textContent =
            display
                .charAt(0)
                .toUpperCase();

        nameInput.value =
            user.name || "";

        usernameInput.value =
            user.username || "";

        emailInput.value =
            user.email || "";

        bioInput.value =
            user.bio || "";

        roleInput.value = user.role || "";

        locationInput.value = user.location || "";

    }

    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            user.name =
                nameInput.value.trim();

            user.email =
                emailInput.value.trim();

            user.bio =
                bioInput.value.trim();

            user.role =
                roleInput.value.trim();

            user.location =
                locationInput.value.trim();

            localStorage.setItem(
                "taskflowUser",
                JSON.stringify(user)
            );

            message.textContent =
                "Profile saved successfully.";

            message.className =
                "form-message success";

            render();

        }
    );

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "/" &&
                !["INPUT", "TEXTAREA"].includes(
                    document.activeElement.tagName
                )
            ) {

                event.preventDefault();

                document
                    .querySelector("#pageSearch")
                    ?.focus();

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

    render();

});
