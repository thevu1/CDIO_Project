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
LEADERBOARD
================================= */

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function renderLeaderboard(players) {
    const list = document.getElementById('leaderboardList');

    if (!players || players.length === 0) {
        list.innerHTML = `
            <div class="lb-row" style="justify-content:center;color:var(--muted);font-size:13px">
                Chưa có dữ liệu
            </div>`;
        return;
    }

    list.innerHTML = players.map(p => {
        const isMe = p.is_me === 1;
        const rowClass = isMe ? 'lb-row me' : 'lb-row';
        const rankStyle = isMe ? 'color:var(--accent)' : '';
        const nameStyle = isMe ? 'color:var(--accent)' : '';
        const avatarClass = isMe ? 'lb-avatar wa' : 'lb-avatar ng';
        const medal = MEDALS[p.rank]
            ? `<div class="lb-medal">${MEDALS[p.rank]}</div>`
            : `<div class="lb-medal" style="opacity:.3">🏅</div>`;

        return `
            <div class="${rowClass}">
                <div class="lb-rank" style="${rankStyle}">#${p.rank}</div>
                <div class="${avatarClass}">${p.avatar ?? 'NG'}</div>
                <div class="lb-info">
                    <div class="lb-name" style="${nameStyle}">${p.name}</div>
                    <div class="lb-sub">Level ${p.level ?? 1} • ${p.xp} XP</div>
                </div>
                ${medal}
            </div>`;
    }).join('');
}

async function loadLeaderboard() {
    try {
        const res = await fetch('/leaderboardList');
        const json = await res.json();
        renderLeaderboard(json);

    } catch (err) {
        document.getElementById('leaderboardList').innerHTML = `
            <div class="lb-row" style="flex-direction:column;align-items:center;gap:8px;padding:16px">
                <span style="font-size:13px;color:var(--muted)">⚠️ Không tải được dữ liệu</span>
                <button onclick="loadLeaderboard()"
                    style="background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.35);
                           border-radius:8px;padding:5px 16px;font-size:12px;font-weight:700;
                           color:#c084fc;cursor:pointer;font-family:inherit">
                    Thử lại
                </button>
            </div>`;
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
function LevelUp() {
    alert("Congratulations! You've leveled up!");
}

async function loadProfile() {

    const res = await fetch(`${API}/profile-data`);
    const data = await res.json();

    const xp = data.xp;
    const level = data.level;
    const streak = data.streak;

    document.getElementById("xpText").innerText =
        xp + " / 500 XP";

    document.getElementById("levelText").innerText =
        "Level " + level;

    document.getElementById("streakText").innerText =
        "🔥 " + streak;

    const percent = (xp % 500) / 500 * 100;

    document.getElementById("xpFill").style.width =
        percent + "%";

}
/* ─────────────────────────────────────────
   1. GEAR DROPDOWN
───────────────────────────────────────── */
const gearBtn = document.getElementById('gearBtn');
const gearDropdown = document.getElementById('gearDropdown');

gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = gearDropdown.classList.toggle('open');
    gearBtn.classList.toggle('gear-active', isOpen);
});

// Đóng khi click ra ngoài
document.addEventListener('click', () => {
    gearDropdown.classList.remove('open');
    gearBtn.classList.remove('gear-active');
});

/* ─────────────────────────────────────────
   2. PROFILE MODAL
───────────────────────────────────────── */
const avatarBtn = document.getElementById('avatarBtn');
const profileOverlay = document.getElementById('profileOverlay');
const pmClose = document.getElementById('pmClose');

// Mở modal khi bấm avatar
avatarBtn.addEventListener('click', () => {
    profileOverlay.classList.add('open');
    loadProfile();
});

// Đóng khi bấm nút ✕
pmClose.addEventListener('click', () => {
    profileOverlay.classList.remove('open');
});

// Đóng khi bấm nền tối bên ngoài modal
profileOverlay.addEventListener('click', (e) => {
    if (e.target === profileOverlay) {
        profileOverlay.classList.remove('open');
    }
});


/* =================================
AUTO LOAD
================================= */

window.onload = () => {

    loadTasks();
    loadLeaderboard();
    loadStreak();
    loadProfile();
};
document.addEventListener('touchmove', function(event) {
    if (event.scale !== 1) {
        event.preventDefault();
    }
}, { passive: false });