// ---------- API CONFIG ----------
const API_BASE = '/api';

// DOM elements - general
const heroCard = document.getElementById('heroCard');
const heroAvatar = document.getElementById('heroAvatar');
const heroName = document.getElementById('heroName');
const heroLevel = document.getElementById('heroLevel');
const heroStreak = document.getElementById('heroStreak');
const xpFill = document.getElementById('xpFill');
const heroXp = document.getElementById('heroXp');
const friendsListDiv = document.getElementById('friendsList');
const friendCountSpan = document.getElementById('friendCount');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsDiv = document.getElementById('searchResults');
const leaderboardDiv = document.getElementById('leaderboard');
const statTotal = document.getElementById('statTotal');
const statAvg = document.getElementById('statAvg');
const statMax = document.getElementById('statMax');
const profileModal = document.getElementById('profileModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalAvatar = document.getElementById('modalAvatar');
const modalName = document.getElementById('modalName');
const modalEmail = document.getElementById('modalEmail');
const modalLevel = document.getElementById('modalLevel');
const modalXpFill = document.getElementById('modalXpFill');
const modalXpText = document.getElementById('modalXpText');
const modalStreak = document.getElementById('modalStreak');
const modalFriends = document.getElementById('modalFriends');
const modalRank = document.getElementById('modalRank');
const gearBtn = document.getElementById('gearBtn');
const gearDropdown = document.getElementById('gearDropdown');

// Friends pagination
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfoSpan = document.getElementById('pageInfo');

// Leaderboard pagination
const lbPrevPageBtn = document.getElementById('lbPrevPageBtn');
const lbNextPageBtn = document.getElementById('lbNextPageBtn');
const lbPageInfoSpan = document.getElementById('lbPageInfo');

// Fullscreen friends
const expandFriendsBtn = document.getElementById('expandFriendsBtn');
const friendsFullscreenModal = document.getElementById('friendsFullscreenModal');
const closeFriendsFullscreenBtn = document.getElementById('closeFriendsFullscreenBtn');
const fullscreenFriendsList = document.getElementById('fullscreenFriendsList');
const fullscreenFriendsSearch = document.getElementById('fullscreenFriendsSearch');
const fullscreenFriendsSearchBtn = document.getElementById('fullscreenFriendsSearchBtn');

// Fullscreen leaderboard
const expandLeaderboardBtn = document.getElementById('expandLeaderboardBtn');
const leaderboardFullscreenModal = document.getElementById('leaderboardFullscreenModal');
const closeLeaderboardFullscreenBtn = document.getElementById('closeLeaderboardFullscreenBtn');
const fullscreenLeaderboardList = document.getElementById('fullscreenLeaderboardList');
const fullscreenLeaderboardSearch = document.getElementById('fullscreenLeaderboardSearch');
const fullscreenLeaderboardSearchBtn = document.getElementById('fullscreenLeaderboardSearchBtn');

// State
let currentUser = null;
let friendsList = [];
let currentFriendsPage = 1;
const FRIENDS_PER_PAGE = 3;
let totalFriendsPages = 1;

let currentLeaderboardPage = 1;
const LEADERBOARD_PER_PAGE = 5;
let totalLeaderboardPages = 1;
let sortedFriendsForLeaderboard = []; // sẽ tính mỗi khi friendsList thay đổi

// ---------- API calls ----------
async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Lỗi kết nối');
        }
        return res.json();
    } catch (err) {
        console.error('API Error:', err);
        alert(err.message);
        return null;
    }
}

async function loadCurrentUser() {
    const user = await apiFetch('/me');
    if (user) currentUser = user;
    return user;
}

async function loadFriends() {
    const friends = await apiFetch('/friends');
    if (friends) {
        friendsList = friends;
        // Cập nhật phân trang cho danh sách bạn bè
        totalFriendsPages = Math.ceil(friendsList.length / FRIENDS_PER_PAGE);
        if (currentFriendsPage > totalFriendsPages) currentFriendsPage = Math.max(1, totalFriendsPages);
        // Cập nhật dữ liệu xếp hạng (sắp xếp theo streak giảm dần)
        sortedFriendsForLeaderboard = [...friendsList].sort((a, b) => b.streak - a.streak);
        totalLeaderboardPages = Math.ceil(sortedFriendsForLeaderboard.length / LEADERBOARD_PER_PAGE);
        if (currentLeaderboardPage > totalLeaderboardPages) currentLeaderboardPage = Math.max(1, totalLeaderboardPages);
        updatePaginationUI();
    }
    return friends;
}

