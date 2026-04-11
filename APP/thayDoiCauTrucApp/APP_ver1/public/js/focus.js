// focus.js

/* =========================================================
   ⚙️ MODULE: BIẾN TRẠNG THÁI TIMER
   - timerInterval : ID của setInterval đang chạy
   - timeLeft      : giây còn lại
   - focusMode     : 'screen' hoặc 'deep'
   - workMinutes   : phút làm việc (mặc định 45)
   - breakMinutes  : phút nghỉ (mặc định 15)
   - startSeconds  : tổng giây lúc bắt đầu (để tính usedSeconds)
   - prevDigits    : lưu digit cũ để biết khi nào cần flip
========================================================= */
let timerInterval = null;
let timeLeft      = 0;
let focusMode     = '';
let workMinutes   = 45;
let breakMinutes  = 15;
let sessionCount  = 0;
let totalMinutes  = 0;
let startSeconds  = 0;

let prevDigits = { m1: -1, m2: -1, s1: -1, s2: -1 };


/* =========================================================
   📋 MODULE: MODE MENU – CHỌN CHẾ ĐỘ (VD: "45-15", "25-5")
   - toggleMenu(): mở/đóng dropdown
   - selectMode(mode): parse "workMin-breakMin" từ text
     ví dụ mode = "45 - 15" → workMinutes=45, breakMinutes=15
========================================================= */
function toggleMenu() {
    const menu  = document.getElementById('modeMenu');
    const arrow = document.getElementById('arrow');
    const isOpen = menu.classList.toggle('open');
    arrow.classList.toggle('open', isOpen);
}

function selectMode(mode) {
    // Cập nhật tiêu đề hiển thị
    const titleEl = document.querySelector('.mode-title');
    if (titleEl.childNodes[0]) {
        titleEl.childNodes[0].textContent = mode + ' ';
    }

    document.getElementById('modeMenu').classList.remove('open');
    document.getElementById('arrow').classList.remove('open');

    // Parse "45 - 15" → workMinutes=45, breakMinutes=15
    const parts = mode.match(/(\d+)\s*-\s*(\d+)/);
    if (parts) {
        workMinutes  = parseInt(parts[1]);
        breakMinutes = parseInt(parts[2]);
    }
}

// Đóng menu khi click ra ngoài
document.addEventListener('click', e => {
    const row = document.querySelector('.focus-row');
    if (row && !row.contains(e.target)) {
        document.getElementById('modeMenu')?.classList.remove('open');
        document.getElementById('arrow')?.classList.remove('open');
    }
});


/* =========================================================
   ▶️ MODULE: START FOCUS – BẮT ĐẦU PHIÊN TẬP TRUNG
   - type: 'screen' (focus trên màn hình) | 'deep' (ngoại tuyến)
   - Hiện fullscreen, đặt đồng hồ, bắt đầu đếm ngược
   - Khi hết giờ → gọi completeFocus()
========================================================= */
function startFocus(type) {
    focusMode    = type;
    timeLeft     = workMinutes * 60;
    startSeconds = timeLeft;
    prevDigits   = { m1: -1, m2: -1, s1: -1, s2: -1 };

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


/* =========================================================
   🕐 MODULE: FLIP CLOCK – ĐỒNG HỒ LẬT SỐ
   - updateFlipClock(): tính m1,m2,s1,s2 → chỉ flip digit thay đổi
   - flipDigit(id, value): xoá class flip → set số → thêm lại
========================================================= */
function updateFlipClock() {
    const totalSec = Math.max(0, timeLeft);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;

    const m1 = Math.floor(m / 10), m2 = m % 10;
    const s1 = Math.floor(s / 10), s2 = s % 10;

    if (m1 !== prevDigits.m1) { flipDigit('digitM1', m1); prevDigits.m1 = m1; }
    if (m2 !== prevDigits.m2) { flipDigit('digitM2', m2); prevDigits.m2 = m2; }
    if (s1 !== prevDigits.s1) { flipDigit('digitS1', s1); prevDigits.s1 = s1; }
    if (s2 !== prevDigits.s2) { flipDigit('digitS2', s2); prevDigits.s2 = s2; }
}

function flipDigit(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('flip');
    void el.offsetWidth; // reflow để reset animation CSS
    el.textContent = value;
    el.classList.add('flip');
}


/* =========================================================
   ⏹️ MODULE: STOP FOCUS – DỪNG GIỮA CHỪNG
   - Nếu còn thời gian → hiện confirmPopup hỏi xác nhận
   - Nếu hết giờ rồi → dừng ngay không cần hỏi
========================================================= */
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
    saveFocusSession(false); // status = 'unfinished'
    document.getElementById("focusFullscreen").style.display = "none";
}

