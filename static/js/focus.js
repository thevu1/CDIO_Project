let timerInterval = null;
let timeLeft = 0;
let focusMode = '';
let workMinutes = 45;
let breakMinutes = 15;
let sessionCount = 0;
let totalMinutes = 0;

function toggleMenu() {
    const menu = document.getElementById('modeMenu');
    const arrow = document.getElementById('arrow');
    const isOpen = menu.classList.toggle('open');
    arrow.classList.toggle('open', isOpen);
}

function selectMode(mode) {
    document.querySelector('.mode-title').childNodes[0].textContent = mode + ' ';
    document.getElementById('modeMenu').classList.remove('open');
    document.getElementById('arrow').classList.remove('open');

    const parts = mode.match(/(\d+)\s*-\s*(\d+)/);
    if (parts) {
        workMinutes = parseInt(parts[1]);
        breakMinutes = parseInt(parts[2]);
    }
}
function openPopup() {
    document.getElementById('focusPopup').classList.add('open');
}

function closePopup() {
    document.getElementById('focusPopup').classList.remove('open');
}

function startFocus(type) {
    focusMode = type;
    timeLeft = workMinutes * 60;
    document.getElementById('focusBar').style.display = 'flex';
    updateTimerDisplay();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            completeFocus();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
}

function stopFocus() {
    clearInterval(timerInterval);
    document.getElementById('focusBar').style.display = 'none';
    timeLeft = 0;
}

function completeFocus() {
    sessionCount++;
    totalMinutes += workMinutes;
    document.getElementById('session').textContent = sessionCount;
    document.getElementById('total').textContent = totalMinutes;
    document.getElementById('completedSessions').textContent = sessionCount;
    document.getElementById('focusTime').textContent = totalMinutes;
    addHistory();
    document.getElementById('focusBar').style.display = 'none';
    alert(`✅ Hoàn thành ${workMinutes} phút tập trung!`);
}

function addHistory() {
    const list = document.getElementById('historyList');
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const icon = focusMode === 'screen' ? '🖥' : '📵';
    const name = focusMode === 'screen' ? 'Trên màn hình' : 'Ngoài màn hình';

    if (list.textContent.trim() === 'Chưa có phiên nào') list.innerHTML = '';

    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="hi-left">
        <div class="hi-icon">${icon}</div>
        <div>
          <div class="hi-name">${name}</div>
          <div class="hi-time">${time}</div>
        </div>
      </div>
      <div class="hi-right">
        <div class="hi-mins">${workMinutes}</div>
        <div class="hi-unit">phút</div>
      </div>`;
    list.prepend(item);
}

/* Close menu on outside click */
document.addEventListener('click', e => {
    const row = document.querySelector('.focus-row');
    if (!row.contains(e.target)) {
        document.getElementById('modeMenu').classList.remove('open');
        document.getElementById('arrow').classList.remove('open');
    }
});