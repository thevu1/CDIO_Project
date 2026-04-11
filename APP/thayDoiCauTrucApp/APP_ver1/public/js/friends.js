// friends.js - Final with error resilience & edit profile fix

document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

let currentUser = null;
let friendsData = [];
let statsData = { total: 0, avg: 0, max: 0, count: 0 };

async function initPage() {
    setupEventListeners();
    await loadDashboard();
    await loadLeaderboard();
}

function setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const heroCard = document.getElementById('heroCard');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalOverlay = document.querySelector('.modal-overlay');
    const logoutBtn = document.querySelector('.btn-logout');
    const editProfileBtn = document.querySelector('.btn-edit'); // Nút chỉnh sửa trong modal

    if (searchBtn) {
        searchBtn.addEventListener('click', searchUsers);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchUsers();
        });
    }
    if (heroCard) {
        heroCard.addEventListener('click', openProfileModal);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('profileModal');
            if (modal) modal.style.display = 'none';
        });
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modal = document.getElementById('profileModal');
                if (modal) modal.style.display = 'none';
            }
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }
    // 🆕 Chuyển hướng sang profile.html khi nhấn "Chỉnh sửa"
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            window.location.href = '/profile';
        });
    }
}

// ========== DASHBOARD ==========
async function loadDashboard() {
    const friendsListEl = document.getElementById('friendsList');
    try {
        const res = await fetch('/api/friends/dashboard');
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        const data = await res.json();
        console.log('✅ Dashboard data:', data);

        // Kiểm tra cấu trúc dữ liệu
        if (!data.user || !data.friends) {
            throw new Error('Dữ liệu từ server không đúng cấu trúc');
        }

        currentUser = data.user;
        friendsData = data.friends;
        statsData = data.stats;

        updateHeroSection(currentUser);
        renderFriendsList(friendsData);
        updateStats(statsData);
        const friendCountEl = document.getElementById('friendCount');
        if (friendCountEl) friendCountEl.textContent = statsData.count;
    } catch (err) {
        console.error('❌ loadDashboard error:', err);
        if (friendsListEl) {
            friendsListEl.innerHTML = `<div class="empty-message">Không thể tải danh sách bạn bè: ${err.message}</div>`;
        }
    }
}

function updateHeroSection(user) {
    if (!user) return;

    const heroName = document.getElementById('heroName');
    const heroLevel = document.getElementById('heroLevel');
    const heroStreak = document.getElementById('heroStreak');
    const heroAvatar = document.getElementById('heroAvatar');
    const xpFill = document.getElementById('xpFill');
    const heroXp = document.getElementById('heroXp');
    const xpText = document.querySelector('.xp-text');

    if (heroName) heroName.textContent = user.name || 'User';
    if (heroLevel) heroLevel.textContent = user.level || 1;
    if (heroStreak) heroStreak.textContent = user.streak || 0;
    if (heroAvatar) heroAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();

    const xp = user.xp || 0;
    const xpToNext = user.xp_to_next || 100;
    const pct = Math.min((xp / xpToNext) * 100, 100);
    if (xpFill) xpFill.style.width = pct + '%';
    if (heroXp) heroXp.textContent = xp;
    if (xpText) xpText.innerHTML = `<span id="heroXp">${xp}</span>/${xpToNext} XP`;
}

