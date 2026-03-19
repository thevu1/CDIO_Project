/* ── State ── */
const LIMIT_HOURS = 4;
const LIMIT_MINS = LIMIT_HOURS * 60;

// Simulate some usage (change these to hook into real data)
let usedMinutes = 0;
let missionClaimed = false;

function setUsage(mins) {
    usedMinutes = Math.min(mins, LIMIT_MINS);
    const h = Math.floor(usedMinutes / 60);
    const m = usedMinutes % 60;
    const pct = Math.round((usedMinutes / LIMIT_MINS) * 100);

    document.getElementById('hoursDisplay').textContent = h;
    document.getElementById('minsDisplay').textContent = m;
    document.getElementById('pctText').textContent = pct + '%';
    document.getElementById('limitLabel').textContent = `Giới hạn: ${LIMIT_HOURS}h`;

    // Bar
    document.getElementById('heroBar').style.width = pct + '%';

    // Circle arc: circumference = 2π×27 ≈ 169.6
    const circ = 2 * Math.PI * 27;
    const offset = circ - (pct / 100) * circ;
    document.getElementById('circleArc').style.strokeDasharray = circ;
    document.getElementById('circleArc').style.strokeDashoffset = offset;

    // Color arc based on usage
    const arc = document.getElementById('circleArc');
    if (pct >= 90) arc.style.stroke = '#ff4d6d';
    else if (pct >= 60) arc.style.stroke = '#f5c542';
    else arc.style.stroke = '#fff';
}

function claimMission() {
    if (missionClaimed) return;
    missionClaimed = true;
    const badge = document.querySelector('.mission-badge');
    badge.style.background = 'rgba(245,197,66,0.22)';
    badge.style.borderColor = 'rgba(245,197,66,0.5)';
    document.getElementById('missionText').textContent = 'XP đã nhận! 🎉';
}

/* ── Animate app bars on load ── */
function animateBars() {
    document.querySelectorAll('.app-bar-fill').forEach(el => {
        const w = el.getAttribute('data-w');
        setTimeout(() => { el.style.width = w + '%'; }, 300);
    });
}

/* ── Compliance and avg (simulated) ── */
function updateStats() {
    document.getElementById('avg7d').innerHTML = '0<span class="unit">h 0p</span>';
    document.getElementById('compliance').innerHTML = '100<span class="unit">%</span>';
}

/* ── Init ── */
window.addEventListener('load', () => {
    setTimeout(() => { setUsage(0); }, 200);
    animateBars();
    updateStats();
});