async function addFriendAPI(friendId) {
    return apiFetch('/friends/add', { method: 'POST', body: JSON.stringify({ friendId }) });
}
async function removeFriendAPI(friendId) {
    return apiFetch('/friends/remove', { method: 'POST', body: JSON.stringify({ friendId }) });
}
async function searchUsersAPI(keyword) {
    return apiFetch(`/users/search?keyword=${encodeURIComponent(keyword)}`);
}
async function updateStreakAPI() {
    return apiFetch('/update-streak', { method: 'POST' });
}

// ---------- Helper render functions ----------
function updateUserUI() {
    if (!currentUser) return;
    heroAvatar.innerText = currentUser.avatarLetter || currentUser.name.charAt(0).toUpperCase();
    heroName.innerText = currentUser.name;
    heroStreak.innerText = currentUser.streak;
    const level = Math.floor(currentUser.streak / 10) + 1;
    heroLevel.innerText = level;
    const xp = (currentUser.streak % 10) * 10;
    xpFill.style.width = `${xp}%`;
    heroXp.innerText = `${xp}/100`;
}

function updateModal() {
    if (!currentUser) return;
    const level = Math.floor(currentUser.streak / 10) + 1;
    const xp = (currentUser.streak % 10) * 10;
    modalAvatar.innerText = currentUser.avatarLetter || currentUser.name.charAt(0).toUpperCase();
    modalName.innerText = currentUser.name;
    modalEmail.innerText = currentUser.email;
    modalLevel.innerText = level;
    modalXpFill.style.width = `${xp}%`;
    modalXpText.innerText = `${xp}/100 XP`;
    modalStreak.innerText = currentUser.streak;
    modalFriends.innerText = friendsList.length;
    const better = friendsList.filter(f => f.streak > currentUser.streak).length;
    modalRank.innerText = `#${better + 1}`;
}

// Render danh sách bạn bè (phân trang)
function renderFriendsList() {
    friendCountSpan.innerText = friendsList.length;
    const start = (currentFriendsPage - 1) * FRIENDS_PER_PAGE;
    const end = start + FRIENDS_PER_PAGE;
    const pageFriends = friendsList.slice(start, end);

    if (friendsList.length === 0) {
        friendsListDiv.innerHTML = '<div class="empty-message">Chưa có bạn bè. Hãy kết bạn ngay!</div>';
        return;
    }

    friendsListDiv.innerHTML = '';
    pageFriends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.innerHTML = `
            <div class="friend-avatar">${friend.avatarLetter || friend.name.charAt(0).toUpperCase()}</div>
            <div class="friend-info">
                <div class="friend-name">${escapeHtml(friend.name)}</div>
                <div class="friend-detail">📞 ${friend.phone || 'N/A'} • 🆔 ${friend.id}</div>
            </div>
            <div class="friend-streak">🔥 ${friend.streak}</div>
            <div class="friend-actions">
                <button class="btn-icon btn-remove" data-id="${friend.id}">🗑️</button>
                <button class="btn-icon btn-invite" data-id="${friend.id}">💬</button>
            </div>
        `;
        friendsListDiv.appendChild(div);
    });
    attachFriendEvents(friendsListDiv);
}

