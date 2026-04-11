// app.js
const API = "";


/* =========================================================
   👤 MODULE: AVATAR & PROFILE OVERLAY
   - avatarBtn: nút avatar góc trên, click mở overlay
   - profileOverlay: panel trượt từ phải
   - loadProfile(): gọi API /profile-data rồi điền UI
========================================================= */
function showStreak() { hideAll(); document.getElementById("streakSection").style.display = "block"; }
function toggleMenu() { document.querySelector(".settings")?.classList.toggle("active"); }
function logout()     { window.location.href = "/logout"; }

const avatarBtn      = document.getElementById("avatarBtn");
const profileOverlay = document.getElementById("profileOverlay");
const pmClose        = document.getElementById("pmClose");

if (avatarBtn && profileOverlay) {
    avatarBtn.addEventListener("click", () => {
        profileOverlay.classList.add("open");
        loadProfile();
    });
    pmClose?.addEventListener("click", () => profileOverlay.classList.remove("open"));
    profileOverlay.addEventListener("click", e => {
        if (e.target === profileOverlay) profileOverlay.classList.remove("open");
    });
}


/* =========================================================
   👤 MODULE: LOAD PROFILE WITH DATA
   - Nhận object player từ /profile-data
   - Điền toàn bộ UI: avatar, level, XP bar, streak, rank
   - Gọi thêm /leaderboardList để lấy rank của user
   - Field từ DB: total_streak, xp_to_next, level, xp, nickname, name
========================================================= */
async function loadProfileWithData(player) {
    const level   = player.level  ?? 0;
    const totalXp = player.xp     ?? 0;

    const { xpIn, xpToNext, pct } = _calcXP(totalXp, level, player.xp_to_next);
    const displayName = _pickDisplayName(player.nickname, player.name, "Warrior");

    // Top bar
    _set("avatarBtn",    player.avatar || "WA");
    _set("profileLevel", "Level " + level);
    _set("profileXpText", `${xpIn} / ${xpToNext} XP`);
    _setBar("profileXpBar", pct);

    // Streak pill (total_streak = streak dài nhất đạt được)
    const firePill = document.querySelector(".day-pill.fire");
    if (firePill) firePill.textContent = "🔥 " + (player.total_streak || 0);

    // Profile mini panel (pmXxx)
    _set("pmAvatar",   player.avatar || "WA");
    _set("pmName",     displayName);
    _set("pmEmail",    player.email  || "—");
    _set("pmBadge",    "Level " + level);
    _set("pmXpText",   `${xpIn} / ${xpToNext} XP`);
    _set("pmStreak",   player.total_streak ? `🔥 ${player.total_streak} ngày` : "—");
    _set("pmTotalXp",  totalXp);
    _setBar("pmXpBar", pct);

    // Rank: lấy từ leaderboard, is_me = 1 được backend tính theo session
    try {
        const lb = await fetch("/leaderboardList").then(r => r.json());
        const me = Array.isArray(lb) ? lb.find(p => p.is_me == 1) : null;
        _set("pmRank", me ? "#" + me.user_rank : "#—");
    } catch (_) { _set("pmRank", "#—"); }
}

// Gọi API rồi truyền vào loadProfileWithData
async function loadProfile() {
    try {
        const player = await fetchJSON("/profile-data");
        await loadProfileWithData(player);
    } catch (err) {
        console.error("[loadProfile]", err.message);
    }
}


/* =========================================================
   🔧 MODULE: PAGE UTILITIES – ẨN/HIỆN PAGE
========================================================= */
function hideAll() {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
}


/* =========================================================
   🔧 MODULE: DOM HELPERS – SET TEXT & WIDTH BAR
   _set(id, val)     → gán textContent
   _setBar(id, pct)  → animate thanh XP từ 0% → pct%
========================================================= */
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


/* =========================================================
   🔧 MODULE: FETCH HELPER – fetchJSON
   - Wrapper fetch trả JSON, tự log lỗi nếu server trả HTML
   - Dùng thay cho fetch() thô để dễ debug
========================================================= */
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


/* =========================================================
   🔧 MODULE: DISPLAY HELPERS
   _pickDisplayName: ưu tiên nickname → name → fallback
   displayNickname:  cập nhật tên hiển thị trên top bar
========================================================= */
function _pickDisplayName(nickname, name, fallback = "Warrior") {
    const nick = typeof nickname === "string" ? nickname.trim() : "";
    if (nick.length > 0) return nick;
    const fullName = typeof name === "string" ? name.trim() : "";
    return fullName.length > 0 ? fullName : fallback;
}

