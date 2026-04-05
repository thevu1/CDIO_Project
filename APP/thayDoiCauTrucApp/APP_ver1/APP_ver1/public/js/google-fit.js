// google-fit.js - Phiên bản hoàn chỉnh với expose token và gọi refresh biểu đồ

let tokenClient = null;
let accessToken = localStorage.getItem('google_fit_token') || null;
window.googleFitToken = accessToken;   // expose ra window để walk.js kiểm tra

// Khởi tạo tokenClient (chạy một lần)
function initTokenClient() {
    if (tokenClient) return;
    console.log('Initializing tokenClient...');
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_FIT_CONFIG.clientId,
        scope: GOOGLE_FIT_CONFIG.scopes.join(' '),
        callback: (resp) => {
            console.log('Default callback (should not happen)');
        }
    });
    console.log('tokenClient ready');
}

// Hàm xin quyền và lấy token (hiện popup đăng nhập)
function requestGoogleFitPermissions() {
    return new Promise((resolve, reject) => {
        initTokenClient();
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (resp) => {
            tokenClient.callback = originalCallback;
            if (resp.error) {
                console.error('OAuth error:', resp);
                reject(resp);
                return;
            }
            accessToken = resp.access_token;
            localStorage.setItem('google_fit_token', accessToken);
            window.googleFitToken = accessToken;   // cập nhật window
            console.log('Token obtained successfully');
            resolve(accessToken);
        };
        tokenClient.requestAccessToken();
    });
}

// Gọi API kèm tự động refresh token
async function fetchWithTokenRefresh(url, options) {
    const makeRequest = async (token) => {
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
            },
        });
    };

    let response = await makeRequest(accessToken);
    if (response.status === 401) {
        localStorage.removeItem('google_fit_token');
        accessToken = null;
        window.googleFitToken = null;
        try {
            await requestGoogleFitPermissions();
            response = await makeRequest(accessToken);
        } catch (err) {
            throw new Error('Không thể refresh token');
        }
    }
    return response;
}

// Lấy số bước chân hôm nay
async function getTodaySteps() {
    if (!accessToken) await requestGoogleFitPermissions();

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date();
    const startTimeMillis = startOfDay.getTime();
    const endTimeMillis = endOfDay.getTime();

    try {
        const response = await fetchWithTokenRefresh(
            'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aggregateBy: [{
                        dataTypeName: 'com.google.step_count.delta',
                        dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
                    }],
                    bucketByTime: { durationMillis: 86400000 },
                    startTimeMillis: startTimeMillis,
                    endTimeMillis: endTimeMillis
                })
            }
        );
        const data = await response.json();
        if (data.bucket && data.bucket[0] && data.bucket[0].dataset && data.bucket[0].dataset[0] &&
            data.bucket[0].dataset[0].point && data.bucket[0].dataset[0].point[0] &&
            data.bucket[0].dataset[0].point[0].value && data.bucket[0].dataset[0].point[0].value[0]) {
            return data.bucket[0].dataset[0].point[0].value[0].intVal || 0;
        }
        return 0;
    } catch (error) {
        console.error('Lỗi lấy bước chân:', error);
        return 0;
    }
}

// Lấy quãng đường hôm nay (km)
async function getTodayDistance() {
    if (!accessToken) await requestGoogleFitPermissions();

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date();
    const startTimeMillis = startOfDay.getTime();
    const endTimeMillis = endOfDay.getTime();

    try {
        const response = await fetchWithTokenRefresh(
            'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aggregateBy: [{ dataTypeName: 'com.google.distance.delta' }],
                    bucketByTime: { durationMillis: 86400000 },
                    startTimeMillis: startTimeMillis,
                    endTimeMillis: endTimeMillis
                })
            }
        );
        const data = await response.json();
        if (data.bucket && data.bucket[0] && data.bucket[0].dataset && data.bucket[0].dataset[0] &&
            data.bucket[0].dataset[0].point && data.bucket[0].dataset[0].point[0] &&
            data.bucket[0].dataset[0].point[0].value && data.bucket[0].dataset[0].point[0].value[0]) {
            const distanceMeters = data.bucket[0].dataset[0].point[0].value[0].fpVal || 0;
            return distanceMeters / 1000;
        }
        return 0;
    } catch (error) {
        console.error('Lỗi lấy quãng đường:', error);
        return 0;
    }
}