// Render bảng xếp hạng (phân trang)
function renderLeaderboard() {
    if (sortedFriendsForLeaderboard.length === 0) {
        leaderboardDiv.innerHTML = '<div class="empty-message">Chưa có bạn bè để xếp hạng</div>';
        return;
    }
    const start = (currentLeaderboardPage - 1) * LEADERBOARD_PER_PAGE;
    const end = start + LEADERBOARD_PER_PAGE;
    const pageItems = sortedFriendsForLeaderboard.slice(start, end);
    leaderboardDiv.innerHTML = '';
    pageItems.forEach((friend, idx) => {
        const globalRank = start + idx + 1;
        let rankClass = '';
        if (globalRank === 1) rankClass = 'gold';
        else if (globalRank === 2) rankClass = 'silver';
        else if (globalRank === 3) rankClass = 'bronze';
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <div class="lb-rank ${rankClass}">${globalRank}</div>
            <div class="lb-name">${escapeHtml(friend.name)}</div>
            <div class="lb-streak">🔥 ${friend.streak}</div>
        `;
        leaderboardDiv.appendChild(div);
    });
}

function updateStats() {
    const total = friendsList.reduce((s, f) => s + f.streak, 0);
    statTotal.innerText = total;
    statAvg.innerText = friendsList.length ? (total / friendsList.length).toFixed(1) : 0;
    statMax.innerText = friendsList.length ? Math.max(...friendsList.map(f => f.streak)) : 0;
}

function updatePaginationUI() {
    // Friends pagination
    if (pageInfoSpan) pageInfoSpan.innerText = `Trang ${currentFriendsPage} / ${totalFriendsPages || 1}`;
    if (prevPageBtn) prevPageBtn.disabled = currentFriendsPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentFriendsPage >= totalFriendsPages;
    // Leaderboard pagination
    if (lbPageInfoSpan) lbPageInfoSpan.innerText = `Trang ${currentLeaderboardPage} / ${totalLeaderboardPages || 1}`;
    if (lbPrevPageBtn) lbPrevPageBtn.disabled = currentLeaderboardPage <= 1;
    if (lbNextPageBtn) lbNextPageBtn.disabled = currentLeaderboardPage >= totalLeaderboardPages;
}

function goToFriendsPage(page) {
    if (page < 1 || page > totalFriendsPages) return;
    currentFriendsPage = page;
    renderFriendsList();
    updatePaginationUI();
}

function goToLeaderboardPage(page) {
    if (page < 1 || page > totalLeaderboardPages) return;
    currentLeaderboardPage = page;
    renderLeaderboard();
    updatePaginationUI();
}

// Attach events cho nút xoá/mời
function attachFriendEvents(container) {
    container.querySelectorAll('.btn-remove').forEach(btn => {
        btn.removeEventListener('click', handleRemove);
        btn.addEventListener('click', handleRemove);
    });
    container.querySelectorAll('.btn-invite').forEach(btn => {
        btn.removeEventListener('click', handleInvite);
        btn.addEventListener('click', handleInvite);
    });
}
function handleRemove(e) {
    const friendId = e.currentTarget.dataset.id;
    if (confirm('Xoá bạn này?')) removeFriend(friendId);
}
function handleInvite() { alert('📨 Đã gửi lời mời thử thách! (Demo)'); }

async function removeFriend(friendId) {
    const result = await removeFriendAPI(friendId);
    if (result && result.success) {
        await refreshData();
        // Điều chỉnh lại trang hiện tại nếu cần
        if (currentFriendsPage > totalFriendsPages && totalFriendsPages > 0) currentFriendsPage = totalFriendsPages;
        goToFriendsPage(currentFriendsPage);
        if (currentLeaderboardPage > totalLeaderboardPages && totalLeaderboardPages > 0) currentLeaderboardPage = totalLeaderboardPages;
        goToLeaderboardPage(currentLeaderboardPage);
    }
}

async function addFriend(friendId) {
    const result = await addFriendAPI(friendId);
    if (result && result.success) {
        await refreshData();
        // Sau khi thêm, chuyển về trang cuối để thấy bạn mới
        currentFriendsPage = Math.ceil(friendsList.length / FRIENDS_PER_PAGE) || 1;
        currentLeaderboardPage = Math.ceil(sortedFriendsForLeaderboard.length / LEADERBOARD_PER_PAGE) || 1;
        goToFriendsPage(currentFriendsPage);
        goToLeaderboardPage(currentLeaderboardPage);
        searchInput.value = '';
        searchResultsDiv.innerHTML = '';
    } else if (result && result.error) {
        alert(result.error);
    }
}

async function refreshData() {
    await loadCurrentUser();
    await loadFriends();
    updateUserUI();
    renderFriendsList();
    renderLeaderboard();
    updateStats();
    updateModal();
}

// ---------- Search ----------
async function searchUsers() {
    const keyword = searchInput.value.trim();
    if (!keyword) {
        searchResultsDiv.innerHTML = '';
        return;
    }
    const users = await searchUsersAPI(keyword);
    if (!users) return;
    const friendIds = new Set(friendsList.map(f => f.id));
    const filtered = users.filter(u => u.id !== currentUser?.id && !friendIds.has(u.id));
    displaySearchResults(filtered);
}
function displaySearchResults(users) {
    if (users.length === 0) {
        searchResultsDiv.innerHTML = '<div class="empty-message">Không tìm thấy người dùng</div>';
        return;
    }
    searchResultsDiv.innerHTML = '';
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <div class="search-info">
                <div class="search-name">${escapeHtml(user.name)}</div>
                <div class="friend-detail">📞 ${user.phone || 'N/A'} • 🆔 ${user.id}</div>
            </div>
            <div class="search-actions">
                <button class="btn-add" data-id="${user.id}">Kết bạn</button>
                <button class="btn-icon btn-invite" data-id="${user.id}">💬</button>
            </div>
        `;
        searchResultsDiv.appendChild(div);
    });
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = btn.dataset.id;
            addFriend(userId);
        });
    });
    document.querySelectorAll('.btn-invite').forEach(btn => {
        btn.addEventListener('click', () => alert('📨 Đã gửi lời mời thử thách! (Demo)'));
    });
}

