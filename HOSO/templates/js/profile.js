let currentUserId = null;
// let profileUserId = null; // ID của người dùng đang xem (có thể là chính mình hoặc người khác)
let profileUserId = 1; // mặc định xem profile của user có ID = 1 (có thể thay đổi sau)
let profileData = null;

// Hàm lấy thông tin user hiện tại
async function checkLogin() {
    try {
        const res = await fetch('/auth/me');
        if (res.ok) {
            const data = await res.json();
            currentUserId = data.userId;
        }
    } catch (err) {
        console.error(err);
    }
    // Mặc định xem profile của chính mình (có thể thay đổi sau)
    profileUserId = 1; // fallback
    loadProfile();
}

// Tải profile từ API
async function loadProfile() {
    try {
        const res = await fetch(`/api/profile/${profileUserId}`);
        if (!res.ok) throw new Error('Lỗi tải profile');
        profileData = await res.json();
        renderProfile();
    } catch (err) {
        console.error(err);
    }
}

// Hiển thị thông tin lên giao diện
function renderProfile() {
    document.getElementById('user-name').textContent = profileData.name;
    document.getElementById('avatar').src = profileData.avatar || 'https://via.placeholder.com/80';

    const infoDiv = document.getElementById('profile-info');
    infoDiv.innerHTML = '';

    // Danh sách các trường hiển thị
    const fields = [
        { key: 'nickname', label: 'Biệt danh', icon: 'fa-tag' },
        { key: 'birthdate', label: 'Ngày sinh', icon: 'fa-calendar', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '***' },
        { key: 'join_date', label: 'Ngày gia nhập', icon: 'fa-calendar-plus', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '***' },
        { key: 'friends_count', label: 'Bạn bè', icon: 'fa-users', format: (v) => v ?? '***' },
        { key: 'tasks_completed', label: 'Nhiệm vụ hoàn thành', icon: 'fa-check-circle', format: (v) => v ?? '***' },
        { key: 'city', label: 'Thành phố', icon: 'fa-city', format: (v) => v || '***' },
        { key: 'phone_number', label: 'Số điện thoại', icon: 'fa-phone', format: (v) => v ? v.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2') : '***' }
    ];

    fields.forEach(field => {
        const value = profileData[field.key];
        const displayValue = value !== null && value !== undefined ? (field.format ? field.format(value) : value) : '***';

        const item = document.createElement('div');
        item.className = 'info-item';

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'info-label';
        labelDiv.innerHTML = `<i class="fas ${field.icon}"></i> ${field.label}`;

        // Value + privacy badge
        const valueDiv = document.createElement('div');
        valueDiv.className = 'info-value';
        valueDiv.innerHTML = `<span>${displayValue}</span>`;

        // Nếu là chủ sở hữu, hiển thị badge quyền riêng tư
        if (profileData.privacy_settings && profileData.privacy_settings[field.key]) {
            const privacy = profileData.privacy_settings[field.key];
            const badge = document.createElement('span');
            badge.className = `privacy-badge ${privacy}`;
            badge.textContent = privacy === 'public' ? 'Công khai' : (privacy === 'friends' ? 'Bạn bè' : 'Riêng tư');
            badge.dataset.field = field.key;
            badge.addEventListener('click', () => openEditModal());
            valueDiv.appendChild(badge);
        }

        item.appendChild(labelDiv);
        item.appendChild(valueDiv);
        infoDiv.appendChild(item);
    });

    // Hiển thị nút chỉnh sửa nếu là chủ sở hữu
    const editBtn = document.getElementById('edit-profile');
    const logoutBtn = document.getElementById('logout');
    if (currentUserId === profileUserId) {
        editBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'inline-block';
    } else {
        editBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
}

// Mở modal chỉnh sửa (chỉ dành cho chủ sở hữu)
function openEditModal() {
    if (currentUserId !== profileUserId) return;
    // Điền dữ liệu hiện tại vào form
    document.querySelector('input[name="nickname"]').value = profileData.nickname || '';
    document.querySelector('input[name="birthdate"]').value = profileData.birthdate ? profileData.birthdate.slice(0,10) : '';
    document.querySelector('input[name="city"]').value = profileData.city || '';
    document.querySelector('input[name="phone_number"]').value = profileData.phone_number || '';

    // Tạo dropdown cho từng trường privacy
    const privacyDiv = document.getElementById('privacy-settings');
    privacyDiv.innerHTML = '';
    const fields = ['nickname', 'birthdate', 'join_date', 'friends_count', 'tasks_completed', 'city', 'phone_number'];
    fields.forEach(field => {
        const currentPrivacy = profileData.privacy_settings?.[field] || 'public';
        const div = document.createElement('div');
        div.innerHTML = `
            <label>${field}: 
                <select name="privacy_${field}">
                    <option value="public" ${currentPrivacy === 'public' ? 'selected' : ''}>Công khai</option>
                    <option value="friends" ${currentPrivacy === 'friends' ? 'selected' : ''}>Bạn bè</option>
                    <option value="private" ${currentPrivacy === 'private' ? 'selected' : ''}>Riêng tư</option>
                </select>
            </label>
        `;
        privacyDiv.appendChild(div);
    });

    document.getElementById('edit-modal').style.display = 'flex';
}

// Lưu chỉnh sửa
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        nickname: formData.get('nickname'),
        birthdate: formData.get('birthdate'),
        city: formData.get('city'),
        phone_number: formData.get('phone_number'),
        privacy_settings: {}
    };
    // Thu thập privacy
    const fields = ['nickname', 'birthdate', 'join_date', 'friends_count', 'tasks_completed', 'city', 'phone_number'];
    fields.forEach(field => {
        data.privacy_settings[field] = formData.get(`privacy_${field}`);
    });

    try {
        const res = await fetch('/api/profile/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Cập nhật thành công!');
            document.getElementById('edit-modal').style.display = 'none';
            loadProfile(); // tải lại
        } else {
            alert('Lỗi khi cập nhật');
        }
    } catch (err) {
        console.error(err);
    }
});

// Đóng modal
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('edit-modal').style.display = 'none';
});

// Đăng xuất
document.getElementById('logout').addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.reload();
});

// Khởi chạy
checkLogin();