// Hiển thị nút kết nối Google Fit
function showGoogleFitLoginButton() {
    console.log('showGoogleFitLoginButton called');
    const heroCard = document.querySelector('.hero-card');
    if (!heroCard) {
        console.warn('Không tìm thấy .hero-card, thử lại sau 0.5s');
        setTimeout(showGoogleFitLoginButton, 500);
        return;
    }
    if (document.getElementById('googleFitBtn')) {
        console.log('Nút đã tồn tại, bỏ qua');
        return;
    }

    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '15px';
    btnContainer.innerHTML = `
        <button id="googleFitBtn" class="google-fit-btn">
            <i class="fab fa-google"></i> Kết nối Google Fit
        </button>
    `;
    heroCard.appendChild(btnContainer);
    console.log('Đã thêm nút Google Fit vào hero-card');

    document.getElementById('googleFitBtn').addEventListener('click', async () => {
        console.log('Nút được click');
        try {
            await requestGoogleFitPermissions();
            alert('Đã kết nối thành công!');
            await loadGoogleFitData();
            // Sau khi load dữ liệu, làm mới biểu đồ và thống kê
            if (typeof initWalkPage === 'function') {
                initWalkPage();
            }
        } catch (error) {
            console.error('Lỗi kết nối:', error);
            alert('Kết nối thất bại: ' + (error.error || error.message));
        }
    });
}

// Cập nhật giao diện với dữ liệu từ Google Fit
async function loadGoogleFitData() {
    const steps = await getTodaySteps();
    const distance = await getTodayDistance();
    const stepsDisplay = document.getElementById('stepsDisplay');
    if (stepsDisplay) stepsDisplay.innerText = steps.toLocaleString();
    const estimatedKmFromSteps = (steps / 1300).toFixed(1);
    let currentKm = distance > 0 ? distance : parseFloat(estimatedKmFromSteps || 0);

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

    const congratsBanner = document.querySelector('.congrats-banner');
    if (congratsBanner && currentKm >= goalKm) congratsBanner.style.display = 'flex';
}

// Lấy dữ liệu quãng đường 7 ngày gần nhất (trả về mảng km)
async function getWeeklyDistance() {
    if (!accessToken) {
        await requestGoogleFitPermissions();
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const startTimeMillis = startDate.getTime();
    const endTimeMillis = endDate.getTime();

    try {
        const response = await fetchWithTokenRefresh(
            'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aggregateBy: [{ dataTypeName: 'com.google.distance.delta' }],
                    bucketByTime: { durationMillis: 86400000 },
                    startTimeMillis: startTimeMillis,
                    endTimeMillis: endTimeMillis
                })
            }
        );

        const data = await response.json();
        const weeklyKm = new Array(7).fill(0);

        if (data.bucket) {
            for (let i = 0; i < data.bucket.length; i++) {
                const bucket = data.bucket[i];
                if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point && bucket.dataset[0].point[0]) {
                    const distanceMeters = bucket.dataset[0].point[0].value[0].fpVal || 0;
                    weeklyKm[i] = distanceMeters / 1000;
                }
            }
        }
        return weeklyKm;
    } catch (error) {
        console.error('Lỗi lấy dữ liệu tuần:', error);
        return new Array(7).fill(0);
    }
}

// Khởi tạo khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - khởi tạo Google Fit');
    if (accessToken) {
        console.log('Có token lưu sẵn, thử load dữ liệu');
        loadGoogleFitData().then(() => {
            if (typeof initWalkPage === 'function') initWalkPage();
        });
    }
    showGoogleFitLoginButton();
});