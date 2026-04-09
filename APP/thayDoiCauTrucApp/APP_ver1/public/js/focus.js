//focus.js
let timerInterval = null;
let timeLeft = 0;
let focusMode = '';
let workMinutes = 45;
let breakMinutes = 15;
let sessionCount = 0;
let totalMinutes = 0;
let startSeconds = 0;

let prevDigits = { m1: -1, m2: -1, s1: -1, s2: -1 };

function toggleMenu() {
    const menu = document.getElementById('modeMenu');
    const arrow = document.getElementById('arrow');
    const isOpen = menu.classList.toggle('open');
    arrow.classList.toggle('open', isOpen);
}

function selectMode(mode) {
    const titleEl = document.querySelector('.mode-title');
    if (titleEl.childNodes[0]) {
        titleEl.childNodes[0].textContent = mode + ' ';
    }

    document.getElementById('modeMenu').classList.remove('open');
    document.getElementById('arrow').classList.remove('open');

    const parts = mode.match(/(\d+)\s*-\s*(\d+)/);
    if (parts) {
        workMinutes = parseInt(parts[1]);
        breakMinutes = parseInt(parts[2]);
    }
}

function startFocus(type) {
    focusMode = type;
    timeLeft = workMinutes * 60;
    startSeconds = timeLeft;
    prevDigits = { m1: -1, m2: -1, s1: -1, s2: -1 };

    const fs = document.getElementById("focusFullscreen");
    fs.style.display = "flex";

    document.getElementById("focusModeText").textContent =
        type === "screen" ? "Tập trung trên màn hình" : "Tập trung ngoại tuyến";

    updateFlipClock();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateFlipClock();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            completeFocus();
        }
    }, 1000);
}

function updateFlipClock() {
    const totalSec = Math.max(0, timeLeft);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;

    const m1 = Math.floor(m / 10);
    const m2 = m % 10;
    const s1 = Math.floor(s / 10);
    const s2 = s % 10;

    if (m1 !== prevDigits.m1) { flipDigit('digitM1', m1); prevDigits.m1 = m1; }
    if (m2 !== prevDigits.m2) { flipDigit('digitM2', m2); prevDigits.m2 = m2; }
    if (s1 !== prevDigits.s1) { flipDigit('digitS1', s1); prevDigits.s1 = s1; }
    if (s2 !== prevDigits.s2) { flipDigit('digitS2', s2); prevDigits.s2 = s2; }
}

function flipDigit(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('flip');
    void el.offsetWidth;
    el.textContent = value;
    el.classList.add('flip');
}

function stopFocus() {
    if (timeLeft > 0) {
        document.getElementById("confirmPopup").style.display = "flex";
        return;
    }
    confirmStopFocus();
}

function confirmStopFocus() {
    document.getElementById("confirmPopup").style.display = "none";
    clearInterval(timerInterval);
    saveFocusSession(false);
    document.getElementById("focusFullscreen").style.display = "none";
}

function completeFocus() {
    sessionCount++;
    totalMinutes += workMinutes;

    document.getElementById('session').textContent = sessionCount;
    document.getElementById('total').textContent = totalMinutes;
    document.getElementById('completedSessions').textContent = sessionCount;
    document.getElementById('focusTime').textContent = totalMinutes;

    addHistory();
    saveFocusSession(true);

    document.getElementById("focusFullscreen").style.display = "none";
    document.getElementById("doneText").innerText = `Hoàn thành ${workMinutes} phút tập trung!`;
    document.getElementById("donePopup").style.display = "flex";
}

async function loadHistoryFromDB() {
    try {
        const response = await fetch("/api/focus/history");
        const sessions = await response.json();

        const list = document.getElementById('historyList');
        list.innerHTML = '';

        sessions.forEach(session => {

            const date = new Date(session.created_at);

            const timeStr =
                `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

            const icon =
                session.focus_mode === 'screen' ? "🖥" : "📵";

            const name =
                session.focus_mode === 'screen'
                    ? "Screen Focus"
                    : "Deep Focus";

            const item = document.createElement('div');
            item.className = 'history-item';

            item.innerHTML = `
        <div class="hi-left">
            <div class="hi-icon">${icon}</div>
            <div>
                <div class="hi-name">${name}</div>
                <div class="hi-time">${timeStr}</div>
            </div>
        </div>

        <div class="hi-right">
            <div class="hi-mins">${session.duration_formatted}</div>
        </div>
    `;

            list.appendChild(item);

        });
        console.log("sessions", sessions);

        const duration = sessions.filter(s => s.focus_duration_seconds >= 0);

        const totalSessions = duration.length;
        const totalMins = duration.reduce((sum, s) => {
            const mins = Math.floor(s.focus_duration_seconds || 0);
            return sum + mins;
        }, 0);

        _setEl('session', totalSessions);
        _setEl('total', totalMins);
        _setEl('completedSessions', totalSessions);
        _setEl('focusTime', totalMins);

    } catch (err) {
        console.error("Lỗi tải lịch sử:", err);
    }

}
async function saveFocusSession(completed) {
    const usedSeconds = Math.max(0, startSeconds - timeLeft);
    const currentUserId = localStorage.getItem("userId");

    try {
        const res = await fetch("/api/focus/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: currentUserId,
                focus_mode: focusMode || "unknown",
                focus_duration_seconds: usedSeconds,
                time_remaining_seconds: timeLeft || 0,
                status: completed ? "completed" : "unfinished"
            })
        });
        const data = await res.json();
        if (data.success) {
            console.log("Đã lưu vào DB!");
            loadHistoryFromDB();
        } else {
            console.error("Lưu thất bại:", data);
        }
    } catch (err) {
        console.error("Lỗi lưu phiên:", err);
    }
}
function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function openPopup() {
    document.getElementById('focusPopup').classList.add('open');
}

function closePopup() {
    document.getElementById('focusPopup').classList.remove('open');
}

function closeConfirm() {
    document.getElementById("confirmPopup").style.display = "none";
}

function closeDone() {
    document.getElementById("donePopup").style.display = "none";
}

document.addEventListener('click', e => {
    const row = document.querySelector('.focus-row');
    if (row && !row.contains(e.target)) {
        const menu = document.getElementById('modeMenu');
        const arrow = document.getElementById('arrow');
        if (menu) menu.classList.remove('open');
        if (arrow) arrow.classList.remove('open');
    }
});
document.addEventListener('DOMContentLoaded', () => {
    loadHistoryFromDB();
});