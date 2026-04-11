// room.js

/* =========================================================
   🔗 MODULE: URL PARAMS – LẤY THÔNG TIN NHÓM TỪ URL
   - group_id và name được truyền qua query string
     ví dụ: room.html?group_id=123&name=Running+Team
   ─ Muốn kết nối DB thật: thay localStorage bằng API call
     GET /api/groups/:group_id → trả thông tin nhóm
========================================================= */
const params    = new URLSearchParams(window.location.search);
const groupID   = params.get("group_id");
const groupName = params.get("name");

document.getElementById("groupName").innerText = decodeURIComponent(groupName || "Nhóm");


/* =========================================================
   👥 MODULE: MEMBERS DATA – DỮ LIỆU THÀNH VIÊN (MOCK)
   - Hiện tại dùng dữ liệu mock cứng
   ─ Muốn kết nối DB: gọi GET /api/groups/:id/members
     → trả từ bảng group_members JOIN users
     → mỗi member: { name, steps }
========================================================= */
let members = [
    { name: "Bạn", steps: 8000 },
    { name: "An",  steps: 7000 }
];


/* =========================================================
   📋 MODULE: FRIEND LIST – DANH SÁCH BẠN CÓ THỂ MỜI (MOCK)
   - Hiện tại dùng mock
   ─ Muốn kết nối DB: gọi GET /api/friends → lọc bạn chưa có trong nhóm
========================================================= */
let friends      = ["Bình", "Cường", "Dũng", "Huy"];
let addedMembers = []; // theo dõi ai đã được thêm trong session này


/* =========================================================
   🖥️ MODULE: RENDER MEMBERS – VẼ DANH SÁCH THÀNH VIÊN
   - Hiển thị tên và số steps của từng người
========================================================= */
function renderMembers() {
    const html = members.map(m => `
        <div class="member">
            <div class="member-name">${m.name}</div>
            <div class="member-steps">${m.steps.toLocaleString()}</div>
        </div>
    `).join('');
    document.getElementById("members").innerHTML = html;
}


/* =========================================================
   📊 MODULE: CHART – BIỂU ĐỒ CỘT SO SÁNH STEPS
   - Dùng Chart.js (phải include trong HTML)
   - chartInstance: lưu để destroy trước khi vẽ lại (tránh memory leak)
   - Màu sắc tự động theo thứ tự thành viên
   ─ Muốn thêm màu: thêm vào mảng backgroundColor/borderColor
========================================================= */
let chartInstance = null;

function renderChart() {
    const ctx = document.getElementById("chart");

    if (chartInstance) chartInstance.destroy(); // Tránh memory leak

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: members.map(m => m.name),
            datasets: [{
                data:            members.map(m => m.steps),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75,  162, 0.8)',
                    'rgba(16,  185, 129, 0.8)',
                    'rgba(251, 146, 60,  0.8)',
                    'rgba(239, 68,  68,  0.8)',
                    'rgba(59,  130, 246, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75,  162, 1)',
                    'rgba(16,  185, 129, 1)',
                    'rgba(251, 146, 60,  1)',
                    'rgba(239, 68,  68,  1)',
                    'rgba(59,  130, 246, 1)'
                ],
                borderWidth:  2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding:         12,
                    titleFont:       { size: 14, weight: 'bold' },
                    bodyFont:        { size: 13 },
                    cornerRadius:    8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid:  { color: 'rgba(0,0,0,0.05)' },
                    ticks: { font: { size: 11 } }
                },
                x: {
                    grid:  { display: false },
                    ticks: { font: { size: 11, weight: 'bold' } }
                }
            }
        }
    });
}

// Vẽ lần đầu khi load
renderMembers();
renderChart();


/* =========================================================
   ☰ MODULE: MENU – MENU 3 CHẤM (THÊM/ĐỔI TÊN/RỜI NHÓM)
   - Click ra ngoài → tự đóng menu
========================================================= */
function toggleMenu() {
    const m = document.getElementById("menu");
    m.style.display = m.style.display === "flex" ? "none" : "flex";
}

document.addEventListener('click', (event) => {
    const menu    = document.getElementById("menu");
    const menuBtn = document.querySelector(".menu-btn");
    if (menu && menuBtn && !menu.contains(event.target) && !menuBtn.contains(event.target)) {
        menu.style.display = "none";
    }
});


/* =========================================================
   ➕ MODULE: ADD MEMBER – THÊM BẠN VÀO NHÓM
   - openAdd(): đóng menu, hiện modal danh sách bạn
   - addFriend(name): confirm → push vào members với steps ngẫu nhiên
   ─ Muốn kết nối DB: gọi POST /api/groups/:id/members
     với { friendId } → thêm vào bảng group_members
========================================================= */
function openAdd() {
    document.getElementById("menu").style.display = "none";

    const html = friends.map(f => {
        const added = addedMembers.includes(f);
        return `<div class="friend ${added ? 'added' : ''}" onclick="addFriend('${f}')">
                    ${f} ${added ? "(Đã thêm)" : ""}
                </div>`;
    }).join('');

    document.getElementById("friendList").innerHTML = html;
    document.getElementById("addModal").style.display = "flex";
}

function addFriend(name) {
    if (addedMembers.includes(name)) {
        alert("Đã thêm rồi");
        return;
    }

    if (confirm("Thêm " + name + " vào nhóm?")) {
        addedMembers.push(name);

        // Thêm với steps ngẫu nhiên (mock data)
        members.push({
            name:  name,
            steps: Math.floor(Math.random() * 5000 + 3000)
        });

        renderMembers();
        renderChart();
        openAdd(); // Refresh modal để đánh dấu "Đã thêm"
    }
}


/* =========================================================
   ✏️ MODULE: RENAME GROUP – ĐỔI TÊN NHÓM
   - Prompt nhập tên mới → cập nhật DOM + localStorage
   ─ Muốn lưu DB: gọi PATCH /api/groups/:id { name: newName }
     → UPDATE groups SET name=? WHERE group_id=?
========================================================= */
function renameGroup() {
    document.getElementById("menu").style.display = "none";

    const newName = prompt("Nhập tên mới:");
    if (!newName) return;

    document.getElementById("groupName").innerText = newName;

    // Cập nhật localStorage (mock)
    const groups = JSON.parse(localStorage.getItem("groups") || "[]");
    groups.forEach(g => { if (g.group_id === groupID) g.name = newName; });
    localStorage.setItem("groups", JSON.stringify(groups));
}


/* =========================================================
   🚪 MODULE: LEAVE GROUP – RỜI NHÓM
   - Xoá nhóm khỏi localStorage → về trang groups.html
   ─ Muốn lưu DB: gọi DELETE /api/groups/:id/members/me
     → DELETE FROM group_members WHERE group_id=? AND user_id=session.id
========================================================= */
function leaveGroup() {
    document.getElementById("menu").style.display = "none";

    if (!confirm("Bạn chắc chắn muốn rời nhóm?")) return;

    // Xoá nhóm khỏi localStorage (mock)
    let groups = JSON.parse(localStorage.getItem("groups") || "[]");
    groups     = groups.filter(g => g.group_id !== groupID);
    localStorage.setItem("groups", JSON.stringify(groups));

    window.location.href = "groups.html";
}


/* =========================================================
   🪟 MODULE: MODAL HELPERS – ĐÓNG MODAL
========================================================= */
function clickOutside(e) {
    if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
    }
}

function closeAddModal() {
    document.getElementById("addModal").style.display = "none";
}


/* =========================================================
   🔙 MODULE: NAVIGATION
========================================================= */
function goBack() {
    window.location.href = "groups.html";
}