function displayNickname(nickname) {
    _set("profileName", typeof nickname === "string" && nickname.trim()
        ? nickname.trim()
        : "Warrior");
}


/* =========================================================
   ⚡ MODULE: XP & LEVEL CALCULATION
   - xpFloor = tổng XP tích lũy để đạt level hiện tại
   - xpIn    = XP đang có trong level này
   - pct     = % thanh XP (0–100)
   - Dùng xp_to_next từ DB nếu có, fallback = (level+1)*100
========================================================= */
function _calcXP(totalXp, level, xpToNextDB) {
    const xpFloor  = level * (level + 1) / 2 * 100;
    const xpToNext = (xpToNextDB && xpToNextDB > 0) ? xpToNextDB : (level + 1) * 100;
    const xpIn     = Math.max(0, totalXp - xpFloor);
    const pct      = Math.min(Math.round(xpIn / xpToNext * 100), 100);
    return { xpIn, xpToNext, pct };
}


/* =========================================================
   🏆 MODULE: LEADERBOARD – BẢNG XẾP HẠNG
   - Gọi GET /leaderboardList
   - is_me = 1 được backend tính theo session (không hardcode)
   - user_rank = RANK() OVER ORDER BY xp DESC
   - Medal: 🥇🥈🥉 cho top 3
========================================================= */
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
            const isMe        = p.is_me == 1;
            const displayName = _pickDisplayName(p.nickname, p.name, "Người chơi");
            const medal       = MEDALS[p.user_rank]
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

        // Cập nhật dòng "vị trí của tôi" ở dưới leaderboard
        const me = players.find(p => p.is_me == 1);
        if (me) {
            _set("myRankPos",    "#" + me.user_rank);
            _set("myRankAvatar", me.avatar || "WA");
            _set("myRankName",   _pickDisplayName(me.nickname, me.name, "Bạn"));
            _set("myRankSub",    `Level ${me.level} • ${me.xp} XP`);
        }
    } catch (err) {
        console.error("loadLeaderboard error:", err.message);
        list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px">
            Không tải được —
            <button onclick="loadLeaderboard()" style="color:#c084fc;background:none;border:none;cursor:pointer;font-weight:700">Thử lại</button>
        </div>`;
    }
}


/* =========================================================
   📊 MODULE: TOP BAR – CẬP NHẬT THANH THÔNG TIN ĐẦU TRANG
   - Hiển thị nickname, level, XP bar, streak
   - Gọi mỗi khi profile thay đổi (claim XP, đổi nickname…)
========================================================= */
function updateTopBar(player) {
    const displayName = _pickDisplayName(player.nickname, player.name, "Warrior");
    _set("profileName",  displayName);
    _set("profileLevel", `Level ${player.level || 1}`);

    const { xpIn, xpToNext, pct } = _calcXP(player.xp || 0, player.level || 1, player.xp_to_next);
    _set("profileXpText", `${xpIn} / ${xpToNext} XP`);
    _setBar("profileXpBar", pct);

    const firePill = document.querySelector(".day-pill.fire");
    if (firePill) firePill.textContent = `🔥 ${player.total_streak || 0}`;
}


/* =========================================================
   🔥 MODULE: STREAK FIRE PILLS – TÔ MÀU 7 Ô NGÀY TRONG TUẦN
   - Gọi GET /api/streak-history
   - Backend trả mảng { streak_date, is_streak_day }
   - Map ngày trong tuần → index pill (T2=0 … CN=6)
   - Pill có is_streak_day=1 → thêm class 'fire-active'
========================================================= */
async function lightTodayFire() {
    const dayPills = document.querySelectorAll('.day-pill');
    if (!dayPills.length) return;

    try {
        const response = await fetch("/api/streak-history");
        if (!response.ok) return;

        const historyData = await response.json();
        const records = Array.isArray(historyData) ? historyData : (historyData.data || []);

        if (!Array.isArray(records)) {
            console.error("Dữ liệu streak không hợp lệ");
            return;
        }

        const activeIndices = new Set();
        // map: getDay() 0(CN)→6, 1(T2)→0 … 6(T7)→5
        const map = [6, 0, 1, 2, 3, 4, 5];

        records.forEach(record => {
            if (record.is_streak_day === 1 && record.streak_date) {
                const dateStr  = record.streak_date.split('T')[0].replace(/-/g, '/');
                const date     = new Date(dateStr);
                const dayIndex = map[date.getDay()];
                activeIndices.add(dayIndex);
            }
        });

        dayPills.forEach((pill, index) => {
            pill.classList.remove('fire-active', 'active');
            if (activeIndices.has(index)) pill.classList.add('fire-active');
        });

    } catch (e) {
        console.error("Lỗi cập nhật streak:", e);
    }
}


/* =========================================================
   🧘 MODULE: MEDITATION TIMER – ĐẾM NGƯỢC 10 PHÚT
   - Bấm nút → fullscreen countdown → hiện nút Claim XP
   - claimXP('meditate_10min') khi claim
   ─ Muốn đổi thời gian: đổi giá trị 600 (giây)
========================================================= */
let meditationTimer          = null;
let currentMeditationSeconds = 600; // 10 phút

function updateMeditationClock() {
    const m = Math.floor(currentMeditationSeconds / 60);
    const s = currentMeditationSeconds % 60;
    setFlip("medM1", Math.floor(m / 10));
    setFlip("medM2", m % 10);
    setFlip("medS1", Math.floor(s / 10));
    setFlip("medS2", s % 10);
}

function startMeditation() {
    document.getElementById("startMeditationBtn")?.classList.add("hidden");
    document.getElementById("meditationFullscreen").style.display = "flex";
    currentMeditationSeconds = 600;
    updateMeditationClock();

    if (meditationTimer) clearInterval(meditationTimer);
    meditationTimer = setInterval(() => {
        currentMeditationSeconds--;
        updateMeditationClock();
        if (currentMeditationSeconds <= 0) {
            clearInterval(meditationTimer);
            showMeditationCompleted();
        }
    }, 1000);
}

function showMeditationCompleted() {
    document.getElementById("meditationFullscreen").style.display = "none";
    const claimBtn = document.getElementById("meditationClaimBtn");
    if (claimBtn) { claimBtn.classList.remove("hidden"); claimBtn.style.display = "block"; }
}

function stopMeditation() {
    if (meditationTimer) clearInterval(meditationTimer);
    showMeditationCompleted();
}


/* =========================================================
   🏋️ MODULE: EXERCISE TIMER – ĐẾM NGƯỢC 20 PHÚT
   - claimXP('exercise_20min') khi claim
   ─ Muốn đổi thời gian: đổi 1200 (giây)
========================================================= */
let exerciseTimer          = null;
let currentExerciseSeconds = 1200; // 20 phút

function updateExerciseClock() {
    const m = Math.floor(currentExerciseSeconds / 60);
    const s = currentExerciseSeconds % 60;
    setFlip("exM1", Math.floor(m / 10));
    setFlip("exM2", m % 10);
    setFlip("exS1", Math.floor(s / 10));
    setFlip("exS2", s % 10);
}

function startExercise() {
    document.getElementById("startExerciseBtn")?.classList.add("hidden");
    document.getElementById("exerciseFullscreen").style.display = "flex";
    currentExerciseSeconds = 1200;
    updateExerciseClock();

    if (exerciseTimer) clearInterval(exerciseTimer);
    exerciseTimer = setInterval(() => {
        currentExerciseSeconds--;
        updateExerciseClock();
        if (currentExerciseSeconds <= 0) {
            clearInterval(exerciseTimer);
            showExerciseCompleted();
        }
    }, 1000);
}

function showExerciseCompleted() {
    document.getElementById("exerciseFullscreen").style.display = "none";
    const claimBtn = document.getElementById("exerciseClaimBtn");
    if (claimBtn) { claimBtn.classList.remove("hidden"); claimBtn.style.display = "block"; }
}

function stopExercise() {
    if (exerciseTimer) clearInterval(exerciseTimer);
    showExerciseCompleted();
}


/* =========================================================
   📖 MODULE: READING TIMER – ĐẾM NGƯỢC 10 PHÚT
   - claimXP('reading_10min') khi claim (nếu có nút)
   ─ Muốn đổi thời gian: đổi 600 (giây)
========================================================= */
let readingTimer          = null;
let currentReadingSeconds = 600; // 10 phút

function updateReadingClock() {
    const m = Math.floor(currentReadingSeconds / 60);
    const s = currentReadingSeconds % 60;
    setFlip("readM1", Math.floor(m / 10));
    setFlip("readM2", m % 10);
    setFlip("readS1", Math.floor(s / 10));
    setFlip("readS2", s % 10);
}

function startReading() {
    document.getElementById("startReadBtn")?.classList.add("hidden");
    document.getElementById("readingFullscreen").style.display = "flex";
    currentReadingSeconds = 600;
    updateReadingClock();

    if (readingTimer) clearInterval(readingTimer);
    readingTimer = setInterval(() => {
        currentReadingSeconds--;
        updateReadingClock();
        if (currentReadingSeconds <= 0) {
            clearInterval(readingTimer);
            showReadingCompleted();
        }
    }, 1000);
}

function showReadingCompleted() {
    document.getElementById("readingFullscreen").style.display = "none";
    const claimBtn = document.getElementById("readClaimBtn");
    if (claimBtn) { claimBtn.classList.remove("hidden"); claimBtn.style.display = "block"; }
}

function stopReading() {
    if (readingTimer) clearInterval(readingTimer);
    showReadingCompleted();
}


/* =========================================================
   🔧 MODULE: FLIP CLOCK HELPER – HIỆU ỨNG LẬT SỐ
   - Dùng chung cho tất cả timer (meditation, exercise, reading)
========================================================= */
function setFlip(id, value) {
    const el = document.getElementById(id);
    if (!el || el.textContent == value) return;
    el.classList.remove("flip");
    void el.offsetWidth; // reflow để reset animation
    el.textContent = value;
    el.classList.add("flip");
}


/* =========================================================
   🎁 MODULE: CLAIM XP – NHẬN XP SAU KHI HOÀN THÀNH HOẠT ĐỘNG
   - Gọi POST /api/tasks/claim-xp với task_name
   - task_name hợp lệ: 'meditate_10min', 'exercise_20min', 'reading_10min'
     và các task chính: 'walk_completed', 'sleep_completed'…
   - Sau khi claim: refresh topbar, leaderboard, tasks, streak
========================================================= */
async function claimXP(task) {
    try {
        const res  = await fetch("/api/tasks/claim-xp", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ task_name: task })
        });
        const data = await res.json();

        if (data.error) { alert("Lỗi: " + data.error); return; }

        if (data.success) {
            alert(`+${data.xp_gain} XP`);

            // Refresh toàn bộ UI liên quan đến XP
            const player = await fetchJSON("/profile-data");
            updateTopBar(player);
            await loadProfileWithData(player);
            loadTasks();
            loadLeaderboard();
            await lightTodayFire();
        }
    } catch (err) {
        console.error(err);
        alert("Không thể kết nối với server");
    }
}


/* =========================================================
   📋 MODULE: TASKS – TẢI VÀ HIỂN THỊ NHIỆM VỤ NGÀY HÔM NAY
   - Gọi GET /tasks → backend tự tạo bản ghi nếu chưa có
   - data[0] chứa tất cả cột: walk_completed, walk_xp_claimed…
   - Mỗi .task-row có data-task = tên cột task
   - Logic: completed=true → hiện claimBtn hoặc "Đã nhận XP"
             completed=false → hiện startBtn
========================================================= */
async function loadTasks() {
    try {
        const data = await fetchJSON("/tasks");
        if (!data || !data.length) return;

        const task = data[0];

        document.querySelectorAll(".task-row").forEach(row => {
            const taskKey     = row.dataset.task;
            const completed   = !!task[taskKey];
            const claimedField = taskKey + "_xp_claimed";
            const isClaimed   = !!task[claimedField];

            const startBtn  = row.querySelector(".start-btn");
            const claimBtn  = row.querySelector(".claim-xp-btn");
            const subEl     = row.querySelector(".task-sub");
            const percentEl = row.querySelector(".task-val");
            const progressEl= row.querySelector(".progress-fill");

            // Reset trạng thái
            startBtn?.classList.add("hidden");
            claimBtn?.classList.add("hidden");

            if (completed) {
                if (isClaimed) {
                    if (subEl) subEl.textContent = "✓ Đã nhận XP";
                } else {
                    if (claimBtn) { claimBtn.classList.remove("hidden"); claimBtn.style.display = "block"; }
                    if (subEl)    subEl.textContent = "Hoàn thành – Nhận XP";
                }
            } else {
                if (startBtn) startBtn.classList.remove("hidden");
                if (subEl)    subEl.textContent = "Chưa bắt đầu";
            }

            // Cập nhật % thanh tiến trình
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

// Cập nhật UI task thủ công (dùng khi cần update riêng lẻ)
function updateTaskUI(row, value) {
    const percentEl  = row.querySelector(".task-val");
    const progressEl = row.querySelector(".progress-fill");
    const subEl      = row.querySelector(".task-sub");

    if (percentEl && progressEl) {
        const percent = value ? 100 : 0;
        percentEl.textContent = percent + "%";
        percentEl.classList.toggle("zero", percent === 0);
        progressEl.style.width = percent + "%";
    }
    if (subEl) {
        subEl.textContent = typeof value === "number"
            ? value + " phút"
            : value ? "✔ Completed" : "Chưa ghi nhận";
    }
}


/* =========================================================
   ✏️ MODULE: NICKNAME POPUP – NHẬP NICKNAME LẦN ĐẦU
   - Tự mở khi user chưa có nickname (kiểm tra lúc onload)
   - Gọi POST /api/nickname để lưu
   - Sau khi lưu → cập nhật topbar, leaderboard
========================================================= */
const nmInput = document.getElementById("nicknameInput");
if (nmInput) {
    nmInput.addEventListener("input", () => {
        const len     = nmInput.value.length;
        const counter = document.getElementById("nmCounter");
        if (counter) {
            counter.textContent = len + "/20";
            counter.style.color = len >= 18 ? "#f87171" : "";
        }
    });
    nmInput.addEventListener("keydown", e => { if (e.key === "Enter") saveNickname(); });
}

function openNicknamePopup() {
    const ov = document.getElementById("nicknameOverlay");
    if (ov) {
        ov.style.display = "flex";
        ov.classList.add("open");
        setTimeout(() => document.getElementById("nicknameInput")?.focus(), 100);
    }
}

function closeNicknamePopup() {
    const ov = document.getElementById("nicknameOverlay");
    if (ov) { ov.classList.remove("open"); ov.style.display = "none"; }
}

async function saveNickname() {
    const input    = document.getElementById("nicknameInput");
    const errEl    = document.getElementById("nmError");
    const btn      = document.getElementById("nmConfirm");
    const nickname = input.value.trim();

    if (nickname.length > 20) { errEl.textContent = "Nickname tối đa 20 ký tự"; return; }
    if (!nickname || nickname.length < 2) {
        errEl.textContent = nickname ? "Nickname phải có ít nhất 2 ký tự" : "Vui lòng nhập nickname";
        input.focus();
        return;
    }

    errEl.textContent = "";
    btn.disabled      = true;
    btn.textContent   = "Đang lưu...";

    try {
        const json = await fetchJSON("/api/nickname", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ nickname })
        });
        closeNicknamePopup();
        displayNickname(json.nickname || nickname);

        const player = await fetchJSON("/profile-data");
        updateTopBar(player);
        await loadProfileWithData(player);
        loadLeaderboard();
    } catch (err) {
        errEl.textContent = err.message || "Không thể kết nối server";
        btn.disabled      = false;
        btn.textContent   = "Xác nhận";
    }
}

// Bỏ qua nhập nickname → lấy name làm nickname
async function skipNickname() {
    try {
        const player = await fetchJSON("/profile-data");
        const name   = _pickDisplayName(player.nickname, player.name, "Warrior");
        await fetchJSON("/api/nickname", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ nickname: name })
        });
        displayNickname(name);
    } catch (_) { }
    closeNicknamePopup();
}


/* =========================================================
   💬 MODULE: MOTIVATION QUOTES – CÂU QUOTE NGẪU NHIÊN
   - Hiển thị vào #motivationQuote mỗi lần load trang
   ─ Thêm quote mới: thêm vào mảng quotes
========================================================= */
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


/* =========================================================
   🚀 MODULE: MAIN ENTRY POINT – KHỞI CHẠY KHI TRANG TẢI
   - Thứ tự: tasks → leaderboard → streak fire → quote → profile
   - Hiện nickname popup nếu user chưa có nickname
   - Gán onclick cho claimBtn meditation & exercise
========================================================= */
window.onload = async () => {
    loadTasks();
    loadLeaderboard();
    lightTodayFire();
    randomQuote();

    // Ẩn nút claim mặc định (chỉ hiện sau khi timer chạy xong)
    document.getElementById("meditationClaimBtn") && (document.getElementById("meditationClaimBtn").style.display = "none");
    document.getElementById("exerciseClaimBtn")   && (document.getElementById("exerciseClaimBtn").style.display   = "none");

    // Load profile
    let player;
    try {
        const res = await fetch("/profile-data");
        if (res.ok) {
            player = await res.json();
            console.log("[onload] player:", player);
        }
    } catch (err) {
        console.error("[onload] fetch /profile-data thất bại:", err.message);
    }

    if (player) {
        updateTopBar(player);
        await loadProfileWithData(player);
    }

    // Nếu chưa có nickname → mở popup nhập
    // const hasNickname = player
    //     && typeof player.nickname === "string"
    //     && player.nickname.trim().length > 0;
    // if (!hasNickname) openNicknamePopup();

    // Gán sự kiện cho nút claim bonus
    document.getElementById("meditationClaimBtn") && (document.getElementById("meditationClaimBtn").onclick = () => claimXP('meditate_10min'));
    document.getElementById("exerciseClaimBtn")   && (document.getElementById("exerciseClaimBtn").onclick   = () => claimXP('exercise_20min'));
};