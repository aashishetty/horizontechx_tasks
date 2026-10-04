document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    /* =========================
       LOGIN
    ========================= */

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const identifier =
                document.getElementById("loginIdentifier")?.value.trim();

            const password =
                document.getElementById("loginPassword")?.value;

            const message =
                document.getElementById("authMessage");

            if (!identifier || !password) {
                message.textContent =
                    "Please enter username and password.";
                return;
            }

            message.textContent = "Logging in...";

            try {
                const response = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        identifier,
                        username: identifier,
                        password
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    message.textContent =
                        data.message || "Login failed.";
                    return;
                }

                localStorage.setItem(
                    "socialconnectUser",
                    JSON.stringify(data.user)
                );

                window.location.href = "index.html";

            } catch (error) {
                console.error("Login error:", error);

                message.textContent =
                    "Unable to connect to the server.";
            }
        });
    }

    /* =========================
       REGISTER
    ========================= */

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name =
                document.getElementById("registerName")?.value.trim();

            const username =
                document.getElementById("registerUsername")?.value.trim();

            const email =
                document.getElementById("registerEmail")?.value.trim();

            const password =
                document.getElementById("registerPassword")?.value;

            const confirmPassword =
                document.getElementById("registerConfirm")?.value;

            const message =
                document.getElementById("authMessage");

            if (!name || !username || !email || !password || !confirmPassword) {
                if (message) {
                    message.textContent =
                        "Please fill all fields.";
                }
                return;
            }

            if (password !== confirmPassword) {
                if (message) message.textContent = "Passwords do not match.";
                return;
            }

            if (password.length < 6) {
                if (message) message.textContent = "Password must be at least 6 characters.";
                return;
            }

            if (message) {
                message.textContent = "Creating account...";
            }

            try {
                const response = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        username,
                        email,
                        password,
                        confirmPassword
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (message) {
                        message.textContent =
                            data.message || "Registration failed.";
                    }
                    return;
                }

                localStorage.setItem(
                    "socialconnectUser",
                    JSON.stringify(data.user)
                );

                window.location.href = "index.html";

            } catch (error) {
                console.error("Registration error:", error);

                if (message) {
                    message.textContent =
                        "Unable to connect to the server.";
                }
            }
        });
    }
});