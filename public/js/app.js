const API = "";

function hideAll() { document.querySelectorAll(".page").forEach(p => p.style.display = "none"); }
function showTasks() { hideAll(); document.getElementById("taskSection").style.display = "block"; }
function showFocus() { hideAll(); document.getElementById("focusSection").style.display = "block"; }
function showScreenTime() { hideAll(); document.getElementById("screenSection").style.display = "block"; }
function showLeaderboard() { loadLeaderboard(); }
function showStreak() { hideAll(); document.getElementById("streakSection").style.display = "block"; }
function toggleMenu() { document.querySelector(".settings")?.classList.toggle("active"); }
function logout() { window.location.href = "/logout"; }

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

async function loadLeaderboard() {
    const list = document.getElementById("leaderboardList");
    if (!list) return;
    try {
        const players = await (await fetch("/leaderboardList")).json();
        if (!Array.isArray(players) || !players.length) {
            list.innerHTML = `<div class="lb-row" style="justify-content:center;color:var(--muted);font-size:13px">Chưa có dữ liệu</div>`;
            return;
        }
        list.innerHTML = players.map(p => {

            const isMe = p.is_me === 1;

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

        const me = players.find(p => p.is_me === 1);
        if (me) {
            _set("myRankPos", "#" + me.user_rank);
            _set("myRankAvatar", me.avatar || "WA");
            _set("myRankName", _pickDisplayName(me.nickname, me.name, "Bạn"));
            _set("myRankSub", `Level ${me.level} • ${me.xp} XP`);
        }
    } catch (err) {
        list.innerHTML = `<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px">⚠️ Không tải được — <button onclick="loadLeaderboard()" style="color:#c084fc;background:none;border:none;cursor:pointer;font-weight:700">Thử lại</button></div>`;
    }
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

function _pickDisplayName(nickname, name, fallback = "Warrior") {
    const nick = typeof nickname === "string" ? nickname.trim() : "";
    if (nick.length > 0) return nick;
    const fullName = typeof name === "string" ? name.trim() : "";
    if (fullName.length > 0) return fullName;
    return fallback;
}

async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        const message = (json && json.error) ? json.error : `HTTP ${res.status}`;
        throw new Error(message);
    }
    if (!json || json.error) {
        throw new Error((json && json.error) ? json.error : "Dữ liệu không hợp lệ");
    }
    return json;
}

/*XP BAR CALCULATION*/
function _calcXP(totalXp, level, xpToNextDB) {
    const xpFloor = level * (level + 1) / 2 * 100;
    const xpToNext = (xpToNextDB && xpToNextDB > 0) ? xpToNextDB : (level + 1) * 100;
    const xpIn = Math.max(0, totalXp - xpFloor);
    const pct = Math.min(Math.round(xpIn / xpToNext * 100), 100);
    return { xpIn, xpToNext, pct };
}

function displayNickname(nickname) {
    const el = document.getElementById("profileName");
    if (!el) return;
    const nick = typeof nickname === "string" ? nickname.trim() : "";
    el.textContent = nick;
}

async function loadProfileWithData(player) {
    const level = player.level ?? 0;
    const totalXp = player.xp ?? 0;
    const streak = player.streak ?? 0;

    const { xpIn, xpToNext, pct } = _calcXP(totalXp, level, player.xp_to_next);

    _set("avatarBtn", player.avatar || "WA");
    _set("profileLevel", "Level " + level);
    _set("profileXpText", `${xpIn} / ${xpToNext} XP`);
    _setBar("profileXpBar", pct);

    const firePill = document.querySelector(".day-pill.fire");
    if (firePill) firePill.textContent = "🔥 " + streak;

    const displayName = _pickDisplayName(player.nickname, player.name, "Warrior");
    displayNickname(player.nickname);

    _set("pmAvatar", player.avatar || "WA");
    _set("pmName", displayName);
    _set("pmEmail", player.email || "—");
    _set("pmBadge", "Level " + level);
    _set("pmXpText", `${xpIn} / ${xpToNext} XP`);
    _set("pmStreak", streak);
    _set("pmTotalXp", totalXp);
    _setBar("pmXpBar", pct);

    try {
        const lb = await (await fetch("/leaderboardList")).json();
        const me = Array.isArray(lb) ? lb.find(p => p.is_me === 1) : null;
        _set("pmRank", me ? "#" + me.user_rank : "#—");
    } catch (_) { _set("pmRank", "#—"); }
}

async function loadProfile() {
    try {
        const player = await fetchJSON("/profile-data");
        await loadProfileWithData(player);
    } catch (err) { console.error("[loadProfile]", err.message); }
}

const gearBtn = document.getElementById("gearBtn");
const gearDropdown = document.getElementById("gearDropdown");
if (gearBtn && gearDropdown) {
    gearBtn.addEventListener("click", e => {
        e.stopPropagation();
        const open = gearDropdown.classList.toggle("open");
        gearBtn.classList.toggle("gear-active", open);
    });
    document.addEventListener("click", () => {
        gearDropdown.classList.remove("open");
        gearBtn.classList.remove("gear-active");
    });
}

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

const nmInput = document.getElementById("nicknameInput");
if (nmInput) {
    nmInput.addEventListener("input", () => {
        const len = nmInput.value.length;
        const counter = document.getElementById("nmCounter");
        if (counter) { counter.textContent = len + "/20"; counter.style.color = len >= 18 ? "#f87171" : ""; }
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
    const input = document.getElementById("nicknameInput");
    const errEl = document.getElementById("nmError");
    const btn = document.getElementById("nmConfirm");
    const nickname = input.value.trim();

    if (!nickname || nickname.length < 2) {
        errEl.textContent = nickname ? "Nickname phải có ít nhất 2 ký tự" : "Vui lòng nhập nickname";
        input.focus(); return;
    }
    errEl.textContent = "";
    btn.disabled = true; btn.textContent = "Đang lưu...";

    try {
        const json = await fetchJSON("/api/nickname", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname })
        });
        closeNicknamePopup();
        displayNickname(json.nickname || nickname);
    } catch (err) {
        errEl.textContent = err.message || "Không thể kết nối server";
        btn.disabled = false; btn.textContent = "Xác nhận";
    }
}

