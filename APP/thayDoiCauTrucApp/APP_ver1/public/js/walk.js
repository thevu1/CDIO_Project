/* ── Dữ liệu toàn cục ── */
let weekData = [];
const GOAL_KM = 5;

/* ── Hero circle ── */
function setHero(km, goal) {
    const pct = Math.min(Math.round((km / goal) * 100), 100);
    const kmDisplay = document.getElementById('kmDisplay');
    const kmSub = document.getElementById('kmSub');
    const pctDisplay = document.getElementById('pctDisplay');
    
    if (kmDisplay) kmDisplay.textContent = km.toFixed(1);
    if (kmSub) kmSub.textContent = `${km.toFixed(1)} km / ${goal} km`;
    if (pctDisplay) pctDisplay.textContent = pct;

    const circ = 2 * Math.PI * 29;
    const offset = circ - (pct / 100) * circ;
    const arc = document.getElementById('circleArc');
    if (arc) {
        arc.style.strokeDasharray = circ;
        arc.style.strokeDashoffset = offset;
        arc.style.stroke = pct >= 100 ? '#69f0ae' : pct >= 60 ? '#f5c542' : '#fff';
    }

    const heroBar = document.getElementById('heroBar');
    if (heroBar) heroBar.style.width = pct + '%';
    
    // Hiển thị banner chúc mừng nếu đạt mục tiêu
    const congrats = document.querySelector('.congrats-banner');
    if (congrats && km >= goal) {
        congrats.style.display = 'flex';
    } else if (congrats) {
        congrats.style.display = 'none';
    }
}

/* ── XP claim ── */
let xpClaimed = false;
function claimXP() {
    if (xpClaimed) return;
    xpClaimed = true;
    const b = document.querySelector('.mission-badge');
    if (b) {
        b.style.background = 'rgba(0,200,83,0.2)';
        b.style.borderColor = 'rgba(0,200,83,0.45)';
    }
    const missionText = document.getElementById('missionText');
    if (missionText) missionText.textContent = 'Đã nhận XP! 🎉';
}

/* ── Edit goal ── */
function editGoal() {
    const val = prompt('Nhập mục tiêu km mỗi ngày:', GOAL_KM);
    if (val && !isNaN(val) && +val > 0) {
        const goalVal = document.getElementById('goalVal');
        if (goalVal) goalVal.textContent = +val;
        const currentKm = parseFloat(document.getElementById('kmDisplay')?.textContent) || 0;
        setHero(currentKm, +val);
    }
}

