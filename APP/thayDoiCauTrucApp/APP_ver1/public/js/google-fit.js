// google-fit.js - Implicit Flow chính xác

let accessToken = localStorage.getItem('google_fit_token') || null;
window.googleFitToken = accessToken;

let tokenClient = null;

function initTokenClient() {
    if (tokenClient) return;
    if (!window.GOOGLE_FIT_CONFIG) {
        console.error('Missing config');
        return;
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_FIT_CONFIG.clientId,
        scope: window.GOOGLE_FIT_CONFIG.scopes.join(' '),
        callback: async (response) => {
            if (response.error) {
                console.error('OAuth error:', response);
                return;
            }
            accessToken = response.access_token;
            localStorage.setItem('google_fit_token', accessToken);
            window.googleFitToken = accessToken;
            // Gửi token lên server để lưu
            await saveTokenToServer(accessToken);
            console.log('Token saved and ready');
            await loadGoogleFitData();
            if (typeof initWalkPage === 'function') initWalkPage();
            // Ẩn banner nếu có
            const banner = document.getElementById('google-fit-banner');
            if (banner) banner.remove();
        }
    });
}

async function saveTokenToServer(accessToken) {
    try {
        await fetch('/api/google-fit/save-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken })
        });
    } catch (e) { console.error('Save token error:', e); }
}

function requestGoogleFitPermissions() {
    return new Promise((resolve, reject) => {
        initTokenClient();
        if (!tokenClient) {
            reject('Token client not initialized');
            return;
        }
        // Override callback tạm thời để lấy token
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (resp) => {
            tokenClient.callback = originalCallback;
            if (resp.error) reject(resp);
            else resolve(resp.access_token);
        };
        tokenClient.requestAccessToken();
    });
}

// Các hàm gọi API Google Fit (giữ nguyên, dùng fetch với token)
async function fetchWithTokenRefresh(url, options) {
    const makeRequest = async (token) => {
        return fetch(url, {
            ...options,
            headers: { ...options.headers, 'Authorization': `Bearer ${token}` }
        });
    };
    let response = await makeRequest(accessToken);
    if (response.status === 401) {
        localStorage.removeItem('google_fit_token');
        accessToken = null;
        window.googleFitToken = null;
        try {
            const newToken = await requestGoogleFitPermissions();
            accessToken = newToken;
            response = await makeRequest(accessToken);
        } catch (err) {
            throw new Error('Cannot refresh token');
        }
    }
    return response;
}

async function getTodaySteps() {
    const res = await fetch(
        "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
        {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + window.googleFitToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                aggregateBy: [{
                    dataTypeName: "com.google.step_count.delta"
                }],
                bucketByTime: { durationMillis: 86400000 },
                startTimeMillis: Date.now() - 86400000,
                endTimeMillis: Date.now()
            })
        }
    );

    const data = await res.json();

    let steps = 0;

    if (data.bucket?.length) {
        steps = data.bucket[0].dataset[0].point
            .reduce((sum, p) => sum + (p.value[0].intVal || 0), 0);
    }

    return steps;
}

async function getTodayDistance() {
    if (!accessToken) await requestGoogleFitPermissions();
    const today = new Date();
    const startOfDay = new Date(today.setHours(0,0,0,0));
    const endOfDay = new Date();
    const startTimeMillis = startOfDay.getTime();
    const endTimeMillis = endOfDay.getTime();
    try {
        const res = await fetchWithTokenRefresh('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                aggregateBy: [{ dataTypeName: 'com.google.distance.delta' }],
                bucketByTime: { durationMillis: 86400000 },
                startTimeMillis, endTimeMillis
            })
        });
        const data = await res.json();
        const meters = data.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;
        return meters / 1000;
    } catch (e) { console.error(e); return 0; }
}

// Hiển thị nút kết nối (dùng trong walk.html)
function showGoogleFitLoginButton() {
    const heroCard = document.querySelector('.hero-card');
    if (!heroCard) { setTimeout(showGoogleFitLoginButton, 500); return; }
    if (document.getElementById('googleFitBtn')) return;
    const btn = document.createElement('div');
    btn.innerHTML = `<button id="googleFitBtn" class="google-fit-btn"><i class="fab fa-google"></i> Kết nối Google Fit</button>`;
    heroCard.appendChild(btn);
    document.getElementById('googleFitBtn').onclick = async () => {
        try {
            await requestGoogleFitPermissions();
            alert('Kết nối thành công!');
            await loadGoogleFitData();
            if (typeof initWalkPage === 'function') initWalkPage();
        } catch (err) {
            alert('Lỗi: ' + (err.error || err));
        }
    };
}

async function loadGoogleFitData() {
    const steps = await getTodaySteps();
    const distance = await getTodayDistance();
    const stepsDisplay = document.getElementById('stepsDisplay');
    if (stepsDisplay) stepsDisplay.innerText = steps.toLocaleString();
    let currentKm = distance > 0 ? distance : (steps / 1300);
    const kmDisplay = document.getElementById('kmDisplay');
    const kmSub = document.getElementById('kmSub');
    const goalVal = document.getElementById('goalVal');
    const pctDisplay = document.getElementById('pctDisplay');
    const heroBar = document.getElementById('heroBar');
    let goalKm = 5;
    if (goalVal && goalVal.innerText) goalKm = parseFloat(goalVal.innerText);
    if (kmDisplay) kmDisplay.innerText = currentKm.toFixed(1);
    if (kmSub) kmSub.innerText = `${currentKm.toFixed(1)} km / ${goalKm} km`;
    const percent = Math.min(100, Math.floor((currentKm / goalKm) * 100));
    if (pctDisplay) pctDisplay.innerText = percent;
    if (heroBar) heroBar.style.width = `${percent}%`;
    const congrats = document.querySelector('.congrats-banner');
    if (congrats && currentKm >= goalKm) congrats.style.display = 'flex';
}

// Expose ra global cho banner
window.connectGoogleFit = async function() {
    try {
        await requestGoogleFitPermissions();
        alert('Kết nối thành công!');
        await loadGoogleFitData();
        if (typeof initWalkPage === 'function') initWalkPage();
        const banner = document.getElementById('google-fit-banner');
        if (banner) banner.remove();
    } catch (err) {
        alert('Lỗi: ' + (err.error || err));
    }
};

// Tự động khởi tạo nếu đã có token
document.addEventListener('DOMContentLoaded', () => {
    if (accessToken) {
        loadGoogleFitData().then(() => {
            if (typeof initWalkPage === 'function') initWalkPage();
        });
    }
    showGoogleFitLoginButton();
});