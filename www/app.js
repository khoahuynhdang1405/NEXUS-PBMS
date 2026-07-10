/**
 * app.js - Logic xử lý chính cho Hệ thống Quản lý Tòa nhà Đỗ xe (PBMS)
 * Hỗ trợ giao diện tiếng Việt thuần, giả lập cổng nhận diện ANPR, trạm sạc EV và sơ đồ mặt bằng bãi đỗ.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // ĐĂNG NHẬP & XÁC THỰC ADMIN
    // ----------------------------------------------------
    function applyRolePermissions() {
        const role = sessionStorage.getItem("pbms_user_role") || "admin";
        const analyticsNav = document.querySelector('.nav-item[data-tab="analytics"]');
        const settingsNav = document.querySelector('.nav-item[data-tab="settings"]');
        const usersNav = document.querySelector('.nav-item[data-tab="users"]');
        const userRoleLabel = document.querySelector('.user-info .role');
        const userNameLabel = document.querySelector('.user-info .name');
        const userAvatar = document.querySelector('.user-profile .avatar');
        
        // Cập nhật tên và ảnh đại diện động
        const fullname = sessionStorage.getItem("pbms_user_fullname") || "Người dùng";
        if (userNameLabel) userNameLabel.textContent = fullname;
        if (userAvatar && fullname) {
            userAvatar.textContent = fullname.split(' ').pop().substring(0, 2).toUpperCase();
        }
        
        if (role === "staff") {
            if (analyticsNav) analyticsNav.style.display = "none";
            if (settingsNav) settingsNav.style.display = "none";
            if (usersNav) usersNav.style.display = "flex"; // Cho phép staff xem quản lý người gửi
            if (userRoleLabel) userRoleLabel.textContent = "Nhân viên vận hành";
            
            // Nếu tab đang chọn là báo cáo hoặc cấu hình phí thì chuyển về Dashboard
            if (activeTab === "analytics" || activeTab === "settings") {
                const dashboardNav = document.querySelector('.nav-item[data-tab="dashboard"]');
                if (dashboardNav) dashboardNav.click();
            }
        } else {
            if (analyticsNav) analyticsNav.style.display = "flex";
            if (settingsNav) settingsNav.style.display = "flex";
            if (usersNav) usersNav.style.display = "flex";
            if (userRoleLabel) userRoleLabel.textContent = "Quản trị hệ thống";
        }
    }

    function checkLoginStatus() {
        const isLoggedIn = sessionStorage.getItem("pbms_admin_logged_in") === "true";
        const loginScreen = document.getElementById("login-screen");
        if (isLoggedIn) {
            if (loginScreen) loginScreen.classList.add("hidden");
            applyRolePermissions();
        } else {
            if (loginScreen) loginScreen.classList.remove("hidden");
        }
    }
    
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const user = document.getElementById("login-username").value.trim();
            const pass = document.getElementById("login-password").value;
            const errBox = document.getElementById("login-error");
            
            // Đăng nhập vai trò Admin tĩnh
            if (user.toLowerCase() === "admin" && pass === "123") {
                sessionStorage.setItem("pbms_admin_logged_in", "true");
                sessionStorage.setItem("pbms_user_role", "admin");
                sessionStorage.setItem("pbms_user_fullname", "Admin");
                if (errBox) errBox.classList.add("hidden");
                checkLoginStatus();
                loginForm.reset();
                return;
            }

            // Đăng nhập vai trò Staff tĩnh
            if (user.toLowerCase() === "staff" && pass === "123") {
                sessionStorage.setItem("pbms_admin_logged_in", "true");
                sessionStorage.setItem("pbms_user_role", "staff");
                sessionStorage.setItem("pbms_user_fullname", "Staff");
                if (errBox) errBox.classList.add("hidden");
                checkLoginStatus();
                loginForm.reset();
                return;
            }
            
            // Đăng nhập tài khoản người dùng lấy từ danh sách đăng ký data.users
            const matchedUser = (data.users || []).find(u => u.username.toLowerCase() === user.toLowerCase() && u.password === pass);
            if (matchedUser) {
                // Kiểm tra vai trò của tài khoản được gán
                const userRole = matchedUser.role || "driver";
                
                if (userRole === "staff") {
                    // Nếu là Staff, đăng nhập vào Web Dashboard quản trị
                    sessionStorage.setItem("pbms_admin_logged_in", "true");
                    sessionStorage.setItem("pbms_user_role", "staff");
                    sessionStorage.setItem("pbms_user_fullname", matchedUser.fullname);
                    if (errBox) errBox.classList.add("hidden");
                    checkLoginStatus();
                    loginForm.reset();
                } else {
                    // Nếu là Driver, mở màn hình Mobile App
                    sessionStorage.setItem("pbms_admin_logged_in", "true");
                    sessionStorage.setItem("pbms_user_role", "driver");
                    sessionStorage.setItem("pbms_driver_logged_in", "true");
                    sessionStorage.setItem("pbms_driver_username", matchedUser.username);
                    sessionStorage.setItem("pbms_user_fullname", matchedUser.fullname);
                    localStorage.setItem("pbms_user_plate", matchedUser.phone);
                    localStorage.setItem("pbms_driver_profile", JSON.stringify(matchedUser));
                    if (errBox) errBox.classList.add("hidden");
                    if (window.Capacitor) {
                        window.location.href = "mobile.html";
                    } else {
                        window.open("mobile.html", "_blank");
                    }
                }
                return;
            }
            
            if (errBox) errBox.classList.remove("hidden");
        });
    }

    // Chọn nhanh vai trò (Chỉ điền sẵn tài khoản, làm rỗng mật khẩu, không đăng nhập tự động)
    const btnQuickAdmin = document.getElementById("btn-quick-admin");
    const btnQuickStaff = document.getElementById("btn-quick-staff");
    const btnQuickDriver = document.getElementById("btn-quick-driver");
    const loginUser = document.getElementById("login-username");
    const loginPass = document.getElementById("login-password");
    const errBox = document.getElementById("login-error");

    if (btnQuickAdmin) {
        btnQuickAdmin.addEventListener("click", () => {
            if (loginUser) loginUser.value = "admin";
            if (loginPass) {
                loginPass.value = "";
                loginPass.focus();
            }
            if (errBox) errBox.classList.add("hidden");
        });
    }

    if (btnQuickStaff) {
        btnQuickStaff.addEventListener("click", () => {
            if (loginUser) loginUser.value = "staff";
            if (loginPass) {
                loginPass.value = "";
                loginPass.focus();
            }
            if (errBox) errBox.classList.add("hidden");
        });
    }

    if (btnQuickDriver) {
        btnQuickDriver.addEventListener("click", () => {
            if (loginUser) loginUser.value = "";
            if (loginPass) {
                loginPass.value = "";
                loginUser.focus();
            }
            if (errBox) errBox.classList.add("hidden");
            if (window.Capacitor) {
                window.location.href = "mobile.html";
            } else {
                window.open("mobile.html", "_blank");
            }
        });
    }

    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
        logoutBtn.setAttribute("title", "Đăng xuất tài khoản");
        logoutBtn.removeAttribute("onclick");
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
                sessionStorage.removeItem("pbms_admin_logged_in");
                sessionStorage.removeItem("pbms_user_role");
                sessionStorage.removeItem("pbms_driver_logged_in");
                sessionStorage.removeItem("pbms_driver_username");
                checkLoginStatus();
            }
        });
    }

    checkLoginStatus();

    // ----------------------------------------------------
    // TRẠNG THÁI & KHỞI TẠO
    // ----------------------------------------------------
    let data = window.PBMS_DATA;
    let activeTab = "dashboard";
    let activeFloorId = "B2";
    let checkoutActiveFloorId = "B2";
    let selectedSlotId = null;
    
    // Các biến trạng thái hoạt động giả lập
    let totalRevenue = data.revenue || 1820000;
    let alertLog = [...data.alerts];
    
    // Khởi tạo các icon từ Lucide
    lucide.createIcons();
    
    async function fetchInitialState() {
        try {
            const res = await fetch('/api/state?_t=' + Date.now());
            if (res.ok) {
                const serverState = await res.json();
                data = serverState;
                window.PBMS_DATA = data;
                totalRevenue = data.revenue || 1820000;
                alertLog = [...data.alerts];
                
                // Vẽ lại giao diện sau khi có dữ liệu mới từ máy chủ
                renderDashboard();
                renderFloorSelector();
                renderFloorMap(activeFloorId);
            }
        } catch (e) {
            console.error("Không kết nối được với máy chủ để lấy dữ liệu ban đầu:", e);
        }
    }
    
    fetchInitialState();
    
    // Chạy đồng hồ hệ thống
    updateClock();
    setInterval(updateClock, 1000);
    
    // Khởi động luồng chạy giả lập tự động (xe ra/vào và tiến trình sạc EV)
    setInterval(simulationTick, 4000);
    
    // Cài đặt chuyển đổi tab
    initNavigation();
    
    // Cấu hình form nhập liệu và sự kiện
    initGateSimulator();
    initSettingsView();
    
    // Render màn hình chính lúc khởi động
    renderDashboard();
    
    // Khởi tạo bộ chọn tầng và sơ đồ tầng mặc định B2
    renderFloorSelector();
    renderFloorMap(activeFloorId);

    // Polling máy chủ mỗi 2 giây để đồng bộ dữ liệu
    setInterval(async () => {
        try {
            const res = await fetch('/api/state?_t=' + Date.now());
            if (res.ok) {
                const serverState = await res.json();
                const serverStateStr = JSON.stringify(serverState);
                const localStateStr = JSON.stringify(data);
                if (serverStateStr !== localStateStr) {
                    data = serverState;
                    window.PBMS_DATA = data;
                    totalRevenue = data.revenue || 1820000;
                    alertLog = [...data.alerts];
                    
                    // Render lại các màn hình đang mở
                    if (activeTab === "dashboard") {
                        renderDashboard();
                    } else if (activeTab === "floormap") {
                        renderFloorMap(activeFloorId);
                        if (selectedSlotId) {
                            let insSlot = null;
                            data.floors.forEach(f => {
                                const s = f.slots.find(x => x.id === selectedSlotId);
                                if (s) insSlot = s;
                            });
                            if (insSlot) inspectSpot(insSlot);
                        }
                    } else if (activeTab === "evcharging") {
                        renderEVStations();
                    } else if (activeTab === "analytics") {
                        renderAnalytics();
                    } else if (activeTab === "users") {
                        renderUsersTable();
                    }
                    updateGateDropdowns();
                }
            }
        } catch (e) {
            console.error("Lỗi đồng bộ máy chủ (polling):", e);
        }
    }, 2000);

    // Lắng nghe sự kiện đồng bộ trạng thái khi có thay đổi từ Mobile App tab (cục bộ)
    window.addEventListener('storage', () => {
        const localSaved = localStorage.getItem("pbms_state");
        if (localSaved) {
            data = JSON.parse(localSaved);
            window.PBMS_DATA = data;
            totalRevenue = data.revenue || 1820000;
            alertLog = [...data.alerts];
            
            // Render lại các màn hình đang mở
            if (activeTab === "dashboard") {
                renderDashboard();
            } else if (activeTab === "floormap") {
                renderFloorMap(activeFloorId);
                if (selectedSlotId) {
                    let insSlot = null;
                    data.floors.forEach(f => {
                        const s = f.slots.find(x => x.id === selectedSlotId);
                        if (s) insSlot = s;
                    });
                    if (insSlot) inspectSpot(insSlot);
                }
            } else if (activeTab === "evcharging") {
                renderEVStations();
            } else if (activeTab === "analytics") {
                renderAnalytics();
            } else if (activeTab === "users") {
                renderUsersTable();
            }
            updateGateDropdowns();
        }
    });

    // ----------------------------------------------------
    // ĐIỀU HƯỚNG TABS
    // ----------------------------------------------------
    function initNavigation() {
        const navItems = document.querySelectorAll(".nav-item");
        const tabPanels = document.querySelectorAll(".tab-panel");
        const viewTitle = document.getElementById("view-title");
        const viewSubtitle = document.getElementById("view-subtitle");
        
        const viewMeta = {
            dashboard: { title: "Bảng Điều Khiển Chung", subtitle: "Theo dõi trạng thái bãi đỗ xe và hệ thống điều hành thời gian thực." },
            floormap: { title: "Sơ Đồ Mặt Bằng Tầng", subtitle: "Sơ đồ đỗ xe 2D trực quan. Click chọn ô đỗ để kiểm tra thông tin chi tiết hoặc cập nhật trạng thái." },
            evcharging: { title: "Hệ Thống Trạm Sạc EV", subtitle: "Quản lý cổng sạc xe điện thông minh, giám sát công suất sạc hiện thời và chỉ số môi trường." },
            gatecontrol: { title: "Kiểm Soát Check-in / Check-out", subtitle: "Trình giả lập camera nhận dạng biển số xe (ANPR), tự động kiểm soát barrier và thanh toán xe ra trực quan." },
            analytics: { title: "Báo Cáo Phân Tích & Thống Kê", subtitle: "Biểu đồ trực quan hóa dữ liệu lấp đầy bãi đỗ, phân bổ dòng xe và doanh thu định kỳ." },
            settings: { title: "Thiết Lập Biểu Phí", subtitle: "Cấu hình đơn giá giữ xe theo giờ cho từng loại phương tiện và quản lý hệ thống." },
            users: { title: "Quản Lý Tài Khoản Khách Gửi", subtitle: "Danh sách tài khoản Driver đã đăng ký trên hệ thống bãi đỗ." }
        };
        
        navItems.forEach(item => {
            item.addEventListener("click", () => {
                const targetTab = item.getAttribute("data-tab");
                if (!targetTab) return;
                
                activeTab = targetTab;
                
                // Cập nhật trạng thái class hoạt động trên Sidebar
                navItems.forEach(nav => nav.classList.remove("active"));
                item.classList.add("active");
                
                // Chuyển đổi màn hình panel tương ứng
                tabPanels.forEach(panel => panel.classList.remove("active"));
                const targetPanel = document.getElementById(`tab-${activeTab}`);
                if (targetPanel) targetPanel.classList.add("active");
                
                // Cập nhật nội dung tiêu đề Header chính
                if (viewMeta[activeTab]) {
                    viewTitle.textContent = viewMeta[activeTab].title;
                    viewSubtitle.textContent = viewMeta[activeTab].subtitle;
                }
                
                // Kích hoạt render lại dữ liệu cho tab được chọn
                if (activeTab === "dashboard") {
                    renderDashboard();
                } else if (activeTab === "floormap") {
                    renderFloorMap(activeFloorId);
                } else if (activeTab === "evcharging") {
                    renderEVStations();
                } else if (activeTab === "analytics") {
                    renderAnalytics();
                } else if (activeTab === "gatecontrol") {
                    updateGateDropdowns();
                } else if (activeTab === "users") {
                    renderUsersTable();
                }
            });
        });

        // Thiết lập liên kết nhanh từ danh sách tầng tại Dashboard sang Sơ đồ tầng
        document.getElementById("dashboard-floors-list").addEventListener("click", (e) => {
            const card = e.target.closest(".floor-summary-card");
            if (card) {
                const fid = card.getAttribute("data-floor-id");
                activeFloorId = fid;
                const mapNavItem = document.querySelector('.nav-item[data-tab="floormap"]');
                if (mapNavItem) mapNavItem.click();
            }
        });
        
        // Bộ lọc tài khoản cho Admin (Staff vs Driver)
        const btnFilterUsersDriver = document.getElementById("btn-filter-users-driver");
        const btnFilterUsersStaff = document.getElementById("btn-filter-users-staff");
        
        if (btnFilterUsersDriver && btnFilterUsersStaff) {
            const handleFilterClick = (activeBtn, inactiveBtn) => {
                activeBtn.classList.add("active");
                activeBtn.style.background = "rgba(0, 243, 255, 0.1)";
                activeBtn.style.borderColor = "var(--accent-color)";
                activeBtn.style.color = "var(--accent-color)";
                
                inactiveBtn.classList.remove("active");
                inactiveBtn.style.background = "rgba(255, 255, 255, 0.02)";
                inactiveBtn.style.borderColor = "var(--border-color)";
                inactiveBtn.style.color = "var(--text-secondary)";
                
                renderUsersTable();
            };

            btnFilterUsersDriver.addEventListener("click", () => {
                handleFilterClick(btnFilterUsersDriver, btnFilterUsersStaff);
            });
            
            btnFilterUsersStaff.addEventListener("click", () => {
                handleFilterClick(btnFilterUsersStaff, btnFilterUsersDriver);
            });
        }

        // Bộ lọc tìm kiếm nhanh người dùng
        const searchUsersInput = document.getElementById("input-search-users");
        const btnClearSearchUsers = document.getElementById("btn-clear-search-users");
        
        if (searchUsersInput) {
            searchUsersInput.addEventListener("input", () => {
                renderUsersTable();
            });
        }
        
        if (btnClearSearchUsers && searchUsersInput) {
            btnClearSearchUsers.addEventListener("click", () => {
                searchUsersInput.value = "";
                renderUsersTable();
            });
        }

        // Sự kiện vẽ lại biểu đồ khi thay đổi kích thước cửa sổ
        window.addEventListener("pbms-resize-charts", () => {
            if (activeTab === "analytics") {
                renderAnalytics();
            }
        });
    }

    // Đồng hồ số
    function updateClock() {
        const timeEl = document.getElementById("current-time");
        if (timeEl) {
            const now = new Date();
            const suffix = now.getHours() < 12 ? ' SA' : ' CH';
            timeEl.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + suffix;
        }
    }

    // Ghi log vào giao diện Terminal
    function logToTerminal(type, message) {
        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0];
        
        alertLog.unshift({ type, message, time: timestamp });
        if (alertLog.length > 50) alertLog.pop(); // Giới hạn lịch sử lưu trữ 50 dòng
        
        data.alerts = alertLog; // Đồng bộ vào data
        
        renderTerminalConsole();
    }
    
    // Render khung Terminal trên Dashboard
    function renderTerminalConsole() {
        const consoleEl = document.getElementById("alerts-console");
        if (!consoleEl) return;
        
        consoleEl.innerHTML = alertLog.map(log => `
            <div class="terminal-line ${log.type}">
                <span class="terminal-timestamp">[${log.time}]</span>
                <span class="terminal-body">${log.message}</span>
            </div>
        `).join('');
        
        // Cập nhật số lượng lỗi đang có lên thẻ KPI
        const errCount = alertLog.filter(l => l.type === 'error').length;
        const errKpi = document.getElementById("kpi-err-count");
        if (errKpi) errKpi.textContent = errCount;
    }
    
    document.getElementById("btn-clear-alerts").addEventListener("click", () => {
        alertLog = [];
        logToTerminal("info", "Nhật ký hoạt động đã được xóa bởi người vận hành.");
        window.savePBMSData();
    });

    // ----------------------------------------------------
    // BỘ TÍNH TOÁN CHỈ SỐ HỆ THỐNG
    // ----------------------------------------------------
    function getSystemMetrics() {
        let totalSpots = 0;
        let occupiedSpots = 0;
        let reservedSpots = 0;
        let maintenanceSpots = 0;
        let evTotal = 0;
        let evActive = 0;
        let evLoad = 0;
        
        data.floors.forEach(f => {
            f.slots.forEach(s => {
                totalSpots++;
                if (s.status === "occupied") occupiedSpots++;
                else if (s.status === "reserved") reservedSpots++;
                else if (s.status === "maintenance") maintenanceSpots++;
                
                if (s.zoneType === "ev") {
                    evTotal++;
                    if (s.status === "occupied" && s.vehicle && s.vehicle.evCharging) {
                        evActive++;
                        evLoad += s.vehicle.chargeSpeed || 7.2;
                    }
                }
            });
        });
        
        const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;
        
        return {
            totalSpots,
            occupiedSpots,
            reservedSpots,
            maintenanceSpots,
            availableSpots: totalSpots - occupiedSpots - reservedSpots - maintenanceSpots,
            occupancyRate,
            evTotal,
            evActive,
            evLoad: parseFloat(evLoad.toFixed(1))
        };
    }

    // ----------------------------------------------------
    // VIEW: DASHBOARD CHUNG
    // ----------------------------------------------------
    function renderDashboard() {
        const metrics = getSystemMetrics();
        
        // Cập nhật các thẻ KPI chính
        document.getElementById("kpi-occupancy").textContent = `${metrics.occupancyRate}%`;
        document.getElementById("kpi-occupancy-bar").style.width = `${metrics.occupancyRate}%`;
        document.getElementById("kpi-occupied-spots").textContent = metrics.occupiedSpots;
        document.getElementById("kpi-total-spots").textContent = metrics.totalSpots;
        
        document.getElementById("kpi-ev-active").textContent = `${metrics.evActive} / ${metrics.evTotal}`;
        document.getElementById("kpi-ev-bar").style.width = `${(metrics.evActive / metrics.evTotal * 100).toFixed(1)}%`;
        document.getElementById("kpi-ev-load").textContent = `Tổng tải: ${metrics.evLoad} kW`;
        
        document.getElementById("kpi-revenue").textContent = `${totalRevenue.toLocaleString('vi-VN')}đ`;
        
        // Cập nhật số cổng sạc EV đang hoạt động lên huy hiệu Sidebar
        const badge = document.getElementById("ev-charging-badge");
        if (badge) {
            badge.textContent = metrics.evActive;
            if (metrics.evActive > 0) badge.classList.add("active-charging");
            else badge.classList.remove("active-charging");
        }
        
        // Render danh sách tóm tắt trạng thái từng tầng
        const listEl = document.getElementById("dashboard-floors-list");
        if (listEl) {
            listEl.innerHTML = data.floors.map(floor => {
                let fTotal = floor.slots.length;
                let fOccupied = floor.slots.filter(s => s.status === 'occupied').length;
                let fAvail = floor.slots.filter(s => s.status === 'available').length;
                let fPct = fTotal > 0 ? Math.round((fOccupied / fTotal) * 100) : 0;
                
                return `
                    <div class="floor-summary-card" data-floor-id="${floor.id}">
                        <div class="floor-summary-meta">
                            <h4>${floor.name}</h4>
                            <span>${floor.description}</span>
                        </div>
                        <div class="floor-summary-spots">
                            <div class="spots-count-box occupied-spots">
                                <span>${fOccupied}</span>
                                <span>Đang đỗ</span>
                            </div>
                            <div class="spots-count-box available-spots">
                                <span>${fAvail}</span>
                                <span>Còn trống</span>
                            </div>
                            <div class="spots-count-box">
                                <span>${fTotal}</span>
                                <span>Tổng cộng</span>
                            </div>
                        </div>
                        <div class="floor-summary-radial">
                            <div class="progress-bar-container" style="width: 80px; height: 6px;">
                                <div class="progress-bar-fill cyan-glow" style="width: ${fPct}%; background-color: ${fPct > 85 ? 'var(--color-error)' : 'var(--accent-color)'};"></div>
                            </div>
                            <span class="occupancy-percent-text">${fPct}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Render bảng nhật ký
        renderTerminalConsole();
    }

    // ----------------------------------------------------
    // VIEW: SƠ ĐỒ MẶT BẰNG TẦNG
    // ----------------------------------------------------
    function renderFloorSelector() {
        const container = document.getElementById("floor-buttons-container");
        if (!container) return;
        
        container.innerHTML = data.floors.map(floor => `
            <button class="floor-btn ${floor.id === activeFloorId ? 'active' : ''}" data-floor-id="${floor.id}">
                ${floor.id}
            </button>
        `).join('');
        
        // Gắn sự kiện click chọn tầng
        container.querySelectorAll(".floor-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                container.querySelectorAll(".floor-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                activeFloorId = btn.getAttribute("data-floor-id");
                selectedSlotId = null;
                renderFloorMap(activeFloorId);
                resetInspector();
            });
        });
    }

    function renderFloorMap(floorId) {
        const floor = data.floors.find(f => f.id === floorId);
        const mapContainer = document.getElementById("interactive-floor-map");
        if (!floor || !mapContainer) return;
        
        // Cập nhật tiêu đề hiển thị tầng hiện tại
        document.getElementById("current-floor-title").textContent = floor.name;
        document.getElementById("current-floor-desc").textContent = floor.description;
        
        const fTotal = floor.slots.length;
        const fOccupied = floor.slots.filter(s => s.status === 'occupied').length;
        const fPct = fTotal > 0 ? Math.round((fOccupied / fTotal) * 100) : 0;
        document.getElementById("floor-occupancy-pct").textContent = `${fPct}% Đã lấp đầy`;
        
        // Vẽ cấu trúc Grid CSS
        const layout = floor.layout;
        // Bảo vệ: nếu layout chưa có dữ liệu (rows/cols/driveways), hiển thị thông báo
        if (!layout || !layout.cols || !layout.rows) {
            mapContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">Sơ đồ tầng chưa được cấu hình. Vui lòng kiểm tra dữ liệu máy chủ.</div>';
            return;
        }
        mapContainer.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
        mapContainer.innerHTML = "";
        
        const driveways = layout.driveways || [];
        // Duyệt theo các tọa độ lưới hàng và cột
        for (let r = 0; r < layout.rows; r++) {
            // Kiểm tra hàng đi nội bộ (Driveway)
            if (driveways.includes(r)) {
                const driveway = document.createElement("div");
                driveway.className = "driveway-row";
                driveway.style.gridColumn = `1 / span ${layout.cols}`;
                driveway.innerHTML = `
                    <div class="driveway-arrow"><i data-lucide="chevrons-left"></i> LỐI ĐI NỘI BỘ</div>
                    <div>ĐI CHẬM - CHÚ Ý QUAN SÁT</div>
                    <div class="driveway-arrow">LỐI ĐI NỘI BỘ <i data-lucide="chevrons-left"></i></div>
                `;
                mapContainer.appendChild(driveway);
                continue;
            }
            
            // Vẽ các ô đỗ trên hàng
            for (let c = 0; c < layout.cols; c++) {
                const slot = floor.slots.find(s => s.row === r && s.col === c);
                
                if (slot) {
                    const spotEl = document.createElement("div");
                    spotEl.className = `parking-spot state-${slot.status} ${slot.zoneType}-spot`;
                    spotEl.setAttribute("data-slot-id", slot.id);
                    
                    if (slot.id === selectedSlotId) {
                        spotEl.classList.add("active-selection");
                    }
                    
                    // Thể hiện thông tin xe hoặc pin sạc nếu ô đang đỗ
                    let detailsHtml = "";
                    let isEVCharging = slot.zoneType === 'ev' && slot.status === 'occupied' && slot.vehicle && slot.vehicle.evCharging;
                    
                    if (slot.status === "occupied" && slot.vehicle) {
                        detailsHtml = `<span class="spot-plate-text">${slot.vehicle.plate}</span>`;
                        if (isEVCharging) {
                            spotEl.classList.add("charging-active");
                            detailsHtml += `
                                <div class="ev-pulse-dot"></div>
                                <div class="spot-charging-overlay" style="width: ${slot.vehicle.chargeProgress}%"></div>
                            `;
                        }
                    }
                    
                    // Xác định icon hiển thị
                    let catIcon = "car";
                    if (slot.zoneType === "motorbike") catIcon = "bike";
                    else if (slot.zoneType === "ev") catIcon = "zap";
                    else if (slot.zoneType === "handicap") catIcon = "accessibility";
                    else if (slot.zoneType === "suv") catIcon = "car-front";
                    
                    spotEl.innerHTML = `
                        <div class="spot-header-num">${slot.id}</div>
                        ${detailsHtml}
                        <div class="spot-icon-indicator" title="${data.vehicleTypes[slot.zoneType]}">
                            <i data-lucide="${catIcon}"></i>
                        </div>
                    `;
                    
                    spotEl.addEventListener("click", () => {
                        mapContainer.querySelectorAll(".parking-spot").forEach(s => s.classList.remove("active-selection"));
                        spotEl.classList.add("active-selection");
                        
                        selectedSlotId = slot.id;
                        inspectSpot(slot);
                    });
                    
                    mapContainer.appendChild(spotEl);
                } else {
                    // Ô đệm trống nội khu
                    const spacer = document.createElement("div");
                    spacer.className = "map-spacer-cell";
                    mapContainer.appendChild(spacer);
                }
            }
        }
        lucide.createIcons();
    }

    // ----------------------------------------------------
    // VIEW: BẢNG GIÁM SÁT Ô ĐỖ (SPOT INSPECTOR)
    // ----------------------------------------------------
    function resetInspector() {
        const container = document.getElementById("spot-inspector-content");
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-inspector-state">
                <i data-lucide="mouse-pointer-click"></i>
                <p>Vui lòng chọn bất kỳ ô đỗ nào trên sơ đồ để kiểm tra chi tiết thông tin và thực hiện các thao tác quản lý.</p>
            </div>
        `;
        lucide.createIcons();
    }

    function inspectSpot(slot) {
        const container = document.getElementById("spot-inspector-content");
        if (!container) return;
        
        let detailsHtml = "";
        let actionButtons = "";
        
        if (slot.status === "occupied" && slot.vehicle) {
            // Tính toán thời gian đỗ xe tạm tính và số tiền
            let elapsedStr = "Không khả dụng";
            let costStr = "0đ";
            if (slot.vehicle.checkInRaw) {
                const checkInDate = new Date(slot.vehicle.checkInRaw);
                const diffMs = new Date() - checkInDate;
                const diffHrs = Math.max(0.5, diffMs / (1000 * 60 * 60)); // Tối thiểu tính phí 30 phút
                
                const hrs = Math.floor(diffHrs);
                const mins = Math.floor((diffHrs - hrs) * 60);
                elapsedStr = `${hrs} giờ ${mins} phút`;
                
                const baseRate = data.rates[slot.zoneType] || 20000;
                let baseCost = diffHrs * baseRate;
                let surcharge = 0;
                if (slot.vehicle.evCharging) {
                    surcharge = diffHrs * data.rates.evChargingSurcharge;
                }
                costStr = `${Math.round(baseCost + surcharge).toLocaleString('vi-VN')} VND`;
            }
            
            let evChargeSection = "";
            if (slot.zoneType === "ev" && slot.vehicle.evCharging) {
                evChargeSection = `
                    <div class="ev-inspector-battery">
                        <div class="battery-header">
                            <span>Trạng thái sạc nhanh EV</span>
                            <span>${slot.vehicle.chargeProgress}%</span>
                        </div>
                        <div class="battery-progress-bar">
                            <div class="battery-progress-fill" style="width: ${slot.vehicle.chargeProgress}%"></div>
                        </div>
                        <div class="info-row">
                            <span>Công suất sạc</span>
                            <span>${slot.vehicle.chargeSpeed || 7.2} kW</span>
                        </div>
                    </div>
                `;
            }
            
            detailsHtml = `
                <div class="info-rows-container">
                    <div class="info-row">
                        <span>Biển kiểm soát</span>
                        <span class="plate-badge">${slot.vehicle.plate}</span>
                    </div>
                    <div class="info-row">
                        <span>Loại phương tiện</span>
                        <span>${data.vehicleTypes[slot.vehicle.type]}</span>
                    </div>
                    <div class="info-row">
                        <span>Ngày vào</span>
                        <span>${slot.vehicle.checkInDate}</span>
                    </div>
                    <div class="info-row">
                        <span>Giờ vào</span>
                        <span>${slot.vehicle.checkInTime}</span>
                    </div>
                    <div class="info-row">
                        <span>Thời gian đã đỗ</span>
                        <span>${elapsedStr}</span>
                    </div>
                    <div class="info-row">
                        <span>Chi phí tạm tính</span>
                        <span class="text-success font-bold">${costStr}</span>
                    </div>
                </div>
                ${evChargeSection}
            `;
            
            actionButtons = `
                <button class="btn-primary" id="btn-inspect-checkout"><i data-lucide="receipt"></i> Lập Hóa Đơn & Cho Xe Ra</button>
            `;
        } else if (slot.status === "reserved") {
            detailsHtml = `
                <div class="info-rows-container">
                    <div class="info-row">
                        <span>Trạng thái</span>
                        <span class="text-warning">Đã đặt trước (Bảo lưu)</span>
                    </div>
                    <div class="info-row">
                        <span>Phân loại ô đỗ</span>
                        <span>${data.vehicleTypes[slot.zoneType]}</span>
                    </div>
                </div>
            `;
            actionButtons = `
                <button class="btn-secondary" id="btn-inspect-free"><i data-lucide="unlock"></i> Hủy Đặt Chỗ</button>
            `;
        } else if (slot.status === "maintenance") {
            detailsHtml = `
                <div class="info-rows-container">
                    <div class="info-row">
                        <span>Trạng thái</span>
                        <span class="text-muted">Đang bảo trì</span>
                    </div>
                    <div class="info-row">
                        <span>Lý do</span>
                        <span>Vệ sinh / Cân chỉnh lại thiết bị sạc</span>
                    </div>
                </div>
            `;
            actionButtons = `
                <button class="btn-success btn-secondary" id="btn-inspect-free"><i data-lucide="check-circle-2"></i> Đánh Dấu Hoàn Thành Bảo Trì</button>
            `;
        } else {
            // Ô trống khả dụng
            detailsHtml = `
                <div class="info-rows-container">
                    <div class="info-row">
                        <span>Trạng thái</span>
                        <span class="text-success">Trống khả dụng</span>
                    </div>
                    <div class="info-row">
                        <span>Phân loại ô đỗ</span>
                        <span>${data.vehicleTypes[slot.zoneType]}</span>
                    </div>
                    <div class="info-row">
                        <span>Giá giữ xe theo giờ</span>
                        <span>${data.rates[slot.zoneType].toLocaleString('vi-VN')} VND/giờ</span>
                    </div>
                </div>
            `;
            actionButtons = `
                <button class="btn-primary" id="btn-inspect-reserve"><i data-lucide="bookmark"></i> Đặt Trước Ô Này</button>
                <button class="btn-secondary" id="btn-inspect-maintenance"><i data-lucide="wrench"></i> Đánh Dấu Cần Bảo Trì</button>
            `;
        }
        
        container.innerHTML = `
            <div class="inspector-details">
                <div class="inspector-spot-header">
                    <div class="inspector-spot-id">${slot.id}</div>
                    <div class="inspector-spot-badge ${slot.status}">${slot.status === 'available' ? 'Trống' : slot.status === 'occupied' ? 'Đang đỗ xe' : slot.status === 'reserved' ? 'Đặt trước' : 'Bảo trì'}</div>
                </div>
                ${detailsHtml}
                <div class="inspector-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
        lucide.createIcons();
        
        // Gán sự kiện click nút bấm
        const btnCheckout = document.getElementById("btn-inspect-checkout");
        if (btnCheckout) {
            btnCheckout.addEventListener("click", () => {
                // Di chuyển sang màn hình Check-in/Check-out và tự động chọn xe
                const gateNavItem = document.querySelector('.nav-item[data-tab="gatecontrol"]');
                if (gateNavItem) {
                    checkoutActiveFloorId = slot.id.split('-')[0];
                    gateNavItem.click();
                    setTimeout(() => {
                        const checkoutSearch = document.getElementById("checkout-search");
                        if (checkoutSearch) {
                            checkoutSearch.value = slot.id;
                            renderCheckoutFloorSelector();
                            renderCheckoutMap(checkoutActiveFloorId);
                            checkoutSearch.dispatchEvent(new Event("change"));
                        }
                    }, 50);
                }
            });
        }
        
        const btnFree = document.getElementById("btn-inspect-free");
        if (btnFree) {
            btnFree.addEventListener("click", () => {
                slot.status = "available";
                slot.vehicle = null;
                logToTerminal("info", `Reset ô đỗ ${slot.id} về trạng thái trống khả dụng.`);
                window.savePBMSData();
                renderFloorMap(activeFloorId);
                inspectSpot(slot);
            });
        }
        
        const btnReserve = document.getElementById("btn-inspect-reserve");
        if (btnReserve) {
            btnReserve.addEventListener("click", () => {
                slot.status = "reserved";
                slot.vehicle = { plate: "ĐÃ ĐẶT CHỖ", type: slot.zoneType, checkInDate: "-", checkInTime: "Đã đặt trước" };
                logToTerminal("info", `Đã lưu cấu hình đặt trước cho ô đỗ ${slot.id}.`);
                window.savePBMSData();
                renderFloorMap(activeFloorId);
                inspectSpot(slot);
            });
        }
        
        const btnMaint = document.getElementById("btn-inspect-maintenance");
        if (btnMaint) {
            btnMaint.addEventListener("click", () => {
                slot.status = "maintenance";
                slot.vehicle = null;
                logToTerminal("warning", `Đã treo biển cảnh báo bảo trì cho ô đỗ ${slot.id}.`);
                window.savePBMSData();
                renderFloorMap(activeFloorId);
                inspectSpot(slot);
            });
        }
    }

    // ----------------------------------------------------
    // VIEW: HỆ THỐNG TRẠM SẠC EV
    // ----------------------------------------------------
    function renderEVStations() {
        const metrics = getSystemMetrics();
        
        // Cập nhật thông số chung
        document.getElementById("ev-total-load").textContent = `${metrics.evLoad} kW`;
        document.getElementById("ev-avail-count").textContent = `${metrics.evTotal - metrics.evActive} / ${metrics.evTotal}`;
        
        const gridEl = document.getElementById("ev-chargers-status-grid");
        if (!gridEl) return;
        
        // Lọc danh sách cổng sạc xe điện EV của tất cả các tầng
        const evSpots = [];
        data.floors.forEach(f => {
            f.slots.forEach(s => {
                if (s.zoneType === "ev") {
                    evSpots.push({ floorName: f.name, slot: s });
                }
            });
        });
        
        gridEl.innerHTML = evSpots.map(item => {
            const slot = item.slot;
            let statusText = "Chờ sạc";
            let statusClass = "idle";
            let bodyHtml = `<span style="font-size: 11px; color: var(--text-muted);">Sẵn sàng sạc xe điện</span>`;
            
            if (slot.status === "occupied" && slot.vehicle) {
                statusText = slot.vehicle.evCharging ? "Đang sạc" : "Kết nối (Chờ sạc)";
                statusClass = slot.vehicle.evCharging ? "charging" : "idle";
                
                bodyHtml = `
                    <span>Biển số: <strong>${slot.vehicle.plate}</strong></span>
                    <span>Cốc sạc: <strong>${slot.vehicle.chargeSpeed || 0} kW</strong></span>
                    <span>Tiến trình sạc pin:</span>
                    <div class="battery-progress-bar">
                        <div class="battery-progress-fill" style="width: ${slot.vehicle.chargeProgress || 0}%"></div>
                    </div>
                    <span style="font-size: 10px; align-self: flex-end;">Đã nạp ${slot.vehicle.chargeProgress || 0}%</span>
                `;
            } else if (slot.status === "maintenance") {
                statusText = "Lỗi / Đang sửa";
                statusClass = "fault";
                bodyHtml = `<span style="color: var(--color-error); font-weight: 600;">Mất kết nối vật lý - Đang kiểm tra</span>`;
            } else if (slot.status === "reserved") {
                statusText = "Đặt trước";
                statusClass = "idle";
                bodyHtml = `<span>Đã được gán mã bảo lưu sạc</span>`;
            }
            
            return `
                <div class="ev-charger-node">
                    <div class="ev-node-header">
                        <div class="ev-node-id">${slot.id} <span style="font-size: 10px; color: var(--text-secondary); font-weight: 500;">(${item.floorName})</span></div>
                        <span class="ev-status-pill ${statusClass}">${statusText}</span>
                    </div>
                    <div class="ev-node-body">
                        ${bodyHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ----------------------------------------------------
    // VIEW: GIẢ LẬP CỔNG VÀO / RA
    // ----------------------------------------------------
    function initGateSimulator() {
        const formCheckin = document.getElementById("form-gate-checkin");
        const formCheckout = document.getElementById("form-gate-checkout");
        const plateInput = document.getElementById("checkin-plate");
        const btnScan = document.getElementById("btn-scan-random");
        const checkoutSearch = document.getElementById("checkout-search");
        
        // Mô phỏng camera nhận dạng ngẫu nhiên biển số
        btnScan.addEventListener("click", () => {
            const cityCodes = ["30A", "30E", "30F", "30H", "30K", "29A", "29C", "29D", "51G", "51H", "51K", "43A", "43B", "75A"];
            const code = cityCodes[Math.floor(Math.random() * cityCodes.length)];
            const num = Math.floor(Math.random() * 90000 + 10000).toString();
            const plate = `${code}-${num.substring(0, 3)}.${num.substring(3)}`;
            
            const ocrPlate = document.getElementById("entry-ocr-plate");
            const ocrBox = document.getElementById("entry-ocr-box");
            
            ocrPlate.textContent = "ĐANG QUÉT...";
            ocrBox.style.borderColor = "var(--color-warning)";
            
            setTimeout(() => {
                plateInput.value = plate;
                ocrPlate.textContent = plate;
                ocrBox.style.borderColor = "var(--color-success)";
                logToTerminal("info", `Camera Cổng A nhận diện biển kiểm soát: ${plate} thành công.`);
            }, 1000);
        });
        
        // Xử lý gửi đăng ký xe vào bãi
        formCheckin.addEventListener("submit", (e) => {
            e.preventDefault();
            const plate = plateInput.value.trim().toUpperCase();
            const category = document.getElementById("checkin-type").value;
            const msgBox = document.getElementById("checkin-response-log");
            
            if (!plate) return;
            
            // Kiểm tra trùng biển số xe đang đỗ trong bãi
            let isDuplicate = false;
            let duplicateSlotId = "";
            for (let f of data.floors) {
                const dup = f.slots.find(s => s.status === 'occupied' && s.vehicle && s.vehicle.plate === plate);
                if (dup) {
                    isDuplicate = true;
                    duplicateSlotId = dup.id;
                    break;
                }
            }
            if (isDuplicate) {
                msgBox.className = "response-message-box error";
                msgBox.textContent = `Lỗi: Xe mang biển số ${plate} đã tồn tại trong bãi (vị trí ${duplicateSlotId}).`;
                logToTerminal("error", `Cổng từ chối xe vào: Biển số ${plate} bị trùng lặp với xe đang đỗ tại ô ${duplicateSlotId}.`);
                return;
            }
            
            let targetSlot = null;
            
            // Bước 1: Tìm ô đỗ trống thuộc phân loại xe đăng ký
            for (let f of data.floors) {
                targetSlot = f.slots.find(s => s.status === 'available' && s.zoneType === category);
                if (targetSlot) break;
            }
            
            // Bước 2: Dự phòng nếu hết: chuyển hướng sang ô đỗ tiêu chuẩn 'car'
            if (!targetSlot && category !== 'car') {
                for (let f of data.floors) {
                    targetSlot = f.slots.find(s => s.status === 'available' && s.zoneType === 'car');
                    if (targetSlot) break;
                }
            }
            
            // Bước 3: Dự phòng cuối cùng: Cấp bất kỳ ô trống nào còn lại
            if (!targetSlot) {
                for (let f of data.floors) {
                    targetSlot = f.slots.find(s => s.status === 'available');
                    if (targetSlot) break;
                }
            }
            
            if (!targetSlot) {
                msgBox.className = "response-message-box error";
                msgBox.textContent = `Không thể nhận xe: Bãi đỗ xe đã đầy toàn bộ các khu vực.`;
                logToTerminal("error", `Cổng từ chối xe vào: Không còn ô trống khả dụng cho loại xe ${data.vehicleTypes[category]}.`);
                return;
            }
            
            // Đăng ký phương tiện vào ô đỗ
            const now = new Date();
            targetSlot.status = "occupied";
            targetSlot.vehicle = {
                plate: plate,
                type: category,
                checkInDate: now.toLocaleDateString('vi-VN'),
                checkInTime: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                checkInRaw: now.toISOString(),
                evCharging: category === 'ev', // Tự động cắm sạc nếu là ô tô điện
                chargeProgress: category === 'ev' ? 5 : null,
                chargeSpeed: category === 'ev' ? 22 : null
            };
            
            // Kích hoạt cổng mở barrier
            const barrierBadge = document.querySelector(".gate-card:first-child .gate-status");
            barrierBadge.textContent = "BARRIER ĐANG MỞ";
            barrierBadge.className = "badge gate-status gate-open";
            
            msgBox.className = "response-message-box success";
            msgBox.textContent = `ĐĂNG KÝ THÀNH CÔNG! Vị trí đỗ cấp phát: ${targetSlot.id}. Vui lòng di chuyển theo bảng LED hướng dẫn nội khu.`;
            logToTerminal("success", `Xe ${plate} (${data.vehicleTypes[category]}) đã đăng ký đỗ tại ô ${targetSlot.id}.`);
            
            // Đồng bộ qua localStorage
            window.savePBMSData();
            
            // Reset dữ liệu form nhập
            plateInput.value = "";
            document.getElementById("entry-ocr-plate").textContent = "QUÉT BIỂN SỐ ANPR";
            document.getElementById("entry-ocr-box").style.borderColor = "var(--accent-color)";
            
            // Đóng barrier lại sau 3 giây
            setTimeout(() => {
                barrierBadge.textContent = "Thanh Chắn Đóng";
                barrierBadge.className = "badge gate-status online";
            }, 3000);
            
            updateGateDropdowns();
        });
        
        // Sự kiện đổi biển số xe ra bãi -> Tải hóa đơn thanh toán
        checkoutSearch.addEventListener("change", () => {
            const slotId = checkoutSearch.value;
            const billingSummary = document.getElementById("billing-summary");
            const btnSubmit = document.getElementById("btn-gate-checkout-submit");
            const ocrPlate = document.getElementById("exit-ocr-plate");
            const ocrBox = document.getElementById("exit-ocr-box");
            
            if (!slotId) {
                billingSummary.classList.add("hidden");
                btnSubmit.disabled = true;
                ocrPlate.textContent = "QUÉT BIỂN SỐ ANPR";
                ocrBox.style.borderColor = "var(--accent-color)";
                return;
            }
            
            // Tìm ô đỗ
            let targetSlot = null;
            data.floors.forEach(f => {
                const s = f.slots.find(x => x.id === slotId);
                if (s) targetSlot = s;
            });
            
            if (!targetSlot || !targetSlot.vehicle) return;
            
            // Quét OCR camera ra bãi
            ocrPlate.textContent = "ĐANG QUÉT...";
            ocrBox.style.borderColor = "var(--color-warning)";
            
            setTimeout(() => {
                ocrPlate.textContent = targetSlot.vehicle.plate;
                ocrBox.style.borderColor = "var(--color-success)";
                logToTerminal("info", `Camera Cổng B nhận dạng thành công xe biển số: ${targetSlot.vehicle.plate} ở lối ra.`);
            }, 800);
            
            // Tính phí hóa đơn thanh toán
            const checkIn = new Date(targetSlot.vehicle.checkInRaw);
            const checkOut = new Date();
            const diffMs = checkOut - checkIn;
            const diffHrs = Math.max(0.5, diffMs / (1000 * 60 * 60)); // Tối thiểu tính phí 30 phút
            
            const hrs = Math.floor(diffHrs);
            const mins = Math.floor((diffHrs - hrs) * 60);
            const durationStr = `${hrs} giờ, ${mins} phút`;
            
            const baseRate = data.rates[targetSlot.vehicle.type] || 20000;
            const baseFee = diffHrs * baseRate;
            
            let surcharge = 0;
            const evSurchargeRow = document.getElementById("bill-ev-surcharge-row");
            
            if (targetSlot.vehicle.evCharging) {
                surcharge = diffHrs * data.rates.evChargingSurcharge;
                evSurchargeRow.classList.remove("hidden");
                document.getElementById("bill-ev-surcharge").textContent = `${Math.round(surcharge).toLocaleString('vi-VN')} VND`;
            } else {
                evSurchargeRow.classList.add("hidden");
            }
            
            const totalFee = baseFee + surcharge;
            
            // Cập nhật thông số hóa đơn hiển thị
            document.getElementById("bill-slot").textContent = targetSlot.id;
            document.getElementById("bill-plate").textContent = targetSlot.vehicle.plate;
            document.getElementById("bill-checkin").textContent = `${targetSlot.vehicle.checkInDate} ${targetSlot.vehicle.checkInTime}`;
            document.getElementById("bill-checkout").textContent = `${checkOut.toLocaleDateString('vi-VN')} ${checkOut.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
            document.getElementById("bill-duration").textContent = durationStr;
            document.getElementById("bill-base").textContent = `${Math.round(baseFee).toLocaleString('vi-VN')} VND`;
            document.getElementById("bill-total").textContent = `${Math.round(totalFee).toLocaleString('vi-VN')} VND`;
            
            // Hiện hóa đơn và mở khóa nút checkout
            billingSummary.classList.remove("hidden");
            btnSubmit.disabled = false;
        });
        
        // Gửi xác nhận thanh toán ra bãi
        formCheckout.addEventListener("submit", (e) => {
            e.preventDefault();
            const slotId = checkoutSearch.value;
            const msgBox = document.getElementById("checkout-response-log");
            
            if (!slotId) return;
            
            // Tìm ô đỗ
            let targetSlot = null;
            data.floors.forEach(f => {
                const s = f.slots.find(x => x.id === slotId);
                if (s) targetSlot = s;
            });
            
            if (!targetSlot || !targetSlot.vehicle) return;
            
            // Tính doanh thu thực tế
            const checkIn = new Date(targetSlot.vehicle.checkInRaw);
            const diffMs = new Date() - checkIn;
            const diffHrs = Math.max(0.5, diffMs / (1000 * 60 * 60));
            
            const baseRate = data.rates[targetSlot.vehicle.type] || 20000;
            const baseFee = diffHrs * baseRate;
            const surcharge = targetSlot.vehicle.evCharging ? diffHrs * data.rates.evChargingSurcharge : 0;
            const totalFee = Math.round(baseFee + surcharge);
            
            totalRevenue += totalFee;
            data.revenue = totalRevenue; // Đồng bộ doanh thu
            
            // Mở barrier cho xe qua
            const barrierBadge = document.querySelector(".gate-card:last-child .gate-status");
            barrierBadge.textContent = "BARRIER ĐANG MỞ";
            barrierBadge.className = "badge gate-status gate-open";
            
            msgBox.className = "response-message-box success";
            msgBox.textContent = `THANH TOÁN THÀNH CÔNG: ${totalFee.toLocaleString('vi-VN')} VND. Cổng đã mở, xe ${targetSlot.vehicle.plate} được phép di chuyển ra bãi.`;
            logToTerminal("success", `Xe ${targetSlot.vehicle.plate} thanh toán phí đỗ tại ${targetSlot.id} thành công. Doanh thu bãi tăng ${totalFee.toLocaleString('vi-VN')} VND.`);
            
            // Giải phóng ô đỗ
            targetSlot.status = "available";
            targetSlot.vehicle = null;
            
            // Đồng bộ qua localStorage
            window.savePBMSData();
            
            // Reset giao diện thu ngân
            document.getElementById("billing-summary").classList.add("hidden");
            document.getElementById("btn-gate-checkout-submit").disabled = true;
            document.getElementById("exit-ocr-plate").textContent = "QUÉT BIỂN SỐ ANPR";
            document.getElementById("exit-ocr-box").style.borderColor = "var(--accent-color)";
            
            setTimeout(() => {
                barrierBadge.textContent = "Thanh Chắn Đóng";
                barrierBadge.className = "badge gate-status online";
            }, 3000);
            
            updateGateDropdowns();
        });
    }
    
    // Render bộ chọn tầng cổng ra (checkout floor selector)
    function renderCheckoutFloorSelector() {
        const container = document.getElementById("checkout-floor-buttons");
        if (!container) return;
        
        container.innerHTML = data.floors.map(floor => `
            <button type="button" class="checkout-floor-btn ${floor.id === checkoutActiveFloorId ? 'active' : ''}" data-floor-id="${floor.id}">
                ${floor.id}
            </button>
        `).join('');
        
        container.querySelectorAll(".checkout-floor-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                container.querySelectorAll(".checkout-floor-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                checkoutActiveFloorId = btn.getAttribute("data-floor-id");
                renderCheckoutMap(checkoutActiveFloorId);
            });
        });
    }

    // Render sơ đồ mặt bằng mini cho Cổng B (checkout mini-map)
    function renderCheckoutMap(floorId) {
        const floor = data.floors.find(f => f.id === floorId);
        const mapContainer = document.getElementById("checkout-map-grid");
        if (!floor || !mapContainer) return;
        
        // Vẽ cấu trúc Grid CSS
        const layout = floor.layout;
        // Bảo vệ: nếu layout chưa có dữ liệu, bỏ qua render
        if (!layout || !layout.cols || !layout.rows) {
            mapContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">Sơ đồ chưa sẵn sàng</div>';
            return;
        }
        mapContainer.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
        mapContainer.innerHTML = "";
        
        const checkoutSearch = document.getElementById("checkout-search");
        
        // Tự động kiểm tra và xóa lựa chọn nếu ô đó không còn occupied nữa
        if (checkoutSearch && checkoutSearch.value) {
            const currentSelectedSlotId = checkoutSearch.value;
            let stillOccupied = false;
            data.floors.forEach(f => {
                const s = f.slots.find(x => x.id === currentSelectedSlotId);
                if (s && s.status === 'occupied' && s.vehicle && s.vehicle.plate !== "ĐÃ ĐẶT CHỖ") {
                    stillOccupied = true;
                }
            });
            if (!stillOccupied) {
                checkoutSearch.value = "";
                checkoutSearch.dispatchEvent(new Event("change"));
            }
        }
        
        const currentSelectedId = checkoutSearch ? checkoutSearch.value : "";
        const driveways = layout.driveways || [];
        
        for (let r = 0; r < layout.rows; r++) {
            if (driveways.includes(r)) {
                const driveway = document.createElement("div");
                driveway.className = "checkout-driveway-row";
                driveway.style.gridColumn = `1 / span ${layout.cols}`;
                driveway.innerHTML = `LỐI ĐI`;
                mapContainer.appendChild(driveway);
                continue;
            }
            
            for (let c = 0; c < layout.cols; c++) {
                const slot = floor.slots.find(s => s.row === r && s.col === c);
                
                if (slot) {
                    const spotEl = document.createElement("div");
                    const isOccupied = slot.status === "occupied" && slot.vehicle && slot.vehicle.plate !== "ĐÃ ĐẶT CHỖ";
                    
                    spotEl.className = `checkout-spot ${isOccupied ? 'state-occupied' : ''}`;
                    if (isOccupied && slot.id === currentSelectedId) {
                        spotEl.classList.add("selected");
                    }
                    spotEl.setAttribute("data-slot-id", slot.id);
                    
                    let detailsHtml = "";
                    if (isOccupied && slot.vehicle) {
                        detailsHtml = `<span class="checkout-spot-plate">${slot.vehicle.plate}</span>`;
                    }
                    
                    let catIcon = "car";
                    if (slot.zoneType === "motorbike") catIcon = "bike";
                    else if (slot.zoneType === "ev") catIcon = "zap";
                    else if (slot.zoneType === "handicap") catIcon = "accessibility";
                    else if (slot.zoneType === "suv") catIcon = "car-front";
                    
                    spotEl.innerHTML = `
                        <div class="checkout-spot-num">${slot.id.split('-').pop()}</div>
                        ${detailsHtml}
                        <div class="checkout-spot-icon" title="${data.vehicleTypes[slot.zoneType]}">
                            <i data-lucide="${catIcon}"></i>
                        </div>
                    `;
                    
                    if (isOccupied) {
                        spotEl.addEventListener("click", () => {
                            mapContainer.querySelectorAll(".checkout-spot").forEach(s => s.classList.remove("selected"));
                            spotEl.classList.add("selected");
                            if (checkoutSearch) {
                                checkoutSearch.value = slot.id;
                                checkoutSearch.dispatchEvent(new Event("change"));
                            }
                        });
                    }
                    
                    mapContainer.appendChild(spotEl);
                } else {
                    const spacer = document.createElement("div");
                    spacer.className = "checkout-map-spacer-cell";
                    mapContainer.appendChild(spacer);
                }
            }
        }
        lucide.createIcons();
    }

    // Tải động bộ chọn tầng và sơ đồ checkout mini-map
    function updateGateDropdowns() {
        renderCheckoutFloorSelector();
        renderCheckoutMap(checkoutActiveFloorId);
    }

    // ----------------------------------------------------
    // VIEW: BÁO CÁO PHÂN TÍCH & THỐNG KÊ (ANALYTICS)
    // ----------------------------------------------------
    function renderAnalytics() {
        const metrics = getSystemMetrics();
        
        // Thống kê phân loại xe đỗ thực tế
        let counts = { car: 0, suv: 0, ev: 0, motorbike: 0, handicap: 0 };
        data.floors.forEach(f => {
            f.slots.forEach(s => {
                if (s.status === "occupied" && s.vehicle && counts[s.vehicle.type] !== undefined) {
                    counts[s.vehicle.type]++;
                }
            });
        });
        
        // Dữ liệu vẽ biểu đồ doughnut
        const doughnutData = [
            { type: "car", label: "Ô tô tiêu chuẩn", value: counts.car },
            { type: "suv", label: "SUV / Xe cỡ lớn", value: counts.suv },
            { type: "ev", label: "Xe điện (EV)", value: counts.ev },
            { type: "motorbike", label: "Xe máy", value: counts.motorbike },
            { type: "handicap", label: "Xe ưu tiên / Khuyết tật", value: counts.handicap }
        ].filter(d => d.value > 0);
        
        renderVehicleTypeChart("analytics-vehicle-chart", doughnutData.length > 0 ? doughnutData : [
            { type: "car", label: "Không có xe đang đỗ", value: 0 }
        ]);
        
        // Vẽ biểu đồ xu hướng lấp đầy 12 giờ qua
        const hourlyOccupancyData = [
            { hour: "21h00", value: 45 },
            { hour: "23h00", value: 30 },
            { hour: "01h00", value: 15 },
            { hour: "03h00", value: 10 },
            { hour: "05h00", value: 20 },
            { hour: "07h00", value: 55 },
            { hour: "Hiện tại", value: metrics.occupancyRate }
        ];
        renderOccupancyChart("analytics-occupancy-chart", hourlyOccupancyData);
        
        // Vẽ biểu đồ cột doanh thu 7 ngày gần đây
        const weeklyRevenueData = [
            { day: "Thứ 7", value: 2400000 },
            { day: "Chủ nhật", value: 2900000 },
            { day: "Thứ 2", value: 1500000 },
            { day: "Thứ 3", value: 1800000 },
            { day: "Thứ 4", value: 1600000 },
            { day: "Thứ 5", value: 1900000 },
            { day: "Hôm nay", value: totalRevenue }
        ];
        renderRevenueChart("analytics-revenue-chart", weeklyRevenueData);
        
        // Vẽ bảng báo cáo số liệu phân mảnh theo tầng
        const tableBody = document.getElementById("analytics-table-body");
        if (tableBody) {
            tableBody.innerHTML = data.floors.map(floor => {
                const total = floor.slots.length;
                const occupied = floor.slots.filter(s => s.status === 'occupied').length;
                const reserved = floor.slots.filter(s => s.status === 'reserved').length;
                const maint = floor.slots.filter(s => s.status === 'maintenance').length;
                const avail = total - occupied - reserved - maint;
                const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
                
                return `
                    <tr>
                        <td><strong>${floor.name}</strong></td>
                        <td>${total}</td>
                        <td><span class="text-danger">${occupied}</span></td>
                        <td><span class="text-warning">${reserved}</span></td>
                        <td><span class="text-secondary">${maint}</span></td>
                        <td><span class="text-success">${avail}</span></td>
                        <td><strong>${pct}%</strong></td>
                    </tr>
                `;
            }).join('');
        }
    }

    // ----------------------------------------------------
    // VIEW: CẤU HÌNH BIỂU PHÍ & RESET CƠ SỞ DỮ LIỆU
    // ----------------------------------------------------
    function initSettingsView() {
        const formRates = document.getElementById("form-rates-admin");
        const btnReset = document.getElementById("btn-reset-data");
        const msgBox = document.getElementById("settings-response-log");
        
        // Bảo vệ null: chỉ điền giá trị nếu element tồn tại
        const rateInputs = {
            'rate-car': data.rates.car,
            'rate-suv': data.rates.suv,
            'rate-ev': data.rates.ev,
            'rate-motorbike': data.rates.motorbike,
            'rate-handicap': data.rates.handicap,
            'rate-ev-surcharge': data.rates.evChargingSurcharge
        };
        Object.entries(rateInputs).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });
        
        // Cập nhật biểu phí
        formRates.addEventListener("submit", (e) => {
            e.preventDefault();
            
            data.rates.car = parseInt(document.getElementById("rate-car").value);
            data.rates.suv = parseInt(document.getElementById("rate-suv").value);
            data.rates.ev = parseInt(document.getElementById("rate-ev").value);
            data.rates.motorbike = parseInt(document.getElementById("rate-motorbike").value);
            data.rates.handicap = parseInt(document.getElementById("rate-handicap").value);
            data.rates.evChargingSurcharge = parseInt(document.getElementById("rate-ev-surcharge").value);
            
            msgBox.className = "response-message-box success";
            msgBox.textContent = "Biểu phí đỗ xe đã được lưu và cập nhật thành công. Lượt thanh toán mới sẽ áp dụng biểu giá này.";
            logToTerminal("info", "Biểu phí dịch vụ giữ xe đã được cấu hình lại bởi quản trị viên.");
            
            window.savePBMSData();
            
            setTimeout(() => {
                msgBox.style.display = "none";
            }, 3000);
        });
        
        // Khôi phục cài đặt gốc
        btnReset.addEventListener("click", () => {
            if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn reset toàn bộ cơ sở dữ liệu? Tất cả dữ liệu xe đang đỗ và lượt thanh toán mô phỏng hiện tại sẽ bị xóa hoàn toàn để đưa hệ thống về cấu hình khởi tạo mặc định.")) {
                localStorage.removeItem("pbms_state");
                window.location.reload();
            }
        });
    }

    // ----------------------------------------------------
    // GIẢ LẬP COREG TICK CHU KỲ (SIMULATION)
    // ----------------------------------------------------
    function simulationTick() {
        let telemetryUpdated = false;
        
        // 1. Tăng pin sạc EV
        data.floors.forEach(f => {
            f.slots.forEach(s => {
                if (s.status === "occupied" && s.zoneType === "ev" && s.vehicle && s.vehicle.evCharging) {
                    if (s.vehicle.chargeProgress < 100) {
                        s.vehicle.chargeProgress += Math.floor(Math.random() * 3) + 1;
                        if (s.vehicle.chargeProgress > 100) s.vehicle.chargeProgress = 100;
                        telemetryUpdated = true;
                        
                        if (s.vehicle.chargeProgress === 100 && Math.random() < 0.2) {
                            logToTerminal("success", `Trạm sạc EV thông báo: Phương tiện ${s.vehicle.plate} tại ô đỗ ${s.id} đã hoàn tất sạc pin 100%.`);
                        }
                    }
                }
            });
        });
        

        
        if (telemetryUpdated) {
            window.savePBMSData();
            
            if (activeTab === "dashboard") {
                renderDashboard();
            } else if (activeTab === "floormap") {
                renderFloorMap(activeFloorId);
                if (selectedSlotId) {
                    let insSlot = null;
                    data.floors.forEach(f => {
                        const s = f.slots.find(x => x.id === selectedSlotId);
                        if (s) insSlot = s;
                    });
                    if (insSlot) inspectSpot(insSlot);
                }
            } else if (activeTab === "evcharging") {
                renderEVStations();
            } else if (activeTab === "analytics") {
                renderAnalytics();
            } else if (activeTab === "users") {
                renderUsersTable();
            }
            updateGateDropdowns();
        }
    }

    // Render bảng quản lý tài khoản người gửi (khách hàng)
    function renderUsersTable() {
        const tableBody = document.getElementById("users-table-body");
        if (!tableBody) return;
        
        const currentRole = sessionStorage.getItem("pbms_user_role") || "admin";
        
        const filtersGroup = document.getElementById("users-filters-group");
        if (filtersGroup) {
            filtersGroup.style.display = currentRole === "admin" ? "flex" : "none";
        }
        
        const actionColHeader = document.getElementById("col-users-action");
        if (actionColHeader) {
            actionColHeader.style.display = currentRole === "admin" ? "table-cell" : "none";
        }
        
        let activeFilter = "driver";
        if (currentRole === "admin") {
            const activeFilterBtn = document.querySelector(".btn-filter-user.active");
            if (activeFilterBtn) {
                activeFilter = activeFilterBtn.getAttribute("data-filter") || "driver";
            }
        }
        
        let userList = data.users || [];
        if (currentRole === "admin") {
            userList = userList.filter(u => (u.role || "driver") === activeFilter);
        } else if (currentRole === "staff") {
            userList = userList.filter(u => (u.role || "driver") === "driver" && u.username !== "admin");
        } else {
            userList = [];
        }
        
        // Lọc theo từ khóa tìm kiếm nhanh (Họ tên, tài khoản, SĐT, biển số xe)
        const searchQuery = (document.getElementById("input-search-users")?.value || "").trim().toLowerCase();
        if (searchQuery) {
            userList = userList.filter(u => {
                let parkedPlate = "";
                data.floors.forEach(f => {
                    f.slots.forEach(s => {
                        if (s.status === "occupied" && s.vehicle) {
                            if (s.vehicle.username === u.username || s.vehicle.plate === u.phone) {
                                parkedPlate = s.vehicle.plate;
                            }
                        }
                    });
                });
                
                return (u.fullname || "").toLowerCase().includes(searchQuery) ||
                       (u.username || "").toLowerCase().includes(searchQuery) ||
                       (u.phone || "").toLowerCase().includes(searchQuery) ||
                       parkedPlate.toLowerCase().includes(searchQuery);
            });
        }
        
        // Đếm số cột đúng theo role
        const colCount = currentRole === 'admin' ? 8 : 7;
        if (userList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="${colCount}" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        Không có tài khoản người dùng tương ứng.
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = userList.map(u => {
            const userRole = u.role || "driver";
            const roleBadge = userRole === "staff" 
                ? `<span class="role-badge" style="background-color: rgba(0, 255, 102, 0.1); color: var(--color-success); padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">Nhân viên (Staff)</span>` 
                : `<span class="role-badge" style="background-color: rgba(0, 243, 255, 0.1); color: var(--accent-color); padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">Khách gửi (Driver)</span>`;
            
            // Find active parking spot and vehicle plate
            let parkedPlate = "-";
            let parkedSlotInfo = "-";
            
            data.floors.forEach(f => {
                f.slots.forEach(s => {
                    if (s.status === "occupied" && s.vehicle) {
                        // Match vehicle to user by username or phone number
                        if (s.vehicle.username === u.username || s.vehicle.plate === u.phone) {
                            parkedPlate = s.vehicle.plate;
                            parkedSlotInfo = `${f.name} - Ô ${s.id}`;
                        }
                    }
                });
            });
            
            let actionBtn = "";
            if (currentRole === "admin") {
                if (userRole === "staff") {
                    actionBtn = `<button class="btn-action btn-toggle-role" data-username="${u.username}" data-to-role="driver" style="padding: 4px 8px; font-size: 11px; height: auto; background: rgba(255, 0, 85, 0.1); border: 1px solid rgba(255, 0, 85, 0.2); color: var(--color-error); border-radius: 4px; font-weight: 600; cursor: pointer; transition: 0.2s;">Hủy vai trò Staff</button>`;
                } else {
                    actionBtn = `<button class="btn-action btn-toggle-role" data-username="${u.username}" data-to-role="staff" style="padding: 4px 8px; font-size: 11px; height: auto; background: rgba(0, 243, 255, 0.1); border: 1px solid rgba(0, 243, 255, 0.2); color: var(--accent-color); border-radius: 4px; font-weight: 600; cursor: pointer; transition: 0.2s;">Gán vai trò Staff</button>`;
                }
            }
            
            return `
                <tr>
                    <td><strong>${u.fullname}</strong></td>
                    <td><span style="font-family: var(--font-mono); color: var(--text-primary);">${u.username}</span></td>
                    <td>${u.phone}</td>
                    <td>${u.address}</td>
                    <td><span style="font-family: var(--font-mono); color: #fff; font-weight: bold;">${parkedPlate}</span></td>
                    <td><span style="color: var(--color-success); font-weight: 600;">${parkedSlotInfo}</span></td>
                    <td>${roleBadge}</td>
                    ${currentRole === "admin" ? `<td>${actionBtn}</td>` : ""}
                </tr>
            `;
        }).join('');
        
        // Gắn sự kiện chuyển đổi vai trò cho Admin
        if (currentRole === "admin") {
            tableBody.querySelectorAll(".btn-toggle-role").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const username = btn.getAttribute("data-username");
                    const toRole = btn.getAttribute("data-to-role");
                    const targetUser = data.users.find(u => u.username === username);
                    if (targetUser) {
                        targetUser.role = toRole;
                        logToTerminal("info", `Admin thay đổi vai trò của tài khoản ${username} thành ${toRole === 'staff' ? 'Staff' : 'Driver'}.`);
                        await window.savePBMSData();
                        renderUsersTable();
                    }
                });
            });
        }
    }

    // Xử lý sự kiện mở/đóng Modal Đăng Ký
    const linkOpenReg = document.getElementById("link-open-register");
    const regModal = document.getElementById("register-modal");
    const btnCloseReg = document.getElementById("btn-close-register");
    const regForm = document.getElementById("register-form");
    const regError = document.getElementById("register-error");
    const regSuccess = document.getElementById("register-success");
    
    if (linkOpenReg) {
        linkOpenReg.addEventListener("click", (e) => {
            e.preventDefault();
            if (regModal) regModal.classList.remove("hidden");
        });
    }
    
    if (btnCloseReg) {
        btnCloseReg.addEventListener("click", () => {
            if (regModal) regModal.classList.add("hidden");
            if (regForm) regForm.reset();
            if (regError) regError.classList.add("hidden");
            if (regSuccess) {
                regSuccess.classList.add("hidden");
                regSuccess.style.display = "none";
            }
        });
    }

    if (regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fullname = document.getElementById("reg-fullname").value.trim();
            const phone = document.getElementById("reg-phone").value.trim();
            const address = document.getElementById("reg-address").value.trim();
            const username = document.getElementById("reg-username").value.trim();
            const password = document.getElementById("reg-password").value;
            
            const newUser = { fullname, phone, address, username, password };
            
            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUser)
                });
                
                if (res.ok) {
                    if (!data.users) data.users = [];
                    data.users.push(newUser);
                    window.PBMS_DATA = data;
                    
                    if (regSuccess) {
                        regSuccess.textContent = "Đăng ký thành công! Đang chuyển hướng...";
                        regSuccess.classList.remove("hidden");
                        regSuccess.style.display = "block";
                    }
                    if (regError) regError.classList.add("hidden");
                    
                    setTimeout(() => {
                        if (regModal) regModal.classList.add("hidden");
                        regForm.reset();
                        if (regSuccess) {
                            regSuccess.classList.add("hidden");
                            regSuccess.style.display = "none";
                        }
                        
                        // Điền sẵn tài khoản vừa tạo
                        const loginUser = document.getElementById("login-username");
                        const loginPass = document.getElementById("login-password");
                        if (loginUser) loginUser.value = username;
                        if (loginPass) {
                            loginPass.value = "";
                            loginPass.focus();
                        }
                    }, 1500);
                } else {
                    const errData = await res.json();
                    if (regError) {
                        regError.textContent = errData.error || "Đăng ký thất bại!";
                        regError.classList.remove("hidden");
                    }
                }
            } catch (err) {
                console.error("Lỗi đăng ký:", err);
                if (regError) {
                    regError.textContent = "Không kết nối được máy chủ!";
                    regError.classList.remove("hidden");
                }
            }
        });
    }
});
