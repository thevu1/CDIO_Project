const API = "";

// AVATAR & PROFILE
function showStreak() { hideAll(); document.getElementById("streakSection").style.display = "block"; }
function toggleMenu() { document.querySelector(".settings")?.classList.toggle("active"); }
function logout() { window.location.href = "/logout"; }

const avatarBtn = document.getElementById("avatarBtn");
const profileOverlay = document.getElementById("profileOverlay");
const pmClose = document.getElementById("pmClose");
if (avatarBtn && profileOverlay) {
    avatarBtn.addEventListener("click", () => { profileOverlay.classList.add("open"); loadProfile(); });
    pmClose?.addEventListener("click", () => profileOverlay.classList.remove("open"));
    profileOverlay.addEventListener("click", e => {
        if (e.target === profileOverlay) profileOverlay.classList.remove("open");
    });
}

async function loadProfileWithData(player) {
    const totalXp = player.xp ?? 0;
    const level = player.level ?? 1;

    const xpFloor = _xpFloor(level - 1);

    const xpToNext = level * 100;

    const currentXp = totalXp - xpFloor;

    const progressPct = Math.min(Math.round((currentXp / xpToNext) * 100), 100);

    const displayName = _pickDisplayName(player.nickname, player.name, "Warrior");

    _set("avatarBtn", player.avatar || "WA");
    _set("profileLevel", "Level " + level);
    _set("profileXpText", `${currentXp} / ${xpToNext} XP`);
    _setBar("profileXpBar", progressPct);


    _set("pmAvatar", player.avatar || "WA");
    _set("pmName", displayName);
    _set("pmBadge", "Level " + level);
    _set("pmXpText", `${currentXp} / ${xpToNext} XP`);
    _set("pmTotalStreak", player.total_streak || 0);
    _setBar("pmXpBar", progressPct);

    try {
        const lb = await fetch("/leaderboardList").then(r => r.json());
        const me = Array.isArray(lb) ? lb.find(p => p.is_me == 1) : null;
        _set("pmRank", me ? "#" + me.user_rank : "#—");
    } catch (_) { _set("pmRank", "#—"); }
}

async function loadProfile() {
    try {
        const player = await fetchJSON("/profile-data");
        await loadProfileWithData(player);
    } catch (err) { console.error("[loadProfile]", err.message); }
}

function _xpFloor(level) {
    return level * (level + 1) / 2 * 100;
}

/* ════════════════════════════════════════
   PAGE SWITCH & UTILITIES
════════════════════════════════════════ */
function hideAll() {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
}

function _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function _setBar(id, pct) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = "width 1.2s cubic-bezier(.22,1,.36,1)";
        el.style.width = Math.min(Math.max(pct, 0), 100) + "%";
    }));
}

async function fetchJSON(url, options) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            const text = await res.text();
            console.error(`Lỗi Server ${res.status} tại ${url}:`, text);
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.error(`Lỗi fetch tại ${url}:`, err.message);
        throw err;
    }
}

/* ════════════════════════════════════════
   DISPLAY HELPERS
════════════════════════════════════════ */
function _pickDisplayName(nickname, name, fallback = "Warrior") {
    const nick = typeof nickname === "string" ? nickname.trim() : "";
    if (nick.length > 0) return nick;
    const fullName = typeof name === "string" ? name.trim() : "";
    return fullName.length > 0 ? fullName : fallback;
}

function displayNickname(nickname) {
    _set("profileName", typeof nickname === "string" && nickname.trim() ? nickname.trim() : "Warrior");
}

/* ════════════════════════════════════════
   LEADERBOARD
════════════════════════════════════════ */
const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

