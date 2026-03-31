/* ── Data ── */
const GOAL_KM = 5;
const weekData = [
    { day: 'T2', km: 0 },
    { day: 'T3', km: 0 },
    { day: 'T4', km: 0 },
    { day: 'T5', km: 5 },
    { day: 'T6', km: 0 },
    { day: 'T7', km: 0 },
    { day: 'CN', km: 0 },
];

/* ── Hero circle ── */
function setHero(km, goal) {
    const pct = Math.min(Math.round((km / goal) * 100), 100);
    document.getElementById('kmDisplay').textContent = km.toFixed(1);
    document.getElementById('kmSub').textContent = `${km} km / ${goal} km`;
    document.getElementById('pctDisplay').textContent = pct;

    const circ = 2 * Math.PI * 29;
    const offset = circ - (pct / 100) * circ;
    const arc = document.getElementById('circleArc');
    arc.style.strokeDasharray = circ;
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = pct >= 100 ? '#69f0ae' : pct >= 60 ? '#f5c542' : '#fff';

    document.getElementById('heroBar').style.width = pct + '%';
}

/* ── XP claim ── */
let xpClaimed = false;
function claimXP() {
    if (xpClaimed) return;
    xpClaimed = true;
    const b = document.querySelector('.mission-badge');
    b.style.background = 'rgba(0,200,83,0.2)';
    b.style.borderColor = 'rgba(0,200,83,0.45)';
    document.getElementById('missionText').textContent = 'Đã nhận XP! 🎉';
}

/* ── Edit goal ── */
function editGoal() {
    const val = prompt('Nhập mục tiêu km mỗi ngày:', GOAL_KM);
    if (val && !isNaN(val) && +val > 0) {
        document.getElementById('goalVal').textContent = +val;
    }
}

/* ── Bar Chart (pure SVG) ── */
function drawChart() {
    const svg = document.getElementById('barChart');
    const W = 340, H = 160;
    const padL = 28, padR = 10, padT = 10, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxKm = Math.max(...weekData.map(d => d.km), GOAL_KM, 1);
    const ySteps = 5;
    const yStep = Math.ceil(maxKm / ySteps);

    let html = '';

    // Grid lines + Y labels
    for (let i = 0; i <= ySteps; i++) {
        const val = i * yStep;
        const y = padT + chartH - (val / (ySteps * yStep)) * chartH;
        html += `<line class="grid-line" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
        if (i > 0 || i === 0) {
            html += `<text class="y-label" x="${padL - 4}" y="${y + 3}" text-anchor="end">${val}</text>`;
        }
    }

    // X axis line
    html += `<line class="axis-line" x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}"/>`;

    // Bars
    const barW = (chartW / weekData.length) * 0.55;
    const barGap = chartW / weekData.length;

    weekData.forEach((d, i) => {
        const x = padL + i * barGap + (barGap - barW) / 2;
        const barH = d.km > 0 ? (d.km / (ySteps * yStep)) * chartH : 0;
        const y = padT + chartH - barH;
        const isToday = d.km > 0;
        const fill = isToday
            ? 'url(#greenGrad)'
            : 'rgba(100,80,180,0.25)';
        const rx = 5;

        html += `
        <g class="bar-group">
          <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, 2)}"
                rx="${rx}" fill="${fill}" class="bar-rect" data-km="${d.km}"/>
        </g>`;

        // X label
        html += `<text class="x-label" x="${x + barW / 2}" y="${padT + chartH + 16}">${d.day}</text>`;
    });

    // Gradient def
    const defs = `
      <defs>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#69f0ae"/>
          <stop offset="100%" stop-color="#00c853"/>
        </linearGradient>
      </defs>`;

    svg.innerHTML = defs + html;

    // Animate bars
    setTimeout(() => {
        svg.querySelectorAll('.bar-rect').forEach(rect => {
            const finalH = parseFloat(rect.getAttribute('height'));
            const finalY = parseFloat(rect.getAttribute('y'));
            const bottom = finalY + finalH;
            rect.setAttribute('height', 2);
            rect.setAttribute('y', bottom - 2);
            rect.style.transition = 'height 1s cubic-bezier(0.22,1,0.36,1), y 1s cubic-bezier(0.22,1,0.36,1)';
            requestAnimationFrame(() => {
                rect.setAttribute('height', finalH);
                rect.setAttribute('y', finalY);
            });
        });
    }, 400);
}

/* ── Stats ── */
function updateStats() {
    const activeDays = weekData.filter(d => d.km > 0);
    const total = weekData.reduce((s, d) => s + d.km, 0);
    const avg = activeDays.length > 0 ? (total / 7).toFixed(1) : '0.0';
    document.getElementById('avg7d').innerHTML = `${avg} <span class="unit">km</span>`;
    document.getElementById('totalDays').innerHTML = `${activeDays.length} <span class="unit">ngày</span>`;
}

/* ── Init ── */
window.addEventListener('load', () => {
    setTimeout(() => { setHero(5, GOAL_KM); }, 200);
    drawChart();
    updateStats();
});

//  nhận data từ Flutter
function updateFromApp(steps) {
    const km = steps * 0.0008;

    setHero(km, GOAL_KM);

    // cập nhật chart
    const today = new Date().getDay(); // CN = 0
    const index = today === 0 ? 6 : today - 1;

    weekData[index].km = km;

    drawChart();
    updateStats();
}