// ---------- Fullscreen: Danh sách bạn bè (tất cả + tìm kiếm) ----------
function openFriendsFullscreen() {
    friendsFullscreenModal.classList.add('open');
    renderFullscreenFriendsList('');
    if (fullscreenFriendsSearch) fullscreenFriendsSearch.value = '';
}
function closeFriendsFullscreen() {
    friendsFullscreenModal.classList.remove('open');
}
function renderFullscreenFriendsList(filterText) {
    if (!fullscreenFriendsList) return;
    let displayList = [...friendsList];
    if (filterText.trim() !== '') {
        const keyword = filterText.trim().toLowerCase();
        displayList = displayList.filter(f =>
            f.name.toLowerCase().includes(keyword) ||
            (f.phone && f.phone.toLowerCase().includes(keyword)) ||
            f.id.toString().toLowerCase().includes(keyword)
        );
    }
    if (displayList.length === 0) {
        fullscreenFriendsList.innerHTML = '<div class="empty-message">Không tìm thấy bạn bè</div>';
        return;
    }
    fullscreenFriendsList.innerHTML = '';
    displayList.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.innerHTML = `
            <div class="friend-avatar">${friend.avatarLetter || friend.name.charAt(0).toUpperCase()}</div>
            <div class="friend-info">
                <div class="friend-name">${escapeHtml(friend.name)}</div>
                <div class="friend-detail">📞 ${friend.phone || 'N/A'} • 🆔 ${friend.id}</div>
            </div>
            <div class="friend-streak">🔥 ${friend.streak}</div>
            <div class="friend-actions">
                <button class="btn-icon btn-remove" data-id="${friend.id}">🗑️</button>
                <button class="btn-icon btn-invite" data-id="${friend.id}">💬</button>
            </div>
        `;
        fullscreenFriendsList.appendChild(div);
    });
    // Gắn sự kiện cho các nút trong fullscreen
    fullscreenFriendsList.querySelectorAll('.btn-remove').forEach(btn => {
        btn.removeEventListener('click', handleRemoveFullscreen);
        btn.addEventListener('click', handleRemoveFullscreen);
    });
    fullscreenFriendsList.querySelectorAll('.btn-invite').forEach(btn => {
        btn.removeEventListener('click', handleInvite);
        btn.addEventListener('click', handleInvite);
    });
}
function handleRemoveFullscreen(e) {
    const friendId = e.currentTarget.dataset.id;
    if (confirm('Xoá bạn này?')) removeFriend(friendId);
}
function searchFullscreenFriends() {
    const keyword = fullscreenFriendsSearch ? fullscreenFriendsSearch.value : '';
    renderFullscreenFriendsList(keyword);
}