function renderFriendsList(friends) {
    const container = document.getElementById('friendsList');
    if (!container) return;

    if (!friends.length) {
        container.innerHTML = '<div class="empty-message">Chưa có bạn bè</div>';
        return;
    }

    container.innerHTML = friends.map(f => `
        <div class="friend-item">
            <div class="friend-avatar">${escapeHtml(f.name.charAt(0).toUpperCase())}</div>
            <div class="friend-info">
                <div class="friend-name">${escapeHtml(f.name)}</div>
                <div class="friend-detail">Cấp ${f.level} • ${f.xp || 0} XP</div>
            </div>
            <div class="friend-streak">🔥 ${f.streak || 0}</div>
            <div class="friend-actions">
                <button class="btn-icon btn-remove" data-id="${f.id}" title="Xóa bạn">🗑️</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Xóa bạn này?')) removeFriend(btn.dataset.id);
        });
    });
}

async function removeFriend(friendId) {
    try {
        const res = await fetch('/api/friends/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId })
        });
        if (res.ok) {
            await loadDashboard();
            await loadLeaderboard();
        } else {
            const data = await res.json();
            alert(data.error || 'Xóa thất bại');
        }
    } catch (err) {
        alert('Lỗi kết nối');
    }
}

function updateStats(stats) {
    const statTotal = document.getElementById('statTotal');
    const statAvg = document.getElementById('statAvg');
    const statMax = document.getElementById('statMax');
    if (statTotal) statTotal.textContent = stats.total || 0;
    if (statAvg) statAvg.textContent = stats.avg || 0;
    if (statMax) statMax.textContent = stats.max || 0;
}

// ========== LEADERBOARD ==========
async function loadLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard');
    try {
        const res = await fetch('/api/friends/leaderboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('✅ Leaderboard data:', data);
        renderLeaderboard(data);
    } catch (err) {
        console.error('❌ loadLeaderboard error:', err);
        if (leaderboardEl) {
            leaderboardEl.innerHTML = '<div class="empty-message">Không thể tải bảng xếp hạng</div>';
        }
    }
}

function renderLeaderboard(players) {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    if (!players.length) {
        container.innerHTML = '<div class="empty-message">Chưa có bạn bè để xếp hạng</div>';
        return;
    }

    container.innerHTML = players.map((p, i) => {
        let rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        return `
            <div class="leaderboard-item">
                <div class="lb-rank ${rankClass}">#${i+1}</div>
                <div class="lb-name">${escapeHtml(p.name)}</div>
                <div class="lb-streak">🔥 ${p.streak || 0}</div>
                <div style="margin-left: auto; font-size: 0.7rem; color: var(--text-muted);">Cấp ${p.level}</div>
            </div>
        `;
    }).join('');
}

// ========== SEARCH ==========
async function searchUsers() {
    const input = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('searchResults');
    if (!input || !resultsDiv) return;

    const keyword = input.value.trim();
    if (!keyword) return;

    resultsDiv.innerHTML = '<div class="empty-message">Đang tìm...</div>';

    try {
        const res = await fetch(`/api/users/search?keyword=${encodeURIComponent(keyword)}`);
        if (!res.ok) throw new Error('Lỗi tìm kiếm');
        const users = await res.json();
        if (!users.length) {
            resultsDiv.innerHTML = '<div class="empty-message">Không tìm thấy</div>';
            return;
        }
        resultsDiv.innerHTML = users.map(u => `
            <div class="search-item">
                <div class="search-info">
                    <div class="search-name">${escapeHtml(u.name)}</div>
                    <div class="friend-detail">📞 ${u.phone || 'N/A'}</div>
                </div>
                <button class="btn-add" data-id="${u.id}">Kết bạn</button>
            </div>
        `).join('');

        resultsDiv.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', () => addFriend(btn.dataset.id));
        });
    } catch (err) {
        resultsDiv.innerHTML = '<div class="empty-message">Lỗi tìm kiếm</div>';
    }
}

async function addFriend(friendId) {
    try {
        const res = await fetch('/api/friends/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Kết bạn thành công!');
            const input = document.getElementById('searchInput');
            const resultsDiv = document.getElementById('searchResults');
            if (input) input.value = '';
            if (resultsDiv) resultsDiv.innerHTML = '';
            await loadDashboard();
            await loadLeaderboard();
        } else {
            alert(data.error || 'Kết bạn thất bại');
        }
    } catch (err) {
        alert('Lỗi kết nối');
    }
}

// ========== MODAL PROFILE (giữ nguyên, không thay đổi) ==========
async function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    modal.style.display = 'flex';

    try {
        const res = await fetch('/profile-data');
        if (!res.ok) throw new Error('Không thể tải hồ sơ');
        const user = await res.json();

        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('modalName', user.name || '—');
        setText('modalEmail', user.email || '—');
        setText('displayEmail', user.email || '—');
        setText('displayPhone', user.phone_number || '—');
        setText('displayBirthdate', user.birthdate ? new Date(user.birthdate).toLocaleDateString('vi-VN') : '—');
        const modalAvatar = document.getElementById('modalAvatar');
        if (modalAvatar) modalAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();

        setText('modalLevel', user.level || 1);
        const xp = user.xp || 0;
        const xpToNext = user.xp_to_next || 100;
        const pct = Math.min((xp / xpToNext) * 100, 100);
        const modalXpFill = document.getElementById('modalXpFill');
        if (modalXpFill) modalXpFill.style.width = pct + '%';
        setText('modalXpText', `${xp}/${xpToNext} XP`);

        setText('modalStreak', user.streak || 0);
        setText('modalFriends', user.friends || 0);

        try {
            const lbRes = await fetch('/leaderboardList');
            const lb = await lbRes.json();
            const me = lb.find(p => p.is_me === 1);
            setText('modalRank', me ? `#${me.user_rank}` : '#—');
        } catch { setText('modalRank', '#—'); }

        const privacy = user.privacy_settings || {};
        updatePrivacyIcon('email', privacy.email || 'public');
        updatePrivacyIcon('phone_number', privacy.phone_number || 'public');
        updatePrivacyIcon('birthdate', privacy.birthdate || 'public');

        initModalPrivacyControls();
    } catch (err) {
        console.error('Modal error:', err);
    }
}

