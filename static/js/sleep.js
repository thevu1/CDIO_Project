/* ═══════════════════════════════════════
   sleep.js — Giấc ngủ
   Đã dọn: bỏ hàm trùng lặp, gộp logic
═══════════════════════════════════════ */

const API = "http://localhost:3000/api";

/* ── Navigation ── */
function goWalk() { location.href = "/walk"; }
function goSleep() { location.href = "/sleep"; }
function goScreen() { location.href = "/screen"; }
function goFocus() { location.href = "/focus"; }
function goHome() { location.href = "/index"; }

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let hour = 22;
let minute = 30;
let reminderOn = true;

/* ─────────────────────────────────────────
   KHỞI TẠO KHI DOM SẴN SÀNG
───────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {

  // Đổ options vào hour/minute select
  const hourSelect = document.getElementById("hourSelect");
  const minuteSelect = document.getElementById("minuteSelect");

  for (let h = 0; h < 24; h++) {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = h.toString().padStart(2, "0");
    hourSelect.appendChild(opt);
  }

  for (let m = 0; m < 60; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m.toString().padStart(2, "0");
    minuteSelect.appendChild(opt);
  }

  // Load giờ đã lưu từ localStorage (nếu có)
  const saved = localStorage.getItem("sleepTime");
  if (saved) {
    const [h, m] = saved.split(":").map(Number);
    hour = h;
    minute = m;
  }

  // Cập nhật toàn bộ UI với giờ hiện tại
  updateUI();

  // Animate progress bars nếu có
  document.querySelectorAll(".progress-fill").forEach(el => {
    const target = el.style.width;
    el.style.width = "0%";
    requestAnimationFrame(() => {
      setTimeout(() => { el.style.width = target; }, 100);
    });
  });
});

/* ─────────────────────────────────────────
   UPDATE UI — cập nhật tất cả nơi hiển thị giờ
───────────────────────────────────────── */
function updateUI() {
  const h = hour.toString().padStart(2, "0");
  const m = minute.toString().padStart(2, "0");
  const timeStr = `${h}:${m}`;

  // Header clock (nếu có)
  const sleepHour = document.getElementById("sleepHour");
  const sleepMinute = document.getElementById("sleepMinute");
  if (sleepHour) sleepHour.innerText = h;
  if (sleepMinute) sleepMinute.innerText = m;

  // Input trong sleep-set card
  const timeDisplay = document.getElementById("timeDisplay");
  if (timeDisplay) timeDisplay.value = timeStr;

  // ── Hero card — hiển thị giờ to ──
  updateHeroTime(timeStr);

  // Tính giờ nhắc nhở (giờ ngủ - 30 phút)
  let total = hour * 60 + minute - 30;
  if (total < 0) total += 1440; // xử lý qua nửa đêm
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  const reminderEl = document.getElementById("reminderTime");
  if (reminderEl) {
    reminderEl.innerText =
      rh.toString().padStart(2, "0") + ":" +
      rm.toString().padStart(2, "0");
  }
}

/* ─────────────────────────────────────────
   HERO TIME — cập nhật giờ lớn trên hero card
───────────────────────────────────────── */
function updateHeroTime(time) {
  const el = document.getElementById("heroTime");
  if (!el) return;

  el.textContent = time;

  // Animation nhấp nháy khi cập nhật
  el.style.transform = "scale(1.12)";
  el.style.color = "#c084fc";
  setTimeout(() => {
    el.style.transform = "scale(1)";
    el.style.color = "#fff";
  }, 300);
}

/* ─────────────────────────────────────────
   TIME PICKER MODAL
───────────────────────────────────────── */
function openPicker() {
  document.getElementById("timeModal").style.display = "flex";
  // Đặt select về giờ hiện tại
  document.getElementById("hourSelect").value = hour;
  document.getElementById("minuteSelect").value = minute;
}

function closePicker() {
  document.getElementById("timeModal").style.display = "none";
}

function confirmTime() {
  hour = parseInt(document.getElementById("hourSelect").value);
  minute = parseInt(document.getElementById("minuteSelect").value);
  updateUI();
  closePicker();
}

/* ─────────────────────────────────────────
   LƯU GIỜ NGỦ
───────────────────────────────────────── */
function saveSleepTime() {
  const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  localStorage.setItem("sleepTime", timeStr);

  // Đồng bộ lên server
  fetch("/api/update-sleep-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ time: timeStr })
  }).catch(err => console.warn("[saveSleepTime] Không đồng bộ được:", err.message));

  updateUI();
  showToast("✅ Đã lưu giờ ngủ: " + timeStr);
}

/* ─────────────────────────────────────────
   TOGGLE NHẮC NHỞ
───────────────────────────────────────── */
function toggleReminder() {
  reminderOn = !reminderOn;
  const toggle = document.getElementById("reminderToggle");
  if (toggle) toggle.classList.toggle("off", !reminderOn);
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────── */
function showToast(msg) {
  // Xóa toast cũ nếu còn
  const old = document.querySelector(".toast");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

/* ─────────────────────────────────────────
   LOG MODAL (ghi nhận giấc ngủ)
───────────────────────────────────────── */
function openLogModal() {
  const modal = document.getElementById("logModal");
  if (modal) modal.classList.add("open");
}

function closeLogModal() {
  const modal = document.getElementById("logModal");
  if (modal) modal.classList.remove("open");
}

function confirmLog() {
  const bed = document.getElementById("logBedtime").value;
  const wake = document.getElementById("logWakeTime").value;
  if (!bed || !wake) return;

  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let dur = (wh * 60 + wm) - (bh * 60 + bm);
  if (dur < 0) dur += 1440;
  const dh = Math.floor(dur / 60);
  const dm = dur % 60;

  // Lưu vào localStorage
  const today = new Date();
  const label = `${today.getDate()}/${today.getMonth() + 1}`;
  const history = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
  history.unshift({ date: label, bed, wake, dur: `${dh}h ${dm}p` });
  if (history.length > 7) history.pop();
  localStorage.setItem("sleepHistory", JSON.stringify(history));

  renderHistory();
  closeLogModal();
  showToast(`✅ Đã lưu: ngủ ${dh}h ${dm}p`);
}

/* ─────────────────────────────────────────
   RENDER LỊCH SỬ 7 NGÀY
───────────────────────────────────────── */
function renderHistory() {
  const container = document.getElementById("historyContent");
  if (!container) return;

  const history = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
  if (!history.length) {
    container.innerHTML = "<p>Chưa có dữ liệu. Bắt đầu ghi nhận giấc ngủ hôm nay!</p>";
    return;
  }

  container.innerHTML = history.map(s => `
        <div class="history-item">
            <div class="hi-left">
                <div class="hi-date">${s.date} — ${s.bed} → ${s.wake}</div>
                <div class="hi-time">Tổng thời gian ngủ</div>
            </div>
            <div class="hi-dur">${s.dur}</div>
        </div>
    `).join("");
}