// ---------- Fullscreen: Bảng xếp hạng (tất cả + tìm kiếm) ----------
function openLeaderboardFullscreen() {
    leaderboardFullscreenModal.classList.add('open');
    renderFullscreenLeaderboard('');
    if (fullscreenLeaderboardSearch) fullscreenLeaderboardSearch.value = '';
}
function closeLeaderboardFullscreen() {
    leaderboardFullscreenModal.classList.remove('open');
}
function renderFullscreenLeaderboard(filterText) {
    if (!fullscreenLeaderboardList) return;
    let displayList = [...sortedFriendsForLeaderboard];
    if (filterText.trim() !== '') {
        const keyword = filterText.trim().toLowerCase();
        displayList = displayList.filter(f =>
            f.name.toLowerCase().includes(keyword) ||
            (f.phone && f.phone.toLowerCase().includes(keyword)) ||
            f.id.toString().toLowerCase().includes(keyword)
        );
    }
    if (displayList.length === 0) {
        fullscreenLeaderboardList.innerHTML = '<div class="empty-message">Không tìm thấy kết quả</div>';
        return;
    }
    fullscreenLeaderboardList.innerHTML = '';
    displayList.forEach((friend, idx) => {
        const rank = idx + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <div class="lb-rank ${rankClass}">${rank}</div>
            <div class="lb-name">${escapeHtml(friend.name)}</div>
            <div class="lb-streak">🔥 ${friend.streak}</div>
        `;
        fullscreenLeaderboardList.appendChild(div);
    });
}
function searchFullscreenLeaderboard() {
    const keyword = fullscreenLeaderboardSearch ? fullscreenLeaderboardSearch.value : '';
    renderFullscreenLeaderboard(keyword);
}

// ---------- Event listeners ----------
heroCard.addEventListener('click', () => {
    updateModal();
    profileModal.classList.add('open');
});
closeModalBtn.addEventListener('click', () => profileModal.classList.remove('open'));
profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) profileModal.classList.remove('open');
});
searchBtn.addEventListener('click', searchUsers);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchUsers(); });

// Friends pagination
prevPageBtn.addEventListener('click', () => goToFriendsPage(currentFriendsPage - 1));
nextPageBtn.addEventListener('click', () => goToFriendsPage(currentFriendsPage + 1));
// Leaderboard pagination
lbPrevPageBtn.addEventListener('click', () => goToLeaderboardPage(currentLeaderboardPage - 1));
lbNextPageBtn.addEventListener('click', () => goToLeaderboardPage(currentLeaderboardPage + 1));

// Fullscreen friends
if (expandFriendsBtn) expandFriendsBtn.addEventListener('click', openFriendsFullscreen);
if (closeFriendsFullscreenBtn) closeFriendsFullscreenBtn.addEventListener('click', closeFriendsFullscreen);
if (fullscreenFriendsSearchBtn) fullscreenFriendsSearchBtn.addEventListener('click', searchFullscreenFriends);
if (fullscreenFriendsSearch) fullscreenFriendsSearch.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchFullscreenFriends(); });
if (friendsFullscreenModal) friendsFullscreenModal.addEventListener('click', (e) => { if (e.target === friendsFullscreenModal) closeFriendsFullscreen(); });

// Fullscreen leaderboard
if (expandLeaderboardBtn) expandLeaderboardBtn.addEventListener('click', openLeaderboardFullscreen);
if (closeLeaderboardFullscreenBtn) closeLeaderboardFullscreenBtn.addEventListener('click', closeLeaderboardFullscreen);
if (fullscreenLeaderboardSearchBtn) fullscreenLeaderboardSearchBtn.addEventListener('click', searchFullscreenLeaderboard);
if (fullscreenLeaderboardSearch) fullscreenLeaderboardSearch.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchFullscreenLeaderboard(); });
if (leaderboardFullscreenModal) leaderboardFullscreenModal.addEventListener('click', (e) => { if (e.target === leaderboardFullscreenModal) closeLeaderboardFullscreen(); });

// Gear menu
gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    gearDropdown.classList.toggle('open');
});
document.addEventListener('click', () => gearDropdown.classList.remove('open'));

// ---------- Initialization ----------
(async function init() {
    await refreshData();
    await updateStreakAPI();
    await refreshData(); // refresh lại sau khi cập nhật streak
})();

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}