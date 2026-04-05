let privacyMap = {};

/* LOAD PROFILE */
async function loadProfile() {
    try {
        const res = await fetch('/profile-data');
        const player = await res.json();

        if (!player || !player.id) return;

        privacyMap = player.privacy_settings || {};

        const level = player.level || 0;
        const xp = player.xp || 0;

        const xpMax = (level + 1) * 100;
        const xpNow = xp % xpMax;
        const percent = (xpNow / xpMax) * 100;

        set('heroName', player.name);
        set('heroRealname', player.email);
        set('heroStreak', player.streak || 0);
        set('heroId', 'USR-' + String(player.id).padStart(4, '0'));
        set('heroLevel', 'Level ' + level);

        set('heroXpLabel', `${xpNow} / ${xpMax} XP`);
        setW('heroXpFill', percent + '%');

        // avatar
        const initials = (player.name || 'U')
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2);

        set('heroAvatar', initials);

        // stats
        set('statFriends', player.friends || 0);
        set('statTasks', player.tasks || 0);
        set('statRank', '#' + (player.rank || 1));

        // info
        setField('name', 'infoName', player.name);
        setField('nickname', 'infoNickname', player.nickname);
        setField('birthday', 'infoBirthday', formatDate(player.birthdate));
        setField('join_date', 'infoJoined', formatDate(player.join_date));
        setField('city', 'infoCity', player.city_id);
        setField('phone', 'infoPhone', player.phone_number);
        setField('email', 'infoEmail', player.email);

    } catch (e) {
        console.error(e);
    }
}

/* SET FIELD */
function setField(field, id, value) {
    const privacy = privacyMap[field] || 'public';

    let display = value || '—';

    if (privacy === 'private') display = '🔒 Riêng tư';
    if (privacy === 'friends') display = '👥 Bạn bè';

    set(id, display);
    updateBadge(id, privacy);
}

/* BADGE */
function updateBadge(id, privacy) {
    const row = document.getElementById(id)?.closest('.info-row');
    if (!row) return;

    const badge = row.querySelector('.privacy-badge');
    if (!badge) return;

    badge.className = 'privacy-badge';

    if (privacy === 'public') {
        badge.textContent = 'Công khai';
        badge.classList.add('pub');
    }
    if (privacy === 'friends') {
        badge.textContent = 'Bạn bè';
        badge.classList.add('fri');
    }
    if (privacy === 'private') {
        badge.textContent = 'Riêng tư';
        badge.classList.add('priv');
    }
}

/* CLICK FIELD */
function editField(field) {
    showMenu(field);
}

/* MENU */
function showMenu(field) {
    removeMenu();

    const menu = document.createElement('div');
    menu.className = 'privacy-menu';

    const options = [
        ['🌍 Công khai', 'public'],
        ['👥 Bạn bè', 'friends'],
        ['🔒 Riêng tư', 'private']
    ];

    options.forEach(([text, val]) => {
        const item = document.createElement('div');
        item.className = 'privacy-item';
        item.textContent = text;

        item.onclick = (e) => {
            e.stopPropagation();
            updatePrivacy(field, val);
        };

        menu.appendChild(item);
    });

    document.body.appendChild(menu);
}

/* REMOVE MENU */
function removeMenu() {
    document.querySelector('.privacy-menu')?.remove();
}

/* UPDATE */
async function updatePrivacy(field, value) {
    await fetch('/update-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
    });

    privacyMap[field] = value;
    loadProfile();
}

/* UTILS */
function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setW(id, val) {
    const el = document.getElementById(id);
    if (el) el.style.width = val;
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
}

window.addEventListener('click', removeMenu);
window.addEventListener('load', loadProfile);