/* ── Vẽ biểu đồ ── */
function drawChart(weeklyKm) {
    const svg = document.getElementById('barChart');
    if (!svg) return;
    
    const W = 340, H = 160;
    const padL = 28, padR = 10, padT = 10, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const maxKm = Math.max(...weeklyKm, GOAL_KM, 1);
    const ySteps = 5;
    const yStep = Math.ceil(maxKm / ySteps);

    let html = '';

    // Grid + Y labels
    for (let i = 0; i <= ySteps; i++) {
        const val = i * yStep;
        const y = padT + chartH - (val / (ySteps * yStep)) * chartH;
        html += `<line class="grid-line" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
        html += `<text class="y-label" x="${padL - 4}" y="${y + 3}" text-anchor="end">${val}</text>`;
    }

    // X axis
    html += `<line class="axis-line" x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}"/>`;

    // Bars
    const barW = (chartW / 7) * 0.55;
    const barGap = chartW / 7;
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    weeklyKm.forEach((km, i) => {
        const x = padL + i * barGap + (barGap - barW) / 2;
        const barH = km > 0 ? (km / (ySteps * yStep)) * chartH : 0;
        const y = padT + chartH - barH;
        const isToday = (i === 6);
        const fill = isToday ? 'url(#greenGrad)' : 'rgba(100,80,180,0.25)';
        const rx = 5;

        html += `
        <g class="bar-group">
          <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, 2)}"
                rx="${rx}" fill="${fill}" class="bar-rect" data-km="${km}"/>
        </g>`;
        html += `<text class="x-label" x="${x + barW / 2}" y="${padT + chartH + 16}">${days[i]}</text>`;
    });

    const defs = `
      <defs>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#69f0ae"/>
          <stop offset="100%" stop-color="#00c853"/>
        </linearGradient>
      </defs>`;

    svg.innerHTML = defs + html;

    // Animation
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

/* ── Cập nhật thống kê ── */
function updateStats(weeklyKm) {
    const activeDays = weeklyKm.filter(km => km > 0);
    const total = weeklyKm.reduce((s, km) => s + km, 0);
    const avg = activeDays.length > 0 ? (total / 7).toFixed(1) : '0.0';
    const avg7d = document.getElementById('avg7d');
    const totalDays = document.getElementById('totalDays');
    
    if (avg7d) avg7d.innerHTML = `${avg} <span class="unit">km</span>`;
    if (totalDays) totalDays.innerHTML = `${activeDays.length} <span class="unit">ngày</span>`;
}

/* ── Load dữ liệu từ server ── */
async function loadTodayFromServer() {
    try {
        const res = await fetch('/api/walk/today');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        const stepsDisplay = document.getElementById('stepsDisplay');
        if (stepsDisplay && data.totalSteps !== undefined) {
            stepsDisplay.innerText = data.totalSteps.toLocaleString();
        }
        
        const goal = parseFloat(document.getElementById('goalVal')?.innerText) || 5;
        const distance = data.distanceKm ? parseFloat(data.distanceKm) : 0;
        setHero(distance, goal);
        
        return data;
    } catch (err) {
        console.error('Lỗi loadTodayFromServer:', err);
        const goal = parseFloat(document.getElementById('goalVal')?.innerText) || 5;
        setHero(0, goal);
        return null;
    }
}

async function loadWeeklyFromServer() {
    try {
        const res = await fetch('/api/walk/weekly');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if (data.weeklyKm) {
            const weeklyKmNumbers = data.weeklyKm.map(km => parseFloat(km));
            drawChart(weeklyKmNumbers);
            updateStats(weeklyKmNumbers);
            return weeklyKmNumbers;
        }
        return null;
    } catch (err) {
        console.error('Lỗi loadWeeklyFromServer:', err);
        const emptyData = new Array(7).fill(0);
        drawChart(emptyData);
        updateStats(emptyData);
        return null;
    }
}

async function saveStepsToServer(steps, distanceKm) {
    try {
        const res = await fetch('/api/walk/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps, distance_km: distanceKm })
        });
        const data = await res.json();
        if (data.goal_reached && !data.already_completed) {
            alert('🎉 Đạt 5000 bước! Nhận 20 XP!');
        }
        return data;
    } catch (err) {
        console.error('Lỗi saveStepsToServer:', err);
        return null;
    }
}

/* ── Khởi tạo toàn bộ với dữ liệu từ Google Fit ── */
async function initWalkPage() {
    console.log('Initializing walk page...');
    
    // Load dữ liệu từ server trước
    await loadTodayFromServer();
    await loadWeeklyFromServer();

    // Nếu có token Google Fit, lấy dữ liệu và cập nhật
    if (window.googleFitToken && typeof getTodaySteps === 'function') {
        try {
            console.log('Fetching Google Fit data...');
            const steps = await getTodaySteps();
            const distance = await getTodayDistance();
            
            console.log(`Google Fit data - Steps: ${steps}, Distance: ${distance}km`);
            
            if (steps > 0) {
                // Cập nhật UI ngay lập tức
                const stepsDisplay = document.getElementById('stepsDisplay');
                if (stepsDisplay) stepsDisplay.innerText = steps.toLocaleString();
                
                const goal = parseFloat(document.getElementById('goalVal')?.innerText) || 5;
                setHero(distance, goal);
                
                // Lưu lên server
                await saveStepsToServer(steps, distance);
                
                // Reload dữ liệu từ server để đồng bộ
                await loadTodayFromServer();
                await loadWeeklyFromServer();
            }
        } catch(e) { 
            console.warn('Error fetching Google Fit data:', e); 
        }
    }
}

/* ── Load token Google Fit từ server ── */
async function loadGoogleFitToken() {
    try {
        const res = await fetch('/api/google-fit/token');
        const data = await res.json();

        if (data.token) {
            window.googleFitToken = data.token;
            console.log('Google Fit token loaded from server');
        }
    } catch (err) {
        console.error('Error loading Google Fit token:', err);
    }
}

/* ── Khởi tạo khi trang load ── */
window.addEventListener('load', async () => {
    console.log('Page loaded, initializing...');
    await loadGoogleFitToken();
    
    // Đợi một chút để các script khác load xong
    setTimeout(() => {
        initWalkPage();
    }, 500);
});