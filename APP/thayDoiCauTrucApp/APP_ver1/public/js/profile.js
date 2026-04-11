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

// profile.js

// Hàm ánh xạ field sang tên hiển thị tiếng Việt
function getFieldDisplayName(field) {
    const map = {
        'name': 'Tên',
        'nickname': 'Biệt danh',
        'birthdate': 'Ngày sinh',
        'created_at': 'Ngày gia nhập',
        'friends_count': 'Bạn bè',
        'tasks_count': 'Nhiệm vụ hoàn thành',
        'city_name': 'Thành phố',
        'phone_number': 'Số điện thoại',
        'email': 'Email',
        'gender': 'Giới tính'
    };
    return map[field] || field;
}

// Hiển thị menu chọn chế độ
function showPrivacyMenu(field, badgeElement) {
    // Xóa menu cũ nếu có
    const oldMenu = document.querySelector('.privacy-menu');
    if (oldMenu) oldMenu.remove();
    const oldOverlay = document.querySelector('.privacy-overlay');
    if (oldOverlay) oldOverlay.remove();

    // Tạo overlay nền mờ
    const overlay = document.createElement('div');
    overlay.className = 'privacy-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(3px);
        z-index: 9998;
    `;

    // Tạo menu
    const menu = document.createElement('div');
    menu.className = 'privacy-menu';
    Object.assign(menu.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#1e1e2f',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
        padding: '8px 0',
        zIndex: '9999',
        width: '280px',
        maxWidth: '85vw',
        color: '#fff',
        border: '1px solid #2e2e4a',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, opacity 0.2s ease',
        opacity: '0',
        transform: 'translate(-50%, -48%)'
    });

    // === HEADER HIỂN THỊ TÊN TRƯỜNG ===
    const displayName = getFieldDisplayName(field);
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 14px 16px 10px;
        text-align: center;
        border-bottom: 1px solid #333;
    `;
    header.innerHTML = `
        <div style="font-size: 12px; color: #aaa; margin-bottom: 4px;">Cài đặt quyền riêng tư cho</div>
        <div style="font-weight: 700; font-size: 16px; color: #fff;">${displayName}</div>
    `;
    menu.appendChild(header);

    const options = [
        { value: 'public', icon: '🌐', label: 'Công khai' },
        { value: 'friends', icon: '👥', label: 'Bạn bè' },
        { value: 'private', icon: '🔒', label: 'Riêng tư' }
    ];

    const currentValue = badgeElement.dataset.value || 'public';

    options.forEach(opt => {
        const optDiv = document.createElement('div');
        optDiv.className = 'privacy-option';
        optDiv.dataset.value = opt.value;
        optDiv.style.cssText = `
            padding: 14px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background 0.15s;
            margin: 2px 6px;
            border-radius: 14px;
        `;
        optDiv.innerHTML = `
            <span style="font-size: 20px;">${opt.icon}</span>
            <span style="flex:1; font-weight: 500;">${opt.label}</span>
            ${opt.value === currentValue ? '<span style="color:#4caf50; font-size:18px;">✓</span>' : ''}
        `;

        optDiv.addEventListener('mouseenter', () => {
            optDiv.style.backgroundColor = '#2a2a40';
        });
        optDiv.addEventListener('mouseleave', () => {
            optDiv.style.backgroundColor = '';
        });

        if (opt.value === currentValue) {
            optDiv.style.backgroundColor = 'rgba(168, 85, 247, 0.15)';
            optDiv.style.boxShadow = '0 0 0 2px rgba(168, 85, 247, 0.5)';
        }

        menu.appendChild(optDiv);
    });

    // Nút hủy
    const cancelBtn = document.createElement('div');
    cancelBtn.style.cssText = `
        padding: 12px 16px;
        text-align: center;
        color: #f87171;
        font-weight: 600;
        border-top: 1px solid #333;
        margin-top: 4px;
        cursor: pointer;
        transition: background 0.15s;
    `;
    cancelBtn.textContent = 'Hủy';
    cancelBtn.addEventListener('click', () => {
        overlay.remove();
        menu.remove();
    });
    menu.appendChild(cancelBtn);

    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    requestAnimationFrame(() => {
        menu.style.opacity = '1';
        menu.style.transform = 'translate(-50%, -50%)';
    });

    // Xử lý chọn option
    menu.addEventListener('click', async (e) => {
        const option = e.target.closest('.privacy-option');
        if (!option) return;
        const newValue = option.dataset.value;
        if (!newValue) return;

        const info = PRIVACY_MAP[newValue];
        badgeElement.textContent = info.text;
        badgeElement.className = `privacy-badge ${info.class}`;
        badgeElement.dataset.value = newValue;

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
                showToast(`Đã đặt ${displayName} thành ${info.text}`);
            }
        } catch (err) {
            showToast('Không thể kết nối server');
        }

        overlay.remove();
        menu.remove();
    });

    overlay.addEventListener('click', () => {
        overlay.remove();
        menu.remove();
    });
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
// Thêm style cho menu (thay thế phần style cũ)
const menuStyle = document.createElement('style');
menuStyle.textContent = `
    .privacy-menu {
        font-family: 'Nunito', sans-serif;
        animation: menuFadeIn 0.15s ease;
    }
    @keyframes menuFadeIn {
        from { opacity: 0; transform: translateY(-50%) scale(0.95); }
        to { opacity: 1; transform: translateY(-50%) scale(1); }
    }
    .privacy-menu .privacy-option {
        padding: 10px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s;
        margin: 2px 4px;
        border-radius: 10px;
    }
    .privacy-menu .privacy-option:hover {
        background: #2a2a40;
    }
    .privacy-menu .privacy-option.selected {
        background: rgba(168, 85, 247, 0.15);
        box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5);
    }
    .privacy-menu .check {
        color: #4caf50;
        font-weight: bold;
        font-size: 14px;
    }
    .privacy-badge {
        cursor: pointer;
        user-select: none;
    }
`;
// Xóa style cũ nếu đã tồn tại
const oldStyle = document.querySelector('style[data-privacy-style]');
if (oldStyle) oldStyle.remove();
menuStyle.setAttribute('data-privacy-style', 'true');
document.head.appendChild(menuStyle);
document.head.appendChild(style);

/* =========================================================
   🚀 MODULE: INIT
   ========================================================= */
window.addEventListener('load', loadProfile);