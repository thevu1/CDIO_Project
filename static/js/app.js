const API = "http://localhost:3000";

/* =================================
PAGE SWITCH (TASKBAR)
================================= */

function hideAll() {
    document.querySelectorAll(".page").forEach(p => {
        p.style.display = "none";
    });
}

function showTasks() {
    hideAll();
    document.getElementById("taskSection").style.display = "block";
}

function showFocus() {
    hideAll();
    document.getElementById("focusSection").style.display = "block";
}

function showScreenTime() {
    hideAll();
    document.getElementById("screenSection").style.display = "block";
}

function showLeaderboard() {
    loadLeaderboard();
}

function showStreak() {
    hideAll();
    document.getElementById("streakSection").style.display = "block";
    loadStreak();
}

/* =================================
LOAD DAILY TASKS
================================= */

async function loadTasks() {
    try {

        const res = await fetch(`${API}/tasks`);
        const data = await res.json();

        const list = document.getElementById("tasks");
        list.innerHTML = "";

        if (!data || data.length === 0) {
            list.innerHTML = "<li>No tasks today</li>";
            return;
        }

        data.forEach(task => {

            const tasks = [
                { name: "🚶 Walk 5km", done: task.walk_completed, type: "walk_completed" },
                { name: "😴 Sleep before 23:00", done: task.sleep_completed, type: "sleep_completed" },
                { name: "📱 Screen under limit", done: task.screen_completed, type: "screen_completed" },
                { name: "🎯 Focus 25 minutes", done: task.focus_completed, type: "focus_completed" }
            ];

            tasks.forEach(t => {

                const li = document.createElement("li");

                li.innerHTML = `
                    <span>${t.name}</span>
                    <button ${t.done ? "disabled" : ""} 
                    onclick="completeTask(${task.id}, '${t.type}')">
                    ${t.done ? "✔ Completed" : "✓ Done"}
                    </button>
                `;

                list.appendChild(li);

            });

        });

    } catch (err) {
        console.error("Error loading tasks:", err);
    }
}

/* =================================
COMPLETE TASK
================================= */

async function completeTask(id, type) {

    try {

        await fetch(`${API}/complete-task`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id, type })
        });

        loadTasks();

    } catch (err) {
        console.error("Complete task error:", err);
    }

}
/* =================================
LEADERBOARD
================================= */

async function loadLeaderboard() {

    try {

        const res = await fetch(`${API}/leaderboard`);
        const data = await res.json();

        const board = document.getElementById("leaderboard");
        board.innerHTML = "";

        data.forEach((user, index) => {

            const row = document.createElement("div");
            row.className = "leader-item";

            row.innerHTML = `

                <div class="leader-left">

                    <div class="rank">${index + 1}</div>

                    <img src="https://i.pravatar.cc/40?img=${index + 1}" 
                    class="leader-avatar">

                    <div class="leader-name">${user.name}</div>

                </div>

                <div class="score">${user.xp} XP</div>

            `;

            board.appendChild(row);

        });

    } catch (err) {

        console.error("Leaderboard error:", err);

    }

}

/* =================================
STREAK SYSTEM
================================= */

async function loadStreak() {

    try {

        const res = await fetch(`${API}/streak`);
        const data = await res.json();

        document.getElementById("streakCount").innerText =
            `🔥 ${data.streak} day streak`;

    }

    catch (err) {

        console.error("Streak error:", err);

    }

}

function toggleMenu() {

    const menu = document.querySelector(".settings");

    menu.classList.toggle("active");

}
function logout() {

    window.location.href = "/logout";

}

/* =================================
AUTO LOAD
================================= */
window.onload = () => {

    loadMeta();   // thêm dòng này

    if (document.getElementById("tasks")) {
        loadTasks();
    }

    if (document.getElementById("leaderboard")) {
        loadLeaderboard();
    }

    if (document.getElementById("streakCount")) {
        loadStreak();
    }

};


/* ===============================
   HEALTHQUEST PWA CONFIG
   - Register Service Worker
   - Enable install prompt
================================ */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
        .then(() => console.log("Service Worker Registered"))
        .catch(err => console.log("SW Error:", err));
    });
}

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
});
/* =================================
GLOBAL META CONFIG
================================= */

function loadMeta() {

    const head = document.head;

    const metas = [

        {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        },

        {
            name: "apple-mobile-web-app-capable",
            content: "yes"
        },

        {
            name: "apple-mobile-web-app-status-bar-style",
            content: "black-translucent"
        },

        {
            name: "apple-mobile-web-app-title",
            content: "HealthQuest"
        }

    ];

    metas.forEach(meta => {

        const m = document.createElement("meta");
        m.name = meta.name;
        m.content = meta.content;

        head.appendChild(m);

    });

}