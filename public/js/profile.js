/* ═══════════════════════════════════
   Load profile từ API
═══════════════════════════════════ */
async function loadProfile() {
    try {
        const res = await fetch('/profile-data');
        const player = await res.json();

        const level = player.level ?? 0;
        const totalXp = player.xp ?? 0;
        const xpToNext = (level + 1) * 100;
        const xpFloor = level * (level + 1) / 2 * 100;
        const xpIn = Math.max(0, totalXp - xpFloor);
        const pct = Math.min(Math.round((xpIn / xpToNext) * 100), 100);

        // Hero
        const initials = (player.name || 'WA').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        set('heroAvatar', initials);
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
            const countRes = await fetch('/api/users/count');
            const { total: totalUsers } = await countRes.json();
            set('statRankSub', `Top ${Math.round(rank / totalUsers * 100)}%`);
        } catch (_) { }

        // Info rows
        set('infoName', player.name || '—');
        set('infoNickname', player.nickname || player.name || '—');
        set('infoBirthday', player.birthday
            ? formatDate(player.birthday) + ' | ' + calcAge(player.birthday) + ' tuổi'
            : '—');
        set('infoJoined', player.created_at ? formatDate(player.created_at) : '—');
        set('infoFriends', player.friends ?? 0);
        set('infoTasks', player.tasks ?? 0);
        set('infoCity', player.city || '—');
        set('infoPhone', player.phone || '—');
        set('infoEmail', player.email || '—');

    } catch (err) {
        console.error('[loadProfile]', err.message);
    }
}

function set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setW(id, val) { const el = document.getElementById(id); if (el) el.style.width = val; }

function formatDate(str) {
    if (!str) return '—';
    const parts = String(str).slice(0, 10).split('-');
    if (parts.length < 3) return str;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function calcAge(str) {
    if (!str) return '';
    const year = parseInt(String(str).slice(0, 4));
    return new Date().getFullYear() - year;
}

/* Copy user ID */
function copyId() {
    const id = document.getElementById('heroId').textContent;
    navigator.clipboard.writeText(id).then(() => showToast('Đã sao chép ID: ' + id));
}

/* Edit field (stub — mở modal hoặc trang edit) */
function editField(field) {
    showToast('Chỉnh sửa: ' + field);
}

/* Toast */
function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
}

window.addEventListener('load', loadProfile);