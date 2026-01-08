// Auth Script - Login and Register
(function() {
    const API_URL = window.API_URL || window.VIEW_API_URL || '';
    let isLogin = true;

    document.addEventListener("DOMContentLoaded", () => {
        if (!API_URL) {
            console.error("API URL not configured");
            return;
        }

        const toggleBtn = document.getElementById("toggle-mode");
        const form = document.getElementById("auth-form");
        const emailGroup = document.getElementById("email-group");
        const submitBtn = document.getElementById("btn-submit");
        const title = document.querySelector("h2");

        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                isLogin = !isLogin;
                emailGroup.style.display = isLogin ? "none" : "block";
                submitBtn.textContent = isLogin ? "Login" : "Register";
                title.textContent = isLogin ? "Admin Login" : "Admin Register";
                toggleBtn.textContent = isLogin ? "Need an account? Register" : "Have an account? Login";
            });
        }

        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                await handleAuth();
            });
        }
    });

    async function handleAuth() {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const email = document.getElementById("email").value.trim();
        const btn = document.getElementById("btn-submit");

        // Validation
        if (!username || !password) {
            alert("Please fill in all required fields");
            return;
        }

        if (!isLogin && !email) {
            alert("Email is required for registration");
            return;
        }

        const endpoint = isLogin ? "/api/login" : "/api/register";
        const payload = isLogin ? { username, password } : { username, password, email };

        btn.disabled = true;
        btn.textContent = "Processing...";

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                if (isLogin) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    window.location.href = "/admin.html";
                } else {
                    alert("Registration successful! Please login.");
                    // Switch to login mode
                    isLogin = true;
                    document.getElementById("email-group").style.display = "none";
                    btn.textContent = "Login";
                    document.querySelector("h2").textContent = "Admin Login";
                    document.getElementById("toggle-mode").textContent = "Need an account? Register";
                }
            } else {
                alert("Error: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Auth error:", err);
            alert("System error. Please try again.");
        } finally {
            btn.disabled = false;
            btn.textContent = isLogin ? "Login" : "Register";
        }
    }
})();

