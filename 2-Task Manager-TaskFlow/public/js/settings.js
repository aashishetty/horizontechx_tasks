document.addEventListener("DOMContentLoaded", function () {

    function readUser() {
        try {
            return JSON.parse(localStorage.getItem("taskflowUser") || "null");
        } catch (error) {
            return null;
        }
    }

    const user = readUser();

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

    const userKey = user.id || user._id || user.username;
    const key = "taskflowSettings_" + userKey;

    const defaults = {
        compact: false,
        shortcuts: true,
        notifications: true,
        defaultTaskFilter: "all",
        theme: "dark"
    };

    const compact = document.querySelector("#compactMode");
    const shortcuts = document.querySelector("#shortcutsEnabled");
    const notifications = document.querySelector("#notificationsEnabled");
    const defaultTaskFilter = document.querySelector("#defaultTaskFilter");
    const themeMode = document.querySelector("#themeMode");
    const message = document.querySelector("#settingsMessage");
    const saveButton = document.querySelector("#saveSettings");
    const resetButton = document.querySelector("#resetSettings");
    const logoutButton = document.querySelector("#logoutFromSettings");

    function getSettings() {
        try {
            return {
                ...defaults,
                ...JSON.parse(localStorage.getItem(key) || "{}")
            };
        } catch (error) {
            return { ...defaults };
        }
    }

    let settings = getSettings();

    function applySettings() {
        document.body.classList.toggle("taskflow-compact", !!settings.compact);
        document.body.classList.toggle("taskflow-dim", settings.theme === "dim");
        document.documentElement.setAttribute("data-taskflow-theme", settings.theme || "dark");
    }

    function render() {
        if (compact) compact.checked = !!settings.compact;
        if (shortcuts) shortcuts.checked = !!settings.shortcuts;
        if (notifications) notifications.checked = !!settings.notifications;
        if (defaultTaskFilter) defaultTaskFilter.value = settings.defaultTaskFilter;
        if (themeMode) themeMode.value = settings.theme;
        applySettings();
    }

    function showMessage(text, type) {
        if (!message) return;
        message.textContent = text;
        message.className = "form-message settings-message " + type;
        clearTimeout(showMessage.timer);
        showMessage.timer = setTimeout(function () {
            message.textContent = "";
            message.className = "form-message settings-message";
        }, 2500);
    }

    function saveSettings() {
        settings = {
            compact: compact ? compact.checked : defaults.compact,
            shortcuts: shortcuts ? shortcuts.checked : defaults.shortcuts,
            notifications: notifications ? notifications.checked : defaults.notifications,
            defaultTaskFilter: defaultTaskFilter ? defaultTaskFilter.value : defaults.defaultTaskFilter,
            theme: themeMode ? themeMode.value : defaults.theme
        };

        localStorage.setItem(key, JSON.stringify(settings));
        applySettings();
        showMessage("Settings saved successfully.", "success");

        // Let the notification center immediately use the new setting.
        window.dispatchEvent(new CustomEvent("taskflow:settings-updated", {
            detail: settings
        }));
    }

    function resetSettings() {
        settings = { ...defaults };
        localStorage.setItem(key, JSON.stringify(settings));
        render();
        showMessage("Preferences reset to default.", "success");

        window.dispatchEvent(new CustomEvent("taskflow:settings-updated", {
            detail: settings
        }));
    }

    function logout() {
        localStorage.removeItem("taskflowUser");
        window.location.replace("/login.html");
    }

    // Direct listeners.
    if (saveButton) saveButton.addEventListener("click", saveSettings);
    if (resetButton) resetButton.addEventListener("click", resetSettings);
    if (logoutButton) logoutButton.addEventListener("click", logout);

    // Event delegation makes the account-action buttons work even if the page
    // markup is refreshed/re-rendered later.
    document.addEventListener("click", function (event) {
        const save = event.target.closest("#saveSettings");
        const reset = event.target.closest("#resetSettings");
        const logoutButtonClicked = event.target.closest("#logoutFromSettings");

        if (save) saveSettings();
        else if (reset) resetSettings();
        else if (logoutButtonClicked) logout();
    });

    // Sidebar logout uses this same function.
    window.logoutUser = logout;

    render();
});