async function loadLeaderboard() {
    const list = document.getElementById("leaderboardList");
    if (!list) return;

    try {
        const players = await fetchJSON("/leaderboardList");

        if (!Array.isArray(players) || !players.length) {
            list.innerHTML = `<div class="lb-row" style="justify-content:center;color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`;
            return;
        }

        list.innerHTML = players.map(p => {
            const isMe = p.is_me == 1;
            const displayName = _pickDisplayName(p.nickname, p.name, "Người chơi");
            const medal = MEDALS[p.user_rank]
                ? `<div class="lb-medal">${MEDALS[p.user_rank]}</div>`
                : `<div class="lb-medal" style="opacity:.3">🏅</div>`;

            return `
            <div class="${isMe ? "lb-row me" : "lb-row"}">
                <div class="lb-rank" style="${isMe ? "color:var(--accent)" : ""}">#${p.user_rank}</div>
                <div class="${isMe ? "lb-avatar wa" : "lb-avatar ng"}">${p.avatar || "NG"}</div>
                <div class="lb-info">
                    <div class="lb-name" style="${isMe ? "color:var(--accent)" : ""}">${displayName}</div>
                    <div class="lb-sub">Level ${p.level} • ${p.xp} XP</div>
                </div>
                ${medal}
            </div>`;
        }).join("");

        const me = players.find(p => p.is_me == 1);
        if (me) {
            _set("myRankPos", "#" + me.user_rank);
            _set("myRankAvatar", me.avatar || "WA");
            _set("myRankName", _pickDisplayName(me.nickname, me.name, "Bạn"));
            _set("myRankSub", `Level ${me.level} • ${me.xp} XP`);
        }
    } catch (err) {
        console.error("loadLeaderboard error:", err.message);
        list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px">
             Không tải được — <button onclick="loadLeaderboard()" style="color:#c084fc;background:none;border:none;cursor:pointer;font-weight:700">Thử lại</button>
        </div>`;
    }
}

/* ════════════════════════════════════════
   TOP BAR & PROFILE
════════════════════════════════════════ */
function updateTopBar(player) {
    const displayName = _pickDisplayName(player.nickname, player.name, "Warrior");
    _set("profileName", displayName);
    _set("profileLevel", `Level ${player.level || 1}`);

    const level = player.level || 1;
    const currentXp = player.xp || 0;
    const xpToNext = player.xp_to_next > 0 ? player.xp_to_next : (level + 1) * 100;

    const pct = Math.min(Math.round((currentXp / xpToNext) * 100), 100);

    _set("profileXpText", `${currentXp} / ${xpToNext} XP`);
    _setBar("profileXpBar", pct);

    const firePill = document.querySelector(".day-pill.fire");
    if (firePill) firePill.textContent = `🔥 ${player.total_streak || 0}`;
}

async function lightTodayFire() {
    const dayPills = document.querySelectorAll('.day-pill');
    if (!dayPills.length) return;
    try {
        const response = await fetch("/api/streak-history");
        if (!response.ok) return;
        const historyData = await response.json();
        const records = Array.isArray(historyData) ? historyData : (historyData.data || []);
        if (!Array.isArray(records)) return;

        const pillMap = [1, 2, 3, 4, 5, 6, 0];
        const fireDays = new Set();
        records.forEach(record => {
            if (record.is_streak_day === 1 && record.streak_date) {
                const date = new Date(record.streak_date);
                const jsDay = date.getDay();
                const pillIdx = pillMap.indexOf(jsDay);
                if (pillIdx !== -1) fireDays.add(pillIdx);
            }
        });
        dayPills.forEach((pill, idx) => {
            pill.classList.remove('fire-active', 'active');
            if (fireDays.has(idx)) pill.classList.add('fire-active');
        });
    } catch (e) {
        console.error("Lỗi khi cập nhật streak:", e);
    }
}

/* ════════════════════════════════════════
   MEDITATION TIMER
════════════════════════════════════════ */
let meditationTimer = null;
let currentMeditationSeconds = 20;

function updateMeditationClock() {
    const m = Math.floor(currentMeditationSeconds / 60);
    const s = currentMeditationSeconds % 60;
    setFlip("medM1", Math.floor(m / 10));
    setFlip("medM2", m % 10);
    setFlip("medS1", Math.floor(s / 10));
    setFlip("medS2", s % 10);
}

function startMeditation() {
    const startBtn = document.getElementById("startMeditationBtn");
    if (startBtn) startBtn.classList.add("hidden");

    document.getElementById("meditationFullscreen").style.display = "flex";
    currentMeditationSeconds = 20;
    updateMeditationClock();

    if (meditationTimer) clearInterval(meditationTimer);
    meditationTimer = setInterval(() => {
        currentMeditationSeconds--;
        updateMeditationClock();
        if (currentMeditationSeconds <= 0) {
            clearInterval(meditationTimer);
            meditationTimer = null;
            _showMeditationCompleted();
        }
    }, 1000);
}

async function _showMeditationCompleted() {
    document.getElementById("meditationFullscreen").style.display = "none";

    await _completeTask("meditate_10min");

    const claimBtn = document.getElementById("meditationClaimBtn");
    if (claimBtn) {
        claimBtn.classList.remove("hidden");
        claimBtn.style.display = "block";
    }
    const row = document.querySelector('.task-row[data-task="meditate_10min"]');
    if (row) {
        const subEl = row.querySelector(".task-sub");
        const startBtn = row.querySelector(".start-btn");
        if (subEl) subEl.textContent = "Hoàn thành – Nhận XP";
        if (startBtn) startBtn.classList.add("hidden");
    }

    await loadTasks();
}

async function stopMeditation() {
    if (meditationTimer) { clearInterval(meditationTimer); meditationTimer = null; }
    await _showMeditationCompleted();
}

/* ════════════════════════════════════════
   EXERCISE TIMER
════════════════════════════════════════ */
let exerciseTimer = null;
let currentExerciseSeconds = 1200;

function updateExerciseClock() {
    const m = Math.floor(currentExerciseSeconds / 60);
    const s = currentExerciseSeconds % 60;
    setFlip("exM1", Math.floor(m / 10));
    setFlip("exM2", m % 10);
    setFlip("exS1", Math.floor(s / 10));
    setFlip("exS2", s % 10);
}

function startExercise() {
    const startBtn = document.getElementById("startExerciseBtn");
    if (startBtn) startBtn.classList.add("hidden");

    document.getElementById("exerciseFullscreen").style.display = "flex";
    currentExerciseSeconds = 1200;
    updateExerciseClock();

    if (exerciseTimer) clearInterval(exerciseTimer);
    exerciseTimer = setInterval(() => {
        currentExerciseSeconds--;
        updateExerciseClock();
        if (currentExerciseSeconds <= 0) {
            clearInterval(exerciseTimer);
            exerciseTimer = null;
            _showExerciseCompleted();
        }
    }, 1000);
}

async function _showExerciseCompleted() {
    document.getElementById("exerciseFullscreen").style.display = "none";

    await _completeTask("exercise_20min");

    const claimBtn = document.getElementById("exerciseClaimBtn");
    if (claimBtn) {
        claimBtn.classList.remove("hidden");
        claimBtn.style.display = "block";
    }

    const row = document.querySelector('.task-row[data-task="exercise_20min"]');
    if (row) {
        const subEl = row.querySelector(".task-sub");
        const startBtn = row.querySelector(".start-btn");
        if (subEl) subEl.textContent = "Hoàn thành – Nhận XP";
        if (startBtn) startBtn.classList.add("hidden");
    }

    await loadTasks();
}

async function stopExercise() {
    if (exerciseTimer) { clearInterval(exerciseTimer); exerciseTimer = null; }
    await _showExerciseCompleted();
}

/* ════════════════════════════════════════
   READING TIMER
════════════════════════════════════════ */
let readingTimer = null;
let currentReadingSeconds = 600;

function updateReadingClock() {
    const m = Math.floor(currentReadingSeconds / 60);
    const s = currentReadingSeconds % 60;
    setFlip("readM1", Math.floor(m / 10));
    setFlip("readM2", m % 10);
    setFlip("readS1", Math.floor(s / 10));
    setFlip("readS2", s % 10);
}

function startReading() {
    const startBtn = document.getElementById("startReadBtn");
    if (startBtn) startBtn.classList.add("hidden");

    document.getElementById("readingFullscreen").style.display = "flex";
    currentReadingSeconds = 600;
    updateReadingClock();

    if (readingTimer) clearInterval(readingTimer);
    readingTimer = setInterval(() => {
        currentReadingSeconds--;
        updateReadingClock();
        if (currentReadingSeconds <= 0) {
            clearInterval(readingTimer);
            readingTimer = null;
            _showReadingCompleted();
        }
    }, 1000);
}
async function _showReadingCompleted() {
    document.getElementById("readingFullscreen").style.display = "none";

    await _completeTask("reading_10min");

    const claimBtn = document.getElementById("readClaimBtn");
    if (claimBtn) {
        claimBtn.classList.remove("hidden");
        claimBtn.style.display = "block";
    }

    const row = document.querySelector('.task-row[data-task="reading_10min"]');
    if (row) {
        const subEl = row.querySelector(".task-sub");
        const startBtn = row.querySelector(".start-btn");
        if (subEl) subEl.textContent = "Hoàn thành – Nhận XP";
        if (startBtn) startBtn.classList.add("hidden");
    }

    await loadTasks();
}

async function stopReading() {
    if (readingTimer) { clearInterval(readingTimer); readingTimer = null; }
    await _showReadingCompleted();
}

/* ════════════════════════════════════════
   COMPLETE TASK 
════════════════════════════════════════ */
async function _completeTask(taskName) {

    try {

        console.log("Sending task:", taskName);

        const res = await fetch("/complete-task", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: taskName
            })
        });

        const data = await res.json();

        if (!res.ok) {
            console.error(" COMPLETE TASK ERROR:", data.error);
            throw new Error(data.error || "Server error");
        }

        console.log("✅ Task completed:", data);

        return data;

    } catch (err) {

        console.error(" _completeTask FAILED:", err);

    }
}
async function showFocusCompleted() {
    const response = await fetch("/api/focus/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            focus_mode: "timer",
            focus_duration_seconds: 1500,
            time_remaining_seconds: 0,
            status: "finished"
        })
    });
    const sessionData = await response.json();
    document.getElementById("focusFullscreen").style.display = "none";
    document.getElementById("doneText").innerText = `Hoàn thành ${sessionData.minutes} phút tập trung!`;
    document.getElementById("donePopup").style.display = "flex";
}

/* ════════════════════════════════════════
   FLIP CLOCK HELPER
════════════════════════════════════════ */
function setFlip(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent == value) return;
    el.classList.remove("flip");
    void el.offsetWidth;
    el.textContent = value;
    el.classList.add("flip");
}

/* ════════════════════════════════════════
   CLAIM XP
════════════════════════════════════════ */
async function claimXP(task) {
    try {
        const res = await fetch("/api/tasks/claim-xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_name: task })
        });
        const result = await res.json();

        if (result.error) {
            alert("Lỗi: " + result.error);
            return;
        }

        if (result.success) {
            _showXpToast(`+${result.xp_gain} XP`);

            if (result.leveledUp) {
                setTimeout(() => _showXpToast(`🎉 Lên Level ${result.level}!`), 800);
            }

            updateTopBar({
                level: result.level,
                xp: result.xp,
                xp_to_next: result.xp_to_next,
                total_streak: undefined,
                nickname: undefined,
                name: undefined,
                avatar: undefined
            });
            _set("profileXpText", `${result.xp} / ${result.xp_to_next} XP`);
            _setBar("profileXpBar", Math.min(Math.round((result.xp / result.xp_to_next) * 100), 100));

            const player = await fetchJSON("/profile-data");
            await loadProfileWithData(player);
            loadLeaderboard();
            if (typeof updateWeeklyStreak === "function") await updateWeeklyStreak();

            _markTaskClaimed(task);
        }
    } catch (err) {
        console.error(err);
        alert("Không thể kết nối với server");
    }
}

function _markTaskClaimed(taskName) {
    const keyMap = {
        "meditate_10min": "meditate_10min",
        "exercise_20min": "exercise_20min",
        "reading_10min": "reading_10min",
        "walk_completed": "walk_completed",
        "focus_completed": "focus"
    };
    const dataTask = keyMap[taskName] || taskName;
    const row = document.querySelector(`.task-row[data-task="${dataTask}"]`);
    if (!row) return;

    row.querySelectorAll(".claim-xp-btn").forEach(b => {
        b.classList.add("hidden");
        b.style.display = "none";
    });

    const subEl = row.querySelector(".task-sub");
    if (subEl) subEl.textContent = "✓ Đã nhận XP";

    const percentEl = row.querySelector(".task-val");
    const progressEl = row.querySelector(".progress-fill");
    if (percentEl) { percentEl.textContent = "100%"; percentEl.classList.remove("zero"); }
    if (progressEl) progressEl.style.width = "100%";
}

function _showXpToast(msg) {
    let toast = document.getElementById("_xpToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "_xpToast";
        Object.assign(toast.style, {
            position: "fixed", bottom: "80px", left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg,#a855f7,#7c3aed)",
            color: "#fff", padding: "10px 22px", borderRadius: "24px",
            fontWeight: "700", fontSize: "15px", zIndex: "9999",
            boxShadow: "0 4px 20px rgba(168,85,247,.5)",
            transition: "opacity .4s", pointerEvents: "none"
        });
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, 2000);
}

/* ════════════════════════════════════════
   TASKS – tải và render
════════════════════════════════════════ */
async function loadTasks() {
    try {
        const data = await fetchJSON("/tasks");
        if (!data || !data.length) return;
        const task = data[0];

        let focusStatus = null;
        try {
            const focusHistory = await fetchJSON("/api/focus/history");
            if (Array.isArray(focusHistory) && focusHistory.length > 0) {
                focusStatus = focusHistory[0].status;
            }
        } catch (_) { }

        document.querySelectorAll(".task-row").forEach(row => {
            const taskKey = row.dataset.task;

            const dbKey = _dbKey(taskKey);
            const completed = dbKey ? !!task[dbKey] : false;

            const startBtn = row.querySelector(".start-btn");
            const claimBtn = row.querySelector(".claim-xp-btn");
            const subEl = row.querySelector(".task-sub");

            if (startBtn) startBtn.classList.add("hidden");
            if (claimBtn) { claimBtn.classList.add("hidden"); claimBtn.style.display = "none"; }

            if (taskKey === "focus") {
                const isClaimed = !!(task["focus_xp_claimed"]);
                if (isClaimed) {
                    if (subEl) subEl.textContent = "✓ Đã nhận XP";
                } else if (task["focus_completed"] || focusStatus === "finished") {
                    if (claimBtn) {
                        claimBtn.classList.remove("hidden");
                        claimBtn.style.display = "block";
                    }
                    if (subEl) subEl.textContent = "Hoàn thành – Nhận XP";
                } else {
                    if (startBtn) startBtn.classList.remove("hidden");
                    if (subEl) subEl.textContent = "Chưa bắt đầu";
                }
            } else {
                const claimedField = dbKey + "_xp_claimed";
                const isClaimed = dbKey ? !!task[claimedField] : false;

                if (isClaimed) {
                    if (subEl) subEl.textContent = "✓ Đã nhận XP";
                } else if (completed) {
                    if (claimBtn) { claimBtn.classList.remove("hidden"); claimBtn.style.display = "block"; }
                    if (subEl) subEl.textContent = "Hoàn thành – Nhận XP";
                } else {
                    if (startBtn) startBtn.classList.remove("hidden");
                    if (subEl) subEl.textContent = "Chưa bắt đầu";
                }
            }

            // Progress bar
            const percentEl = row.querySelector(".task-val");
            const progressEl = row.querySelector(".progress-fill");
            if (percentEl && progressEl) {
                const percent = completed ? 100 : 0;
                percentEl.textContent = percent + "%";
                percentEl.classList.toggle("zero", percent === 0);
                progressEl.style.width = percent + "%";
            }
        });
    } catch (err) {
        console.error("loadTasks error:", err.message);
    }
}

function _dbKey(dataTask) {
    const map = {
        "walk_completed": "walk_completed",
        "walk_5000_steps": "walk_completed",
        "meditate_10min": "meditate_10min",
        "exercise_20min": "exercise_20min",
        "reading_10min": "reading_10min",
        "read_10min": "reading_10min",
        "focus": "focus_completed",
        "focus_completed": "focus_completed"
    };
    return map[dataTask] || dataTask;
}
/* ════════════════════════════════════════
   MOTIVATION QUOTES
════════════════════════════════════════ */
const quotes = [
    "Kỷ luật hôm nay, tự do ngày mai.",
    "Mỗi ngày tiến lên một chút.",
    "Không cần hoàn hảo, chỉ cần tốt hơn hôm qua.",
    "Thành công được xây từ những thói quen nhỏ.",
    "Bắt đầu nhỏ, kiên trì lớn.",
    "Một bước nhỏ vẫn là tiến về phía trước.",
    "Cơ thể khỏe, tinh thần mạnh.",
    "Đừng chờ động lực, hãy tạo kỷ luật.",
    "Tương lai được xây từ hôm nay.",
    "Làm điều khó trước, cuộc sống sẽ dễ hơn.",
    "Bạn không cần nhanh, chỉ cần không dừng lại.",
    "Những điều lớn bắt đầu từ việc nhỏ.",
    "Kiên trì luôn thắng cảm hứng.",
    "Hôm nay cố gắng, ngày mai nhẹ nhàng.",
    "Một ngày tốt bắt đầu từ hành động.",
    "Chậm nhưng chắc vẫn là tiến bộ.",
    "Đừng so sánh, hãy cải thiện.",
    "Mỗi ngày tốt hơn 1%.",
    "Tiến bộ quan trọng hơn tốc độ.",
    "Đừng bỏ cuộc khi bạn đã đi được nửa đường.",
    "Những thói quen nhỏ tạo nên cuộc đời lớn.",
    "Làm hôm nay để ngày mai cảm ơn chính mình.",
    "Sức mạnh bắt đầu từ sự kiên định.",
    "Đừng để ngày hôm nay trôi qua vô ích.",
    "Một ngày kỷ luật, một bước gần mục tiêu.",
    "Thành công là kết quả của lặp lại.",
    "Tập trung vào hành động, kết quả sẽ đến.",
    "Không cần hoàn hảo, chỉ cần tiếp tục.",
    "Kiên trì biến điều khó thành điều quen.",
    "Mỗi ngày là một cơ hội mới.",
    "Bạn mạnh hơn những gì bạn nghĩ.",
    "Bắt đầu là bước khó nhất.",
    "Giữ nhịp, đừng dừng.",
    "Hành động nhỏ tạo thay đổi lớn.",
    "Một thói quen tốt mỗi ngày.",
    "Cố gắng hôm nay, tự hào ngày mai.",
    "Sự tiến bộ luôn bắt đầu từ kỷ luật.",
    "Làm ít nhưng làm đều.",
    "Đừng chờ ngày hoàn hảo.",
    "Bước tiếp dù nhỏ vẫn có giá trị.",
    "Chỉ cần tiếp tục.",
    "Hôm nay tốt hơn hôm qua.",
    "Kỷ luật là siêu năng lực.",
    "Tập trung vào điều quan trọng.",
    "Đi chậm vẫn hơn đứng yên.",
    "Làm điều đúng, ngay cả khi khó.",
    "Thành công thích sự kiên trì.",
    "Hãy bắt đầu ngay bây giờ.",
    "Động lực đến sau hành động.",
    "Bạn đang tiến bộ mỗi ngày."
];

function randomQuote() {
    const el = document.getElementById("motivationQuote");
    if (el) el.innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

/* ════════════════════════════════════════
   MAIN ENTRY POINT
════════════════════════════════════════ */
window.onload = async () => {
    await loadTasks();
    await loadLeaderboard();
    await lightTodayFire();
    randomQuote();

    // Ẩn các nút claim lúc khởi động (loadTasks đã xử lý, đây là safety net)
    ["meditationClaimBtn", "exerciseClaimBtn", "readClaimBtn"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) { btn.classList.add("hidden"); btn.style.display = "none"; }
    });

    let player;
    try {
        const res = await fetch("/profile-data");
        if (res.ok) player = await res.json();
    } catch (err) {
        console.error("[onload] fetch /profile-data thất bại:", err.message);
    }

    if (player) {
        updateTopBar(player);
        await loadProfileWithData(player);
    }

    const hasNickname = player && typeof player.nickname === "string" && player.nickname.trim().length > 0;
    if (!hasNickname) openNicknamePopup();

    const gearBtn = document.getElementById("gearBtn");
    const gearDropdown = document.getElementById("gearDropdown");
    if (gearBtn && gearDropdown) {
        gearBtn.addEventListener("click", e => {
            e.stopPropagation();
            gearDropdown.style.display = gearDropdown.style.display === "none" ? "block" : "none";
        });
        document.addEventListener("click", () => { gearDropdown.style.display = "none"; });
    }
};