function closeConfirm() {
    document.getElementById("confirmPopup").style.display = "none";
}


/* =========================================================
   ✅ MODULE: COMPLETE FOCUS – HOÀN THÀNH PHIÊN
   - Tăng sessionCount, totalMinutes (local display)
   - Lưu vào DB qua saveFocusSession(true)
   - Hiện donePopup với thông báo
========================================================= */
function completeFocus() {
    sessionCount++;
    totalMinutes += workMinutes;

    // Cập nhật số liệu hiển thị (local, không từ DB)
    _setEl('session',          sessionCount);
    _setEl('total',            totalMinutes);
    _setEl('completedSessions', sessionCount);
    _setEl('focusTime',        totalMinutes);

    saveFocusSession(true); // status = 'completed'

    document.getElementById("focusFullscreen").style.display = "none";
    document.getElementById("doneText").innerText = `Hoàn thành ${workMinutes} phút tập trung!`;
    document.getElementById("donePopup").style.display = "flex";
}

function closeDone() {
    document.getElementById("donePopup").style.display = "none";
}


/* =========================================================
   💾 MODULE: SAVE FOCUS SESSION – LƯU PHIÊN VÀO DB
   - Gọi POST /api/focus/save
   - Backend dùng session để lấy user_id (không cần gửi)
   - usedSeconds = startSeconds - timeLeft (thời gian thực tập)
   - Sau khi lưu → loadHistoryFromDB() để refresh danh sách
   ⚠️ user_id từ localStorage không còn dùng (backend dùng session)
========================================================= */
async function saveFocusSession(completed) {
    const usedSeconds = Math.max(0, startSeconds - timeLeft);

    try {
        const res = await fetch("/api/focus/save", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                focus_mode:             focusMode || "unknown",
                focus_duration_seconds: usedSeconds,
                time_remaining_seconds: timeLeft || 0,
                status:                 completed ? "completed" : "unfinished"
            })
        });
        const data = await res.json();

        if (data.success) {
            console.log("[Focus] Đã lưu phiên vào DB");
            loadHistoryFromDB(); // Refresh lịch sử
        } else {
            console.error("[Focus] Lưu thất bại:", data);
        }
    } catch (err) {
        console.error("[Focus] Lỗi lưu phiên:", err);
    }
}


/* =========================================================
   📜 MODULE: LOAD HISTORY – TẢI LỊCH SỬ PHIÊN TỪ DB
   - Gọi GET /api/focus/history
   - Hiển thị danh sách vào #historyList
   - Tính tổng sessions và tổng phút từ focus_duration_seconds
   - duration_formatted: cột GENERATED tự tính HH:MM:SS trong DB
   - Bảng: focus_sessions
========================================================= */
async function loadHistoryFromDB() {
    try {
        const response = await fetch("/api/focus/history");
        const sessions = await response.json();

        const list = document.getElementById('historyList');
        list.innerHTML = '';

        sessions.forEach(session => {
            const date    = new Date(session.created_at);
            const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            const icon    = session.focus_mode === 'screen' ? "🖥" : "📵";
            const name    = session.focus_mode === 'screen' ? "Screen Focus" : "Deep Focus";

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

        // Tính tổng sessions & phút từ tất cả phiên (kể cả unfinished)
        const validSessions = sessions.filter(s => s.focus_duration_seconds >= 0);
        const totalSessions = validSessions.length;
        const totalSecs     = validSessions.reduce((sum, s) => sum + (s.focus_duration_seconds || 0), 0);
        const totalMins     = Math.floor(totalSecs / 60);

        _setEl('session',           totalSessions);
        _setEl('total',             totalMins);
        _setEl('completedSessions', totalSessions);
        _setEl('focusTime',         totalMins);

    } catch (err) {
        console.error("[Focus] Lỗi tải lịch sử:", err);
    }
}


/* =========================================================
   🔧 MODULE: DOM HELPER – SET TEXT
========================================================= */
function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}


/* =========================================================
   🪟 MODULE: POPUP HELPERS – MỞ/ĐÓNG FOCUS SETTINGS POPUP
========================================================= */
function openPopup()  { document.getElementById('focusPopup').classList.add('open');    }
function closePopup() { document.getElementById('focusPopup').classList.remove('open'); }


/* =========================================================
   🚀 MODULE: INIT – KHỞI CHẠY KHI TRANG TẢI
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    loadHistoryFromDB();
});