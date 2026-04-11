// profile.js

/* =========================================================
   📥 MODULE: LOAD PROFILE – LẤY DỮ LIỆU TỪ API
   ========================================================= */
async function loadProfile() {
    try {
        const res = await fetch('/profile-data');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const player = await res.json();
        

        // Tính toán XP
        const level = player.level ?? 0;
        const totalXp = player.xp ?? 0;
        const xpToNext = player.xp_to_next && player.xp_to_next > 0
            ? player.xp_to_next
            : (level + 1) * 100;
        const xpFloor = level * (level + 1) / 2 * 100;
        const xpIn = Math.max(0, totalXp - xpFloor);
        const pct = Math.min(Math.round((xpIn / xpToNext) * 100), 100);

        // Avatar
        const initials = (player.name || 'WA')
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

        set('heroAvatar', player.avatar || initials);
        set('heroLevel', 'Level ' + level);
        set('heroName', player.name || 'Warrior');
        set('heroRealname', player.email || '—');
        set('heroStreak', player.streak || 0);
        set('heroId', 'USR-' + String(player.id).padStart(4, '0'));

        setW('heroXpFill', pct + '%');
        set('heroXpLabel', `${xpIn} / ${xpToNext} XP`);

        // Stats
        set('statFriends', player.friends ?? 0);
        set('statTasks', player.tasks ?? 0);

        // Rank
        try {
            const lb = await (await fetch('/leaderboardList')).json();
            const me = lb.find(p => p.is_me === 1);
            const rank = me ? me.user_rank : '—';
            const total = lb.length;
            set('statRank', rank === '—' ? '—' : '#' + rank);
            set('statRankSub', rank === '—'
                ? 'Top —'
                : `Top ${Math.round(rank / total * 100)}%`
            );
        } catch (_) {}

        // Info rows
        set('infoName', player.name || '—');
        set('infoNickname', player.nickname || player.name || '—');
        set('infoBirthday', player.birthdate
            ? formatDate(player.birthdate) + ' | ' + calcAge(player.birthdate) + ' tuổi'
            : '—'
        );
        set('infoJoined', player.created_at ? formatDate(player.created_at) : '—');
        set('infoFriends', player.friends ?? 0);
        set('infoTasks', player.tasks ?? 0);
        set('infoCity', player.city_name || '—');
        set('infoPhone', player.phone_number || '—');
        set('infoEmail', player.email || '—');

        // === PHẦN MỚI: Cập nhật privacy badges và gán sự kiện ===
        const privacySettings = player.privacy_settings || {};
        
        updateAllPrivacyBadges(privacySettings);
        attachPrivacyEvents();

    } catch (err) {
        console.error('[loadProfile]', err.message);
        showToast('Không thể tải dữ liệu hồ sơ');
    }
}

/* =========================================================
   🛠️ MODULE: DOM HELPERS
   ========================================================= */
function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setW(id, val) {
    const el = document.getElementById(id);
    if (el) el.style.width = val;
}

function formatDate(str) {
    const d = new Date(str);
    if (isNaN(d)) return str;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function calcAge(str) {
    const d = new Date(str);
    if (isNaN(d)) return '';
    return new Date().getFullYear() - d.getFullYear();
}

function copyId() {
    const id = document.getElementById('heroId').textContent;
    navigator.clipboard.writeText(id).then(() => showToast('Đã sao chép ID: ' + id));
}

function editField(field) {
    showToast('Chỉnh sửa: ' + field);
}

function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
}

/* =========================================================
   🔒 MODULE: PRIVACY SETTINGS
   ========================================================= */

// Map giá trị privacy sang text và class CSS
const PRIVACY_MAP = {
    'public':  { text: 'Công khai', class: 'pub' },
    'friends': { text: 'Bạn bè',   class: 'fri' },
    'private': { text: 'Riêng tư', class: 'priv' }
};

// Cập nhật tất cả badge dựa trên settings từ server
function updateAllPrivacyBadges(settings) {
    document.querySelectorAll('[data-privacy-field]').forEach(el => {
        const field = el.dataset.privacyField;
        const badge = el.querySelector('.privacy-badge');
        if (!badge) return;

        const value = settings[field] || 'public';
        const info = PRIVACY_MAP[value] || PRIVACY_MAP.public;

        badge.textContent = info.text;
        badge.className = `privacy-badge ${info.class}`;
        badge.dataset.value = value;
    });
}