async function skipNickname() {
    try {
        const player = await fetchJSON("/profile-data");
        const name = player.name || "Warrior";
        await fetchJSON("/api/nickname", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: name })
        });
        displayNickname(name);
    } catch (_) { }
    closeNicknamePopup();
}

async function loadTasks() {
    try {
        const data = await (await fetch("/tasks")).json();
        const list = document.getElementById("tasks");
        if (!list) return;
        list.innerHTML = "";
        if (!data || !data.length) { list.innerHTML = "<li>Không có nhiệm vụ hôm nay</li>"; return; }
        data.forEach(task => {
            [
                { name: "🚶 Walk 5km", done: task.walk_completed, type: "walk_completed" },
                { name: "😴 Sleep before 23:00", done: task.sleep_completed, type: "sleep_completed" },
                { name: "📱 Screen under limit", done: task.screen_completed, type: "screen_completed" },
                { name: "🎯 Focus 25 minutes", done: task.focus_completed, type: "focus_completed" }
            ].forEach(t => {
                const li = document.createElement("li");
                li.innerHTML = `<span>${t.name}</span>
                    <button ${t.done ? "disabled" : ""} onclick="completeTask(${task.id},'${t.type}')">
                        ${t.done ? "✔ Completed" : "✓ Done"}</button>`;
                list.appendChild(li);
            });
        });
    } catch (err) { console.error("loadTasks error:", err); }
}

function lightTodayFire() {

    const days = document.querySelectorAll(".day-pill");

    const today = new Date().getDay();

    const map = [7, 1, 2, 3, 4, 5, 6];

    const index = map[today];

    days[index].classList.add("fire-active");

}

async function checkReminder() {

    try {

        const data = await fetch("/api/reminder").then(r => r.json());

        if (data.remind) {

            alert("⚠️ Bạn chưa hoàn thành nhiệm vụ hôm nay!");

        }

    } catch { }

}

setInterval(checkReminder, 60000);

window.onload = async () => {
    loadTasks();
    loadLeaderboard();
    lightTodayFire();

    let player = null;
    try {
        player = await fetchJSON("/profile-data");
        console.log("[onload] player:", JSON.stringify(player));
    } catch (err) {
        console.error("[onload] fetch /profile-data thất bại:", err.message);
        return;
    }

    try {
        await loadProfileWithData(player);
    } catch (err) {
        console.error("[onload] loadProfileWithData lỗi:", err.message);
    }

    const hasNickname = player.nickname && player.nickname.trim().length > 0;
    console.log("[onload] hasNickname:", hasNickname, "| nickname:", player.nickname);
    if (!hasNickname) openNicknamePopup();
};
function logout() {
    window.location.href = "/login";
}

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

    const index = Math.floor(Math.random() * quotes.length);

    document.getElementById("motivationQuote").innerText = quotes[index];

}

document.addEventListener("DOMContentLoaded", randomQuote);