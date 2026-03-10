// DOM elements
const usernameSpan = document.getElementById('username');
const topStreakSpan = document.getElementById('top-streak');
const dateElement = document.getElementById('current-date');
const myStreakSpan = document.getElementById('my-streak');
const progressCircle = document.getElementById('progress-circle');
const progressText = document.getElementById('progress-text');
const searchBtn = document.getElementById('search-btn');
const searchKeyword = document.getElementById('search-keyword');
const searchResults = document.getElementById('search-results');
const friendsList = document.getElementById('friends-list');

// Constants
const MAX_STREAK = 30; // Mục tiêu 30 ngày

// Format date
function updateDate() {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const today = new Date();
    const dayName = days[today.getDay()];
    const date = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    dateElement.textContent = `${dayName}, ${date} Tháng ${month}, ${year}`;
}

// Update circular progress
function updateCircularProgress(streak) {
    const percent = Math.min(100, (streak / MAX_STREAK) * 100);
    const dashArray = `${percent}, 100`;
    if (progressCircle) {
        progressCircle.setAttribute('stroke-dasharray', dashArray);
        progressText.textContent = `${Math.round(percent)}%`;
    }
}

// Fetch current user info
async function fetchMyInfo() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) throw new Error('Không thể lấy thông tin user');
        const me = await res.json();
        
        usernameSpan.textContent = me.name;
        topStreakSpan.textContent = me.streak;
        myStreakSpan.textContent = me.streak;
        
        updateCircularProgress(me.streak);
    } catch (err) {
        console.error('Lỗi lấy thông tin:', err);
        usernameSpan.textContent = 'Người dùng';
        topStreakSpan.textContent = '0';
        myStreakSpan.textContent = '0';
        updateCircularProgress(0);
    }
}

// Load friends list
async function loadFriends() {
    try {
        const res = await fetch('/api/friends');
        if (!res.ok) throw new Error('Lỗi tải danh sách bạn');
        const friends = await res.json();
        displayFriends(friends);
    } catch (err) {
        console.error(err);
        friendsList.innerHTML = '<div class="empty-message">Không thể tải danh sách bạn</div>';
    }
}

function displayFriends(friends) {
    friendsList.innerHTML = '';
    if (friends.length === 0) {
        friendsList.innerHTML = '<div class="empty-message">Chưa có bạn bè</div>';
        return;
    }
    friends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${escapeHtml(friend.name)}</span>
                <span class="friend-phone">📞 ${friend.phone || 'N/A'}</span>
                <span class="friend-id">🆔 ${friend.id}</span>
            </div>
            <div class="friend-streak">🔥 ${friend.streak}</div>
            <div class="friend-actions">
                <button class="remove-friend" data-id="${friend.id}">Xoá</button>
            </div>
        `;
        friendsList.appendChild(div);
    });

    document.querySelectorAll('.remove-friend').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const friendId = e.target.dataset.id;
            if (confirm('Bạn có chắc muốn xoá bạn này?')) {
                try {
                    const res = await fetch('/api/friends/remove', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ friendId })
                    });
                    if (res.ok) {
                        loadFriends();
                    } else {
                        const data = await res.json();
                        alert(data.error || 'Xoá thất bại');
                    }
                } catch (err) {
                    alert('Lỗi kết nối');
                }
            }
        });
    });
}

// Search users
searchBtn.addEventListener('click', async () => {
    const keyword = searchKeyword.value.trim();
    if (!keyword) return;
    try {
        const res = await fetch(`/api/users/search?keyword=${encodeURIComponent(keyword)}`);
        if (!res.ok) throw new Error('Lỗi tìm kiếm');
        const users = await res.json();
        displaySearchResults(users);
    } catch (err) {
        console.error(err);
        searchResults.innerHTML = '<div class="empty-message">Lỗi tìm kiếm</div>';
    }
});

function displaySearchResults(users) {
    searchResults.innerHTML = '';
    if (users.length === 0) {
        searchResults.innerHTML = '<div class="empty-message">Không tìm thấy người dùng</div>';
        return;
    }
    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${escapeHtml(user.name)}</span>
                <span class="friend-phone">📞 ${user.phone || 'N/A'}</span>
                <span class="friend-id">🆔 ${user.id}</span>
            </div>
            <button class="add-friend-btn" data-id="${user.id}">Kết bạn</button>
        `;
        searchResults.appendChild(div);
    });

    document.querySelectorAll('.add-friend-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const friendId = e.target.dataset.id;
            try {
                const res = await fetch('/api/friends/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ friendId })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Kết bạn thành công!');
                    loadFriends();
                    searchKeyword.value = '';
                    searchResults.innerHTML = '';
                } else {
                    alert(data.error || 'Kết bạn thất bại');
                }
            } catch (err) {
                alert('Lỗi kết nối');
            }
        });
    });
}

// Escape HTML
function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// Initialization
updateDate();
fetchMyInfo();
loadFriends();