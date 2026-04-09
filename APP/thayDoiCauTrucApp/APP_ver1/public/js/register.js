//register.js
const form = document.getElementById("register-form");
const btn = document.getElementById("register-btn");
const msg = document.getElementById("message");

let savedEmail = "";

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const data = {
        name: formData.get("name"),
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password")
    };

    savedEmail = data.email;

    const res = await fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.status === "success") {
        msg.innerText = "📩 Đã gửi email xác minh!";
        msg.style.color = "green";

        btn.innerText = "Gửi lại xác minh";
        btn.onclick = resendEmail;
    }

    if (result.status === "exists_unverified") {
        msg.innerText = "Email chưa xác minh!";
        btn.innerText = "Gửi lại xác minh";
        btn.onclick = resendEmail;
    }

    if (result.status === "exists") {
        msg.innerText = "Email đã tồn tại!";
    }

    if (result.status === "error") {
        msg.innerText = "❌ Lỗi server!";
    }
});

async function resendEmail(e) {
    e.preventDefault();

    const res = await fetch("/resend", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: savedEmail })
    });

    const result = await res.json();

    if (result.status === "resent") {
        msg.innerText = "📩 Đã gửi lại email!";
        msg.style.color = "green";
    }
}
document.addEventListener('touchmove', function(event) {
    if (event.scale !== 1) {
        event.preventDefault();
    }
}, { passive: false });