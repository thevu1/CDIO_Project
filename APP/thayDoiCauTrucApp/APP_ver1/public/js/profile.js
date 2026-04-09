// profile.js

/* =========================================================
   📥 MODULE: LOAD PROFILE – LẤY DỮ LIỆU TỪ API
   - Gọi GET /profile-data (home.js trả về)
   - Sau khi nhận data → điền vào từng section bên dưới
   - Các field từ DB:
       player.birthdate     (không phải birthday)
       player.phone_number  (không phải phone)
       player.city_name     (từ JOIN cities)
========================================================= */
async function loadProfile() {
    try {
        const res    = await fetch('/profile-data');
        const player = await res.json();

        /* ─────────────────────────────────────
           TÍNH TOÁN XP & LEVEL
           xpFloor = tổng XP đã dùng để đạt level hiện tại
           xpIn    = XP trong level hiện tại
           pct     = % thanh XP
        ───────────────────────────────────── */
        const level    = player.level    ?? 0;
        const totalXp  = player.xp       ?? 0;
        const xpToNext = player.xp_to_next && player.xp_to_next > 0
                            ? player.xp_to_next
                            : (level + 1) * 100;
        const xpFloor  = level * (level + 1) / 2 * 100;
        const xpIn     = Math.max(0, totalXp - xpFloor);
        const pct      = Math.min(Math.round((xpIn / xpToNext) * 100), 100);

        /* ─────────────────────────────────────
           HERO SECTION – AVATAR, TÊN, STREAK, ID
        ───────────────────────────────────── */
        // Avatar: lấy 2 chữ cái đầu của tên
        const initials = (player.name || 'WA')
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

        set('heroAvatar',  player.avatar || initials);
        set('heroLevel',   'Level ' + level);
        set('heroName',    player.name   || 'Warrior');
        set('heroRealname', player.email || '—');
        set('heroStreak',  player.streak || 0);
        set('heroId',      'USR-' + String(player.id).padStart(4, '0'));

        setW('heroXpFill',  pct + '%');
        set('heroXpLabel',  `${xpIn} / ${xpToNext} XP`);

        /* ─────────────────────────────────────
           STATS SECTION – BẠN BÈ, TASK, RANK
        ───────────────────────────────────── */
        set('statFriends', player.friends ?? 0);
        set('statTasks',   player.tasks   ?? 0);

        // Rank: lấy từ leaderboard riêng
        try {
            const lb    = await (await fetch('/leaderboardList')).json();
            // is_me = 1 được tính động theo session phía backend
            const me    = lb.find(p => p.is_me === 1);
            const rank  = me ? me.user_rank : '—';
            const total = lb.length;

            set('statRank',    rank === '—' ? '—' : '#' + rank);
            set('statRankSub', rank === '—'
                ? 'Top —'
                : `Top ${Math.round(rank / total * 100)}%`
            );
        } catch (_) { /* leaderboard lỗi không ảnh hưởng phần còn lại */ }

        /* ─────────────────────────────────────
           INFO ROWS – THÔNG TIN CHI TIẾT
           ⚠️ Dùng đúng tên field từ DB:
              birthdate    (không phải birthday)
              phone_number (không phải phone)
              city_name    (từ LEFT JOIN cities)
        ───────────────────────────────────── */
        set('infoName',     player.name     || '—');
        set('infoNickname', player.nickname || player.name || '—');

        // birthdate: DB trả 'YYYY-MM-DD', format thành 'DD/MM/YYYY | X tuổi'
        set('infoBirthday', player.birthdate
            ? formatDate(player.birthdate) + ' | ' + calcAge(player.birthdate) + ' tuổi'
            : '—'
        );

        set('infoJoined',  player.created_at ? formatDate(player.created_at) : '—');
        set('infoFriends', player.friends    ?? 0);
        set('infoTasks',   player.tasks      ?? 0);

        // city_name: tên thành phố từ JOIN bảng cities
        set('infoCity',  player.city_name    || '—');

        // phone_number: tên cột trong DB
        set('infoPhone', player.phone_number || '—');
        set('infoEmail', player.email        || '—');

    } catch (err) {
        console.error('[loadProfile]', err.message);
    }
}


/* =========================================================
   🛠️ MODULE: DOM HELPERS – TIỆN ÍCH SET TEXT & WIDTH
========================================================= */
function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setW(id, val) {
    const el = document.getElementById(id);
    if (el) el.style.width = val;
}


/* =========================================================
   📅 MODULE: DATE HELPERS – FORMAT NGÀY & TÍNH TUỔI
========================================================= */
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


/* =========================================================
   📋 MODULE: COPY USER ID – SAO CHÉP ID VÀO CLIPBOARD
   - Gọi từ nút copy trong UI
========================================================= */
function copyId() {
    const id = document.getElementById('heroId').textContent;
    navigator.clipboard.writeText(id)
        .then(() => showToast('Đã sao chép ID: ' + id));
}


/* =========================================================
   ✏️ MODULE: EDIT FIELD – MỞ FORM CHỈNH SỬA (STUB)
   - Hiện tại chỉ hiện toast
   - Mở rộng: thay bằng modal hoặc redirect sang trang edit
========================================================= */
function editField(field) {
    showToast('Chỉnh sửa: ' + field);
}


/* =========================================================
   🍞 MODULE: TOAST – THÔNG BÁO NHỎ GÓC MÀN HÌNH
   - Tự xoá sau 2.6 giây
   - Dùng: showToast('nội dung')
========================================================= */
function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();

    const t = document.createElement('div');
    t.className   = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);

    setTimeout(() => t.remove(), 2600);
}


/* =========================================================
   🚀 MODULE: INIT – KHỞI CHẠY KHI TRANG TẢI
========================================================= */
window.addEventListener('load', loadProfile);