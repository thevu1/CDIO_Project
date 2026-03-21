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

/* ── Gear dropdown ── */
const gearBtn = document.getElementById('gearBtn');
const gearDropdown = document.getElementById('gearDropdown');

gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = gearDropdown.classList.toggle('open');
    gearBtn.classList.toggle('gear-active', open);
});
document.addEventListener('click', () => {
    gearDropdown.classList.remove('open');
    gearBtn.classList.remove('gear-active');
});

/* ── Profile modal ── */
const avatarBtn = document.getElementById('avatarBtn');
const profileOverlay = document.getElementById('profileOverlay');
const pmClose = document.getElementById('pmClose');

avatarBtn.addEventListener('click', () => {
    profileOverlay.classList.add('open');
    loadProfile();
});
pmClose.addEventListener('click', () => profileOverlay.classList.remove('open'));
profileOverlay.addEventListener('click', e => {
    if (e.target === profileOverlay) profileOverlay.classList.remove('open');
});

/* ════════════════════════════════════════
   LOAD PROFILE 
════════════════════════════════════════ */
async function loadProfile() {
    try {
        const res = await fetch('/api/player/me');
        const player = await res.json();

        const level = player.level ?? 0;
        const totalXp = player.xp ?? 0;

        // XP cần cho level tiếp theo = (level+1)*100
        const xpToNext = (level + 1) * 100;

        // Tổng XP để đạt đúng level hiện tại
        const xpFloor = level * (level + 1) / 2 * 100;
        const xpInLevel = Math.max(0, totalXp - xpFloor);
        const pct = Math.min(Math.round((xpInLevel / xpToNext) * 100), 100);

        /* topbar */
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setW = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = val; };

        set('avatarBtn', player.avatar || 'WA');
        set('profileName', player.name || 'Warrior');
        set('profileLevel', 'Level ' + level);
        setW('profileXpBar', pct + '%');
        set('profileXpText', `${xpInLevel} / ${xpToNext} XP`);

        /* modal */
        set('pmAvatar', player.avatar || 'WA');
        set('pmName', player.name || 'Warrior');
        set('pmEmail', player.email || '—');
        set('pmBadge', 'Level ' + level);
        setW('pmXpBar', pct + '%');
        set('pmXpText', `${xpInLevel} / ${xpToNext} XP`);
        set('pmStreak', player.streak || 0);
        set('pmTotalXp', totalXp);

        /* rank */
        try {
            const lb = await (await fetch('/leaderboardList')).json();
            const me = lb.find(p => p.is_me === 1);
            set('pmRank', me ? '#' + me.user_rank : '#—');
        } catch (_) { set('pmRank', '#—'); }

    } catch (err) {
        console.error('[loadProfile]', err.message);
    }
}

/* ════════════════════════════════════════
   LOAD LEADERBOARD
════════════════════════════════════════ */
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

async function loadLeaderboard() {
    const list = document.getElementById('leaderboardList');
    try {
        const players = await (await fetch('/leaderboardList')).json();

        if (!players || !players.length) {
            list.innerHTML = `<div class="lb-row" style="justify-content:center;color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`;
            return;
        }

        // Render danh sách
        list.innerHTML = players.map(p => {
            const isMe = p.is_me === 1;
            const medal = MEDALS[p.user_rank]
                ? `<div class="lb-medal">${MEDALS[p.user_rank]}</div>`
                : `<div class="lb-medal" style="opacity:.3">🏅</div>`;
            return `
                <div class="${isMe ? 'lb-row me' : 'lb-row'}">
                    <div class="lb-rank" style="${isMe ? 'color:var(--accent)' : ''}">#${p.user_rank}</div>
                    <div class="${isMe ? 'lb-avatar wa' : 'lb-avatar ng'}">${p.avatar || 'NG'}</div>
                    <div class="lb-info">
                        <div class="lb-name" style="${isMe ? 'color:var(--accent)' : ''}">${p.name}</div>
                        <div class="lb-sub">Level ${p.level} • ${p.xp} XP</div>
                    </div>
                    ${medal}
                </div>`;
        }).join('');

        // ── Cập nhật my-rank-bar ──
        const me = players.find(p => p.is_me === 1);
        if (me) {
            document.getElementById('myRankPos').textContent = '#' + me.user_rank;
            document.getElementById('myRankAvatar').textContent = me.avatar || 'WA';
            document.getElementById('myRankName').textContent = me.name;
            document.getElementById('myRankSub').textContent = `Level ${me.level} • ${me.xp} XP`;
        }

    } catch (err) {
        list.innerHTML = `
            <div class="lb-row" style="flex-direction:column;align-items:center;gap:8px;padding:16px">
                <span style="font-size:13px;color:var(--muted)">⚠️ Không tải được dữ liệu</span>
                <button onclick="loadLeaderboard()" style="background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.35);border-radius:8px;padding:5px 16px;font-size:12px;font-weight:700;color:#c084fc;cursor:pointer;font-family:inherit">Thử lại</button>
            </div>`;
    }
}
/* ════════════════════════════════════════
   DAY TABS
════════════════════════════════════════ */
document.querySelectorAll('.day-pill:not(.fire)').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.day-pill:not(.fire)').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
    });
});

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
window.addEventListener('load', () => {
    loadProfile();
    loadLeaderboard();
    document.querySelectorAll('.progress-fill').forEach(el => {
        const target = el.style.width;
        el.style.width = '0%';
        requestAnimationFrame(() => setTimeout(() => { el.style.width = target; }, 100));
    });
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