function updatePrivacyIcon(field, value) {
    const map = { 'email': 'privacyEmail', 'phone_number': 'privacyPhone', 'birthdate': 'privacyBirthdate' };
    const icon = document.getElementById(map[field]);
    if (!icon) return;
    const icons = { 'public': '🌐', 'friends': '👥', 'private': '🔒' };
    icon.textContent = icons[value] || '🌐';
    icon.dataset.current = value;
}

function initModalPrivacyControls() {
    document.querySelectorAll('.privacy-icon').forEach(icon => {
        icon.removeEventListener('click', handlePrivacyClick);
        icon.addEventListener('click', handlePrivacyClick);
    });
}

function handlePrivacyClick(e) {
    e.stopPropagation();
    const icon = e.currentTarget;
    const field = icon.dataset.field;
    const current = icon.dataset.current || 'public';
    showPrivacyMenu(field, current, icon);
}

function showPrivacyMenu(field, currentValue, element) {
    const old = document.querySelector('.privacy-menu');
    if (old) old.remove();

    const menu = document.createElement('div');
    menu.className = 'privacy-menu';
    menu.innerHTML = `
        <div data-value="public">🌐 Công khai</div>
        <div data-value="friends">👥 Bạn bè</div>
        <div data-value="private">🔒 Riêng tư</div>
    `;
    const rect = element.getBoundingClientRect();
    menu.style.cssText = `position:fixed; top:${rect.bottom+5}px; left:${rect.left-100}px; background:#1e1e2f; border-radius:12px; padding:8px 0; z-index:10000; min-width:140px; border:1px solid #2a2a40;`;
    document.body.appendChild(menu);

    menu.addEventListener('click', async (e) => {
        const val = e.target.dataset.value;
        if (!val) return;
        try {
            const res = await fetch('/update-privacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, value: val })
            });
            const data = await res.json();
            if (data.success) {
                updatePrivacyIcon(field, val);
            } else {
                alert('Cập nhật thất bại');
            }
        } catch { alert('Lỗi kết nối'); }
        menu.remove();
    });

    setTimeout(() => {
        const close = (e) => {
            if (!menu.contains(e.target) && !element.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', close);
            }
        };
        document.addEventListener('click', close);
    }, 10);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
}