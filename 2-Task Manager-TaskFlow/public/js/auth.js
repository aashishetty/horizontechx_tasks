document.addEventListener("DOMContentLoaded", function () {

// ========================================
// IN-PAGE MESSAGE
// ========================================

function showMessage(form, message, type) {

    let messageBox =
        form.querySelector(".auth-message");

    if (!messageBox) {

        messageBox =
            document.createElement("div");

        messageBox.className =
            "auth-message";

        form.prepend(messageBox);

    }

    messageBox.textContent = message;

    messageBox.className =
        "auth-message " + type;

    messageBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


// ========================================
// PASSWORD STRENGTH
// ========================================

function isStrongPassword(password) {

    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );

}


// ========================================
// REGISTER
// ========================================

const registerForm =
    document.querySelector("#registerForm");


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document
                    .querySelector("#name")
                    .value
                    .trim();


            const username =
                document
                    .querySelector("#username")
                    .value
                    .trim();


            const email =
                document
                    .querySelector("#email")
                    .value
                    .trim();


            const password =
                document
                    .querySelector("#password")
                    .value;


            if (
                !name ||
                !username ||
                !email ||
                !password
            ) {

                showMessage(
                    registerForm,
                    "Please fill in all fields.",
                    "error"
                );

                return;

            }


            if (!isStrongPassword(password)) {

                showMessage(
                    registerForm,
                    "Password must contain at least 8 characters, one uppercase letter, one number, and one special character.",
                    "error"
                );

                return;

            }


            const submitButton =
                registerForm.querySelector(
                    "button[type='submit']"
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.dataset.originalText =
                    submitButton.innerHTML;

                submitButton.innerHTML =
                    "Creating your TaskFlow...";

            }


            try {

                const response =
                    await fetch(
                        "/api/auth/register",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name,
                                username,
                                email,
                                password
                            })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    showMessage(
                        registerForm,
                        data.message ||
                        "Registration failed.",
                        "error"
                    );

                    return;

                }


                showMessage(
                    registerForm,
                    "Account created successfully! 🎉 Taking you to sign in...",
                    "success"
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "/login.html";

                    },
                    1400
                );


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                showMessage(
                    registerForm,
                    "TaskFlow could not connect to the server.",
                    "error"
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.innerHTML =
                        submitButton.dataset
                            .originalText ||
                        "Create your TaskFlow";

                }

            }

        }
    );

}


// ========================================
// LOGIN
// ========================================

const loginForm =
    document.querySelector("#loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const identifierInput =
                document.querySelector(
                    "#identifier"
                );


            const passwordInput =
                document.querySelector(
                    "#password"
                );


            if (
                !identifierInput ||
                !passwordInput
            ) {

                return;

            }


            const identifier =
                identifierInput
                    .value
                    .trim();


            const password =
                passwordInput.value;


            if (
                !identifier ||
                !password
            ) {

                showMessage(
                    loginForm,
                    "Please enter your username/email and password.",
                    "error"
                );

                return;

            }


            const submitButton =
                loginForm.querySelector(
                    "button[type='submit']"
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.dataset.originalText =
                    submitButton.innerHTML;

                submitButton.innerHTML =
                    "Signing you in...";

            }


            try {

                const response =
                    await fetch(
                        "/api/auth/login",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                identifier,
                                password
                            })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    showMessage(
                        loginForm,
                        data.message ||
                        "Login failed.",
                        "error"
                    );

                    return;

                }


                localStorage.setItem(
                    "taskflowUser",
                    JSON.stringify(
                        data.user
                    )
                );


                showMessage(
                    loginForm,
                    "Welcome back! 🚀 Opening your workspace...",
                    "success"
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "/dashboard.html";

                    },
                    1000
                );


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                showMessage(
                    loginForm,
                    "TaskFlow could not connect to the server.",
                    "error"
                );


            } finally {

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.innerHTML =
                        submitButton.dataset
                            .originalText ||
                        "Sign in to TaskFlow";

                }

            }

        }
    );

}


});