// Gán sự kiện click cho các privacy badge

function attachPrivacyEvents() {
    // Xóa sự kiện cũ bằng cách clone (nếu cần) nhưng ta sẽ gán trực tiếp
    document.querySelectorAll('.info-row[data-privacy-field]').forEach(row => {
        // Xóa listener cũ (nếu có) bằng cách thay thế node? Không cần thiết vì ta dùng addEventListener một lần duy nhất khi load
        // Để tránh trùng lặp, ta có thể dùng cờ hoặc removeEventListener, nhưng đơn giản là gán lại khi load
        row.removeEventListener('click', handlePrivacyClick);
        row.addEventListener('click', handlePrivacyClick);
    });
}
// Hàm xử lý chung khi click vào dòng
function handlePrivacyClick(e) {
    // Nếu click vào chính badge hoặc nút khác, vẫn xử lý bình thường
    const row = e.currentTarget;
    const field = row.dataset.privacyField;
    const badge = row.querySelector('.privacy-badge');
    if (!badge) return;

    showPrivacyMenu(field, badge);
}

// Hiển thị menu chọn chế độ
function showPrivacyMenu(field, badgeElement) {
    // Xóa menu cũ nếu có
    const oldMenu = document.querySelector('.privacy-menu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'privacy-menu';
    menu.innerHTML = `
        <div class="privacy-option" data-value="public">
            <span>🌐 Công khai</span>
            <span class="check">${badgeElement.dataset.value === 'public' ? '✓' : ''}</span>
        </div>
        <div class="privacy-option" data-value="friends">
            <span>👥 Bạn bè</span>
            <span class="check">${badgeElement.dataset.value === 'friends' ? '✓' : ''}</span>
        </div>
        <div class="privacy-option" data-value="private">
            <span>🔒 Riêng tư</span>
            <span class="check">${badgeElement.dataset.value === 'private' ? '✓' : ''}</span>
        </div>
    `;

    // Style cơ bản cho menu (có thể chuyển vào CSS)
    Object.assign(menu.style, {
        position: 'absolute',
        background: '#1e1e2f',
        borderRadius: '12px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
        padding: '8px 0',
        zIndex: '1000',
        minWidth: '160px',
        border: '1px solid #333',
        color: '#fff'
    });

    // Định vị menu gần badge
    const rect = badgeElement.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 8) + 'px';

    // Xử lý chọn
    menu.addEventListener('click', async (e) => {
        const option = e.target.closest('.privacy-option');
        if (!option) return;
        const newValue = option.dataset.value;
        if (!newValue) return;

        // Cập nhật giao diện ngay
        const info = PRIVACY_MAP[newValue];
        badgeElement.textContent = info.text;
        badgeElement.className = `privacy-badge ${info.class}`;
        badgeElement.dataset.value = newValue;

        // Gọi API lưu
        try {
            const res = await fetch('/update-privacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, value: newValue })
            });
            const data = await res.json();
            if (!data.success) {
                showToast('Lỗi cập nhật quyền riêng tư');
            } else {
                showToast(`Đã đặt ${field} thành ${info.text}`);
            }
        } catch (err) {
            showToast('Không thể kết nối server');
        }

        menu.remove();
    });

    // Click ra ngoài đóng menu
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== badgeElement) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }, 10);

    document.body.appendChild(menu);
}

// Thêm style cho menu (có thể đưa vào CSS chính)
const style = document.createElement('style');
style.textContent = `
    .privacy-menu .privacy-option {
        padding: 10px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: background 0.15s;
    }
    .privacy-menu .privacy-option:hover {
        background: #2a2a40;
    }
    .privacy-menu .check {
        color: #4caf50;
        font-weight: bold;
    }
    .privacy-badge {
        cursor: pointer;
        user-select: none;
    }
`;
document.head.appendChild(style);

/* =========================================================
   🚀 MODULE: INIT
   ========================================================= */
window.addEventListener('load', loadProfile);