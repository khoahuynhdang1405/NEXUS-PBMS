/**
 * mobile.js - Logic điều khiển giao diện Driver Mobile App
 * Hỗ trợ đồng bộ dữ liệu thời gian thực qua localStorage, tự động cấp ô đỗ xe, tính cước động và hướng dẫn đường đi.
 */

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // TRẠNG THÁI & KHỞI TẠO
    // ----------------------------------------------------
    let data = window.PBMS_DATA;
    let userPlate = localStorage.getItem("pbms_user_plate") || null;
    let billingInterval = null;
    
    // Khởi tạo các icon Lucide
    lucide.createIcons();

    // Custom alert function
    window.showCustomAlert = function(message, type = 'error') {
        const existing = document.getElementById("custom-modal-alert");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "custom-modal-alert";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "rgba(10, 14, 38, 0.85)";
        overlay.style.backdropFilter = "blur(8px)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "99999";
        
        if (!document.getElementById("custom-alert-styles")) {
            const styles = document.createElement("style");
            styles.id = "custom-alert-styles";
            styles.textContent = `
                @keyframes customFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes customScaleUp { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `;
            document.head.appendChild(styles);
        }
        overlay.style.animation = "customFadeIn 0.25s ease forwards";

        const card = document.createElement("div");
        card.style.background = "#161b33";
        card.style.border = "1px solid " + (type === 'error' ? 'var(--color-error)' : 'var(--accent-color)');
        card.style.borderRadius = "16px";
        card.style.padding = "24px";
        card.style.width = "85%";
        card.style.maxWidth = "300px";
        card.style.textAlign = "center";
        card.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5), 0 0 15px " + (type === 'error' ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 243, 255, 0.15)');
        card.style.animation = "customScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";

        const iconWrapper = document.createElement("div");
        iconWrapper.style.width = "48px";
        iconWrapper.style.height = "48px";
        iconWrapper.style.borderRadius = "50%";
        iconWrapper.style.background = type === 'error' ? 'rgba(255,0,85,0.1)' : 'rgba(0,243,255,0.1)';
        iconWrapper.style.display = "flex";
        iconWrapper.style.alignItems = "center";
        iconWrapper.style.justifyContent = "center";
        iconWrapper.style.margin = "0 auto 16px auto";
        iconWrapper.style.color = type === 'error' ? 'var(--color-error)' : 'var(--accent-color)';
        iconWrapper.innerHTML = type === 'error' ? '<i data-lucide="alert-triangle" style="width:24px;height:24px;"></i>' : '<i data-lucide="check-circle" style="width:24px;height:24px;"></i>';

        const titleEl = document.createElement("h4");
        titleEl.style.margin = "0 0 8px 0";
        titleEl.style.fontSize = "15px";
        titleEl.style.fontWeight = "700";
        titleEl.style.color = "#fff";
        titleEl.textContent = type === 'error' ? "THÔNG BÁO LỖI" : "THÀNH CÔNG";

        const msgEl = document.createElement("p");
        msgEl.style.margin = "0 0 20px 0";
        msgEl.style.fontSize = "12px";
        msgEl.style.color = "var(--text-secondary)";
        msgEl.style.lineHeight = "1.5";
        msgEl.textContent = message;

        const btn = document.createElement("button");
        btn.style.width = "100%";
        btn.style.height = "38px";
        btn.style.background = type === 'error' ? 'linear-gradient(135deg, #ff0055, #80002b)' : 'linear-gradient(135deg, var(--accent-color), #0080ff)';
        btn.style.border = "none";
        btn.style.borderRadius = "8px";
        btn.style.color = "#fff";
        btn.style.fontSize = "13px";
        btn.style.fontWeight = "700";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = type === 'error' ? '0 0 10px rgba(255,0,85,0.2)' : '0 0 10px rgba(0,243,255,0.2)';
        btn.textContent = "ĐỒNG Ý";
        btn.addEventListener("click", () => {
            overlay.remove();
        });

        card.appendChild(iconWrapper);
        card.appendChild(titleEl);
        card.appendChild(msgEl);
        card.appendChild(btn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        
        lucide.createIcons();
    };
    
    // Cấu hình Máy chủ API & Toggle UI
    const toggleConfigBtn = document.getElementById("toggle-server-config");
    const serverConfigCard = document.getElementById("server-config-card");
    const saveUrlBtn = document.getElementById("btn-save-server-url");
    const serverUrlInput = document.getElementById("mob-server-url");
    const successMsg = document.getElementById("server-config-success");
    
    // Tự động đồng bộ địa chỉ máy chủ nếu chạy trên trình duyệt web (không phải mobile app Capacitor)
    if (!window.Capacitor && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            localStorage.setItem("pbms_server_url", window.location.origin);
        }
    }

    // Dọn dẹp URL cũ/lỗi trên Android để đảm bảo kết nối ổn định đến Serveo tunnel đang chạy
    if (window.Capacitor || window.location.protocol === 'file:') {
        let currentSavedUrl = localStorage.getItem("pbms_server_url");
        if (!currentSavedUrl || 
            currentSavedUrl.includes("localhost") || 
            currentSavedUrl.includes("127.0.0.1") || 
            (currentSavedUrl.includes("serveousercontent.com") && !currentSavedUrl.includes("quouis.serveousercontent.com"))) {
            console.log("Resetting invalid/expired server URL to default active Serveo tunnel...");
            localStorage.setItem("pbms_server_url", "https://quouis.serveousercontent.com");
        }
    }
    
    if (serverUrlInput) {
        serverUrlInput.value = localStorage.getItem("pbms_server_url") || "";
    }
    
    if (toggleConfigBtn) {
        toggleConfigBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (serverConfigCard) serverConfigCard.classList.toggle("hidden");
        });
    }
    
    if (saveUrlBtn) {
        saveUrlBtn.addEventListener("click", () => {
            const val = serverUrlInput ? serverUrlInput.value.trim() : "";
            localStorage.setItem("pbms_server_url", val);
            if (successMsg) {
                successMsg.textContent = "Đã lưu địa chỉ máy chủ thành công!";
                successMsg.classList.remove("hidden");
            }
            setTimeout(() => {
                if (successMsg) successMsg.classList.add("hidden");
                if (serverConfigCard) serverConfigCard.classList.add("hidden");
            }, 1500);
            
            // Tải lại dữ liệu và bắt đầu thăm dò (polling) ngay lập tức
            fetchInitialState();
            startPolling();
        });
    }

    // Hàm fetch có cơ chế Timeout tự động
    async function fetchWithTimeout(resource, options = {}) {
        const { timeout = 2500 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    // Hàm lấy endpoint đầy đủ với mặc định cố định sang Serveo Tunnel
    function getApiUrl(endpoint) {
        let serverUrl = localStorage.getItem("pbms_server_url") || "";
        if (serverUrl.toLowerCase() === "offline" || serverUrl.toLowerCase() === "demo") {
            return null;
        }
        if (!serverUrl && (window.Capacitor || window.location.protocol === 'file:')) {
            serverUrl = "https://quouis.serveousercontent.com";
        }
        if (serverUrl) {
            return `${serverUrl.replace(/\/$/, "")}${endpoint}`;
        }
        return endpoint;
    }

    function updateServerStatus(isOnline, detailText = "") {
        const badge = document.getElementById("mob-server-status");
        if (!badge) return;
        
        const serverUrl = localStorage.getItem("pbms_server_url") || "";
        const isDemo = !serverUrl && (window.Capacitor || window.location.hostname === 'localhost' || window.location.protocol === 'file:');
        
        if (isDemo) {
            badge.style.backgroundColor = "rgba(0, 243, 255, 0.1)";
            badge.style.color = "var(--accent-color)";
            badge.style.borderColor = "rgba(0, 243, 255, 0.2)";
            badge.innerHTML = `
                <span class="status-dot" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: var(--accent-color);"></span>
                CHẾ ĐỘ NGOẠI TUYẾN (DEMO)
            `;
            return;
        }
        
        if (isOnline) {
            badge.style.backgroundColor = "var(--color-success-bg)";
            badge.style.color = "var(--color-success)";
            badge.style.borderColor = "rgba(0, 255, 102, 0.2)";
            badge.innerHTML = `
                <span class="status-dot" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: var(--color-success); animation: pulse 2s infinite;"></span>
                MÁY CHỦ ĐỒNG BỘ
            `;
        } else {
            badge.style.backgroundColor = "rgba(255, 0, 85, 0.1)";
            badge.style.color = "var(--color-error)";
            badge.style.borderColor = "rgba(255, 0, 85, 0.2)";
            badge.innerHTML = `
                <span class="status-dot" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: var(--color-error);"></span>
                NGOẠI TUYẾN (LỖI KẾT NỐI)
            `;
        }
    }

    // Lấy dữ liệu ban đầu từ máy chủ
    async function fetchInitialState() {
        const url = getApiUrl('/api/state');
        if (!url) {
            updateServerStatus(false);
            const localSaved = localStorage.getItem("pbms_state");
            if (localSaved) {
                data = JSON.parse(localSaved);
                window.PBMS_DATA = data;
                checkUserParkingState();
            }
            return;
        }
        
        try {
            const res = await fetchWithTimeout(url, { timeout: 2500 });
            if (res.ok) {
                const serverState = await res.json();
                data = serverState;
                window.PBMS_DATA = data;
                checkUserParkingState();
                updateServerStatus(true);
            } else {
                updateServerStatus(false, "Mã phản hồi: " + res.status);
            }
        } catch (e) {
            console.error("Không kết nối được với máy chủ:", e);
            updateServerStatus(false, e.toString());
            // Fallback sang dữ liệu cục bộ
            const localSaved = localStorage.getItem("pbms_state");
            if (localSaved) {
                data = JSON.parse(localSaved);
                window.PBMS_DATA = data;
                checkUserParkingState();
            }
        }
    }
    
    // Polling máy chủ định kỳ
    let pollingInterval = null;
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        
        const url = getApiUrl('/api/state');
        if (!url) {
            updateServerStatus(false);
            return;
        }
        
        pollingInterval = setInterval(async () => {
            if (window.PBMS_IS_SAVING) return;
            
            try {
                const res = await fetchWithTimeout(url, { timeout: 2500 });
                if (res.ok) {
                    const serverState = await res.json();
                    updateServerStatus(true);
                    const serverStateStr = JSON.stringify(serverState);
                    const localStateStr = JSON.stringify(data);
                    if (serverStateStr !== localStateStr) {
                        data = serverState;
                        window.PBMS_DATA = data;
                        checkUserParkingState();
                    }
                } else {
                    updateServerStatus(false, "Mã phản hồi: " + res.status);
                }
            } catch (e) {
                console.error("Lỗi đồng bộ máy chủ:", e);
                updateServerStatus(false, e.toString());
            }
        }, 3000); // 3 giây để tối ưu tài nguyên của webview điện thoại
    }
    
    // Khởi động các luồng
    fetchInitialState();
    startPolling();
    
    // Cập nhật đồng hồ của điện thoại
    updatePhoneClock();
    setInterval(updatePhoneClock, 1000);
    
    // Kiểm tra trạng thái đỗ xe hiện tại của người dùng khi mở app
    checkUserParkingState();
    
    window.addEventListener('storage', () => {
        const localSaved = localStorage.getItem("pbms_state");
        if (localSaved) {
            data = JSON.parse(localSaved);
            window.PBMS_DATA = data;
            checkUserParkingState();
        }
    });

    // ----------------------------------------------------
    // ĐIỀU HƯỚNG VIEW ĐIỆN THOẠI
    // ----------------------------------------------------
    function showView(viewId) {
        document.querySelectorAll(".mobile-view").forEach(v => v.classList.remove("active"));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add("active");
        
        // Hủy bộ đếm thời gian cước cũ nếu rời màn hình điều hướng
        if (viewId !== "view-navigation" && billingInterval) {
            clearInterval(billingInterval);
            billingInterval = null;
        }
    }

    function updatePhoneClock() {
        const clockEl = document.getElementById("phone-clock");
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
    }

    function checkAuthStatus() {
        const profile = localStorage.getItem("pbms_driver_profile");
        if (!profile) {
            showView("view-mob-login");
            return false;
        }
        return true;
    }

    // ----------------------------------------------------
    // KIỂM TRA TRẠNG THÁI Ô ĐỖ CỦA USER
    // ----------------------------------------------------
    function checkUserParkingState() {
        if (!checkAuthStatus()) return;

        const profileJson = localStorage.getItem("pbms_driver_profile");
        let profile = null;
        if (profileJson) {
            try {
                profile = JSON.parse(profileJson);
            } catch(e) {}
        }

        // Tự động khôi phục biển số xe nếu tài khoản đang có xe đỗ
        if (!userPlate && profile) {
            data.floors.forEach(f => {
                f.slots.forEach(s => {
                    if (s.status === "occupied" && s.vehicle && s.vehicle.username === profile.username) {
                        userPlate = s.vehicle.plate;
                        localStorage.setItem("pbms_user_plate", userPlate);
                    }
                });
            });
        }

        if (!userPlate) {
            showView("view-welcome");
            return;
        }
        
        // Tìm xem xe của biển số này có đang đỗ ở ô nào không
        let userSlot = null;
        let userFloor = null;
        
        data.floors.forEach(f => {
            f.slots.forEach(s => {
                if (s.status === "occupied" && s.vehicle && s.vehicle.plate === userPlate) {
                    userSlot = s;
                    userFloor = f;
                }
            });
        });
        
        if (userSlot) {
            // Xe đang đỗ -> Hiện màn hình điều hướng & tính tiền động
            document.getElementById("nav-assigned-spot").textContent = `${userFloor.id} - ${userSlot.id}`;
            document.getElementById("nav-plate").textContent = userSlot.vehicle.plate;
            document.getElementById("nav-floor-name").textContent = userFloor.name;
            document.getElementById("nav-rate").textContent = `${data.rates[userSlot.zoneType].toLocaleString('vi-VN')}đ/giờ`;
            
            // Kích hoạt hiển thị sạc EV nếu có sạc
            const evCard = document.getElementById("mob-ev-card");
            if (userSlot.zoneType === 'ev' && userSlot.vehicle.evCharging) {
                evCard.classList.remove("hidden");
            } else {
                evCard.classList.add("hidden");
            }
            
            // Cập nhật sơ đồ chỉ đường mini
            renderMiniNavigationMap(userFloor, userSlot);
            
            // Chạy bộ đếm cước động
            if (!billingInterval) {
                updateLiveBilling(userSlot);
                billingInterval = setInterval(() => updateLiveBilling(userSlot), 1000);
            }
            
            showView("view-navigation");
        } else {
            // Xe không có trong bãi (có thể đã checkout từ trước) -> Quay về Welcome
            localStorage.removeItem("pbms_user_plate");
            userPlate = null;
            showView("view-welcome");
        }
    }

    // ----------------------------------------------------
    // XỬ LÝ ĐĂNG NHẬP & ĐĂNG KÝ TRÊN MOBILE
    // ----------------------------------------------------
    const mobLoginForm = document.getElementById("mob-login-form");
    const mobRegForm = document.getElementById("mob-register-form");
    const linkMobOpenReg = document.getElementById("link-mob-open-register");
    const btnMobCloseReg = document.getElementById("btn-mob-close-register");
    const btnMobLogout = document.getElementById("btn-mob-logout");
    const mobLoginError = document.getElementById("mob-login-error");
    const mobRegError = document.getElementById("mob-reg-error");
    const mobRegSuccess = document.getElementById("mob-reg-success");

    if (linkMobOpenReg) {
        linkMobOpenReg.addEventListener("click", (e) => {
            e.preventDefault();
            showView("view-mob-register");
            lucide.createIcons();
        });
    }

    if (btnMobCloseReg) {
        btnMobCloseReg.addEventListener("click", () => {
            showView("view-mob-login");
            if (mobRegForm) mobRegForm.reset();
            if (mobRegError) mobRegError.style.display = "none";
            if (mobRegSuccess) mobRegSuccess.style.display = "none";
            lucide.createIcons();
        });
    }

    if (btnMobLogout) {
        btnMobLogout.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
                localStorage.removeItem("pbms_driver_profile");
                localStorage.removeItem("pbms_user_plate");
                userPlate = null;
                checkUserParkingState();
                lucide.createIcons();
            }
        });
    }

    if (mobLoginForm) {
        mobLoginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("mob-login-username").value.trim();
            const password = document.getElementById("mob-login-password").value;
            
            if (mobLoginError) mobLoginError.style.display = "none";
            
            const url = getApiUrl('/api/login');
            
            // 1. Thử đăng nhập qua API server
            if (url) {
                try {
                    const res = await fetchWithTimeout(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    
                    if (res.ok) {
                        const resData = await res.json();
                        localStorage.setItem("pbms_driver_profile", JSON.stringify(resData.user));
                        
                        // Prefill user plate nếu họ đã có xe đỗ sẵn trong hệ thống
                        let userSlot = null;
                        data.floors.forEach(f => {
                            f.slots.forEach(s => {
                                if (s.status === "occupied" && s.vehicle && s.vehicle.username === resData.user.username) {
                                    userSlot = s;
                                }
                            });
                        });
                        if (userSlot) {
                            localStorage.setItem("pbms_user_plate", userSlot.vehicle.plate);
                            userPlate = userSlot.vehicle.plate;
                        }
                        
                        mobLoginForm.reset();
                        checkUserParkingState();
                        lucide.createIcons();
                        return;
                    }
                } catch (err) {
                    console.error("API Login failed, trying offline fallback:", err);
                }
            }
            
            // 2. Fallback ngoại tuyến: kiểm tra trong data.users cục bộ
            const userList = data.users || [];
            const matchedUser = userList.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
            if (matchedUser) {
                localStorage.setItem("pbms_driver_profile", JSON.stringify(matchedUser));
                
                // Prefill user plate nếu họ đã có xe đỗ sẵn trong hệ thống
                let userSlot = null;
                data.floors.forEach(f => {
                    f.slots.forEach(s => {
                        if (s.status === "occupied" && s.vehicle && s.vehicle.username === matchedUser.username) {
                            userSlot = s;
                        }
                    });
                });
                if (userSlot) {
                    localStorage.setItem("pbms_user_plate", userSlot.vehicle.plate);
                    userPlate = userSlot.vehicle.plate;
                }
                
                mobLoginForm.reset();
                checkUserParkingState();
                lucide.createIcons();
            } else {
                if (mobLoginError) mobLoginError.style.display = "block";
            }
        });
    }

    if (mobRegForm) {
        mobRegForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fullname = document.getElementById("mob-reg-fullname").value.trim();
            const phone = document.getElementById("mob-reg-phone").value.trim();
            const address = document.getElementById("mob-reg-address").value.trim();
            const username = document.getElementById("mob-reg-username").value.trim();
            const password = document.getElementById("mob-reg-password").value;
            
            if (mobRegError) mobRegError.style.display = "none";
            if (mobRegSuccess) mobRegSuccess.style.display = "none";
            
            const newUser = { fullname, phone, address, username, password };
            const url = getApiUrl('/api/register');
            
            // 1. Thử đăng ký qua API server
            let registeredOnServer = false;
            if (url) {
                try {
                    const res = await fetchWithTimeout(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newUser)
                    });
                    
                    if (res.ok) {
                        registeredOnServer = true;
                    } else {
                        const errData = await res.json();
                        if (mobRegError) {
                            mobRegError.textContent = errData.error || "Đăng ký thất bại!";
                            mobRegError.style.display = "block";
                        }
                        return;
                    }
                } catch (err) {
                    console.error("API Register failed, trying offline fallback:", err);
                }
            }
            
            // 2. Đồng bộ cục bộ vào local state
            if (!data.users) data.users = [];
            const exists = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (exists && !registeredOnServer) {
                if (mobRegError) {
                    mobRegError.textContent = "Tài khoản đã tồn tại trên hệ thống!";
                    mobRegError.style.display = "block";
                }
                return;
            }
            
            if (!exists) {
                data.users.push(newUser);
            }
            
            window.PBMS_DATA = data;
            await window.savePBMSData();
            
            if (mobRegSuccess) {
                mobRegSuccess.textContent = "Đăng ký thành công! Đang chuyển hướng...";
                mobRegSuccess.style.display = "block";
            }
            
            setTimeout(() => {
                showView("view-mob-login");
                mobRegForm.reset();
                if (mobRegSuccess) mobRegSuccess.style.display = "none";
                
                // Điền sẵn tài khoản vừa tạo
                const loginUser = document.getElementById("mob-login-username");
                const loginPass = document.getElementById("mob-login-password");
                if (loginUser) loginUser.value = username;
                if (loginPass) {
                    loginPass.value = "";
                    loginPass.focus();
                }
                lucide.createIcons();
            }, 1500);
        });
    }

    // ----------------------------------------------------
    // CẤP VỊ TRÍ ĐỖ XE TỰ ĐỘNG (FORM ĐĂNG KÝ)
    // ----------------------------------------------------
    const checkinForm = document.getElementById("mobile-checkin-form");
    checkinForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const plate = document.getElementById("mob-plate").value.trim().toUpperCase();
        const category = document.getElementById("mob-type").value;
        const wantEVCharge = document.getElementById("mob-ev-charge").checked;
        const errBox = document.getElementById("mob-checkin-error");
        
        if (!plate) return;
        
        // Tắt nút bấm để tránh double submit
        const submitBtn = checkinForm.querySelector("button[type='submit']");
        let originalBtnHtml = "";
        if (submitBtn) {
            originalBtnHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;animation:spin 1s linear infinite;"></i> Đang xử lý...';
            lucide.createIcons();
        }
        
        // Tạm dừng polling bằng cách set flag
        window.PBMS_IS_SAVING = true;
        
        // Kiểm tra xem xe đã đỗ trong hệ thống chưa
        let alreadyParked = false;
        data.floors.forEach(f => {
            f.slots.forEach(s => {
                if (s.status === "occupied" && s.vehicle && s.vehicle.plate === plate) {
                    alreadyParked = true;
                }
            });
        });
        
        if (alreadyParked) {
            errBox.textContent = "Lỗi: Biển số xe này đã ghi nhận đang đỗ trong tòa nhà!";
            errBox.style.display = "block";
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
                lucide.createIcons();
            }
            window.PBMS_IS_SAVING = false;
            return;
        }
        
        // Thuật toán cấp phát ô đỗ tối ưu tự động
        let targetSlot = null;
        let targetFloor = null;
        
        // Bước 1: Tìm ô trống khớp phân loại xe đăng ký
        for (let f of data.floors) {
            targetSlot = f.slots.find(s => s.status === 'available' && s.zoneType === category);
            if (targetSlot) {
                targetFloor = f;
                break;
            }
        }
        
        // Bước 2: Dự phòng sạc EV nếu người dùng chọn sạc nhưng hết chỗ EV
        if (!targetSlot && category === 'ev') {
            for (let f of data.floors) {
                targetSlot = f.slots.find(s => s.status === 'available' && s.zoneType === 'car');
                if (targetSlot) {
                    targetFloor = f;
                    break;
                }
            }
        }
        
        // Bước 3: Dự phòng chung: cấp bất kỳ ô trống nào còn lại
        if (!targetSlot) {
            for (let f of data.floors) {
                targetSlot = f.slots.find(s => s.status === 'available');
                if (targetSlot) {
                    targetFloor = f;
                    break;
                }
            }
        }
        
        if (!targetSlot) {
            errBox.textContent = "Hệ thống bận: Tòa nhà đỗ xe đã hết chỗ trống!";
            errBox.style.display = "block";
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
                lucide.createIcons();
            }
            window.PBMS_IS_SAVING = false;
            return;
        }
        
        // Ghi nhận đỗ xe thành công
        const now = new Date();
        const profileJson = localStorage.getItem("pbms_driver_profile");
        let loggedInUsername = null;
        if (profileJson) {
            try {
                loggedInUsername = JSON.parse(profileJson).username;
            } catch(e) {}
        }
        targetSlot.status = "occupied";
        targetSlot.vehicle = {
            plate: plate,
            type: category,
            checkInDate: now.toLocaleDateString('vi-VN'),
            checkInTime: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            checkInRaw: now.toISOString(),
            evCharging: (category === 'ev' || (category === 'car' && wantEVCharge)),
            chargeProgress: (category === 'ev' || wantEVCharge) ? 5 : null,
            chargeSpeed: (category === 'ev' || wantEVCharge) ? 7.2 : null,
            username: loggedInUsername
        };
        
        // Cập nhật log an ninh hệ thống
        data.alerts.unshift({
            type: "info",
            message: `[Mobile] Người dùng đăng ký xe ${plate} đỗ tại ô ${targetSlot.id} (${targetFloor.name}).`,
            time: now.toTimeString().split(' ')[0]
        });
        
        // Lưu dữ liệu dùng chung và chờ cho đến khi hoàn thành POST
        const saveSuccess = await window.savePBMSData();
        
        if (saveSuccess) {
            // Lưu trạng thái xe của người dùng
            localStorage.setItem("pbms_user_plate", plate);
            userPlate = plate;
            
            // Reset form và chuyển view điều hướng
            errBox.style.display = "none";
            document.getElementById("mob-plate").value = "";
            checkUserParkingState();
        } else {
            // Phục hồi lại trạng thái ô đỗ nếu lưu thất bại
            targetSlot.status = "available";
            targetSlot.vehicle = null;
            const errMsgDetail = window.PBMS_LAST_ERROR ? `\n(Chi tiết lỗi: ${window.PBMS_LAST_ERROR})` : "";
            errBox.textContent = `Lỗi: Không thể kết nối tới máy chủ đỗ xe! Vui lòng kiểm tra lại URL máy chủ API.${errMsgDetail}`;
            errBox.style.display = "block";
        }
        
        // Mở lại nút bấm
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
            lucide.createIcons();
        }
        
        // Bật lại polling
        window.PBMS_IS_SAVING = false;
    });

    // Ống sạc ẩn/hiện tùy thuộc lựa chọn ô tô điện
    document.getElementById("mob-type").addEventListener("change", (e) => {
        const evWrapper = document.getElementById("mob-ev-toggle-wrapper");
        if (e.target.value === 'ev' || e.target.value === 'car') {
            evWrapper.style.display = "flex";
        } else {
            evWrapper.style.display = "none";
        }
    });

    // ----------------------------------------------------
    // CẬP NHẬT CƯỚC & PIN SẠC XE ĐIỆN ĐỘNG (LIVE BILLING)
    // ----------------------------------------------------
    function updateLiveBilling(slot) {
        if (!slot || !slot.vehicle) return;
        
        const checkIn = new Date(slot.vehicle.checkInRaw);
        const now = new Date();
        const diffMs = now - checkIn;
        const diffHrs = Math.max(0.5, diffMs / (1000 * 60 * 60)); // tối thiểu 30 phút cước
        
        // Cập nhật nhãn thời gian đỗ
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        document.getElementById("nav-duration").textContent = 
            `${hrs.toString().padStart(2, '0')} giờ ${mins.toString().padStart(2, '0')} phút ${secs.toString().padStart(2, '0')} giây`;
            
        // Tính toán cước phí đỗ xe
        const baseRate = data.rates[slot.zoneType] || 20000;
        const baseCost = diffHrs * baseRate;
        let surcharge = 0;
        if (slot.vehicle.evCharging) {
            surcharge = diffHrs * data.rates.evChargingSurcharge;
        }
        const totalFee = Math.round(baseCost + surcharge);
        document.getElementById("nav-cost").textContent = `${totalFee.toLocaleString('vi-VN')}đ`;
        
        // Cập nhật pin sạc xe điện nếu có sạc
        if (slot.zoneType === 'ev' && slot.vehicle.evCharging) {
            const progress = slot.vehicle.chargeProgress || 0;
            document.getElementById("mob-battery-fill").style.width = `${progress}%`;
            document.getElementById("mob-battery-pct").textContent = `${progress}%`;
            
            // Tính số điện mô phỏng tiêu thụ
            const speed = slot.vehicle.chargeSpeed || 7.2;
            const energyUsed = speed * (diffMs / (1000 * 60 * 60));
            document.getElementById("mob-energy-used").textContent = `${energyUsed.toFixed(2)} kWh`;
            document.getElementById("mob-charge-speed").textContent = `${speed} kW`;
        }
    }

    // ----------------------------------------------------
    // VẼ SƠ ĐỒ MINI GUILD ĐIỀU HƯỚNG
    // ----------------------------------------------------
    function renderMiniNavigationMap(floor, assignedSlot) {
        const mapGrid = document.getElementById("mini-map-grid");
        if (!mapGrid) return;
        
        const layout = floor.layout;
        mapGrid.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
        mapGrid.innerHTML = "";
        
        // Render 2 hàng gần nhất khu vực đỗ xe của người dùng để gọn màn hình mobile
        const userRow = assignedSlot.row;
        let startRow = Math.max(0, userRow - 1);
        let endRow = Math.min(layout.rows - 1, userRow + 1);
        
        // Đảm bảo vẽ tối thiểu 3 hàng để có tính bao quát
        if (endRow - startRow < 2) {
            if (startRow === 0) endRow = Math.min(layout.rows - 1, startRow + 2);
            else startRow = Math.max(0, endRow - 2);
        }
        
        for (let r = startRow; r <= endRow; r++) {
            if (layout.driveways.includes(r)) {
                const driveway = document.createElement("div");
                driveway.className = "mini-driveway";
                mapGrid.appendChild(driveway);
                continue;
            }
            
            for (let c = 0; c < layout.cols; c++) {
                const slot = floor.slots.find(s => s.row === r && s.col === c);
                
                if (slot) {
                    const spotEl = document.createElement("div");
                    spotEl.className = "mini-spot";
                    
                    if (slot.id === assignedSlot.id) {
                        spotEl.className += " mini-assigned";
                        spotEl.textContent = slot.id;
                    } else if (slot.status === "occupied") {
                        spotEl.className += " mini-occupied";
                    } else if (slot.status === "available") {
                        spotEl.className += " mini-available";
                    } else {
                        spotEl.className += " mini-maint";
                    }
                    mapGrid.appendChild(spotEl);
                } else {
                    const spacer = document.createElement("div");
                    mapGrid.appendChild(spacer);
                }
            }
        }
    }

    // ----------------------------------------------------
    // XỬ LÝ THANH TOÁN & RỜI BÃI
    // ----------------------------------------------------
    document.getElementById("btn-mob-checkout-request").addEventListener("click", async () => {
        if (!userPlate) return;
        
        const checkoutBtn = document.getElementById("btn-mob-checkout-request");
        let originalBtnHtml = "";
        if (checkoutBtn) {
            originalBtnHtml = checkoutBtn.innerHTML;
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px;animation:spin 1s linear infinite;"></i> Đang xử lý...';
            lucide.createIcons();
        }
        
        window.PBMS_IS_SAVING = true;
        
        // Tìm ô đỗ
        let targetSlot = null;
        let targetFloor = null;
        data.floors.forEach(f => {
            const s = f.slots.find(x => x.status === "occupied" && x.vehicle && x.vehicle.plate === userPlate);
            if (s) {
                targetSlot = s;
                targetFloor = f;
            }
        });
        
        if (!targetSlot || !targetSlot.vehicle) {
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = originalBtnHtml;
                lucide.createIcons();
            }
            window.PBMS_IS_SAVING = false;
            return;
        }
        
        // Tính toán các thông số hóa đơn
        const checkIn = new Date(targetSlot.vehicle.checkInRaw);
        const checkOut = new Date();
        const diffMs = checkOut - checkIn;
        const diffHrs = Math.max(0.5, diffMs / (1000 * 60 * 60));
        
        const baseRate = data.rates[targetSlot.vehicle.type] || 20000;
        const baseFee = diffHrs * baseRate;
        const surcharge = targetSlot.vehicle.evCharging ? diffHrs * data.rates.evChargingSurcharge : 0;
        const totalFee = Math.round(baseFee + surcharge);
        
        // Backup data to restore on error
        const origStatus = targetSlot.status;
        const origVehicle = { ...targetSlot.vehicle };
        const origRevenue = data.revenue;
        const origAlerts = [...data.alerts];
        
        // Ghi nhận doanh thu và nhật ký hoạt động
        data.revenue = (data.revenue || 1820000) + totalFee;
        data.alerts.unshift({
            type: "success",
            message: `[Mobile App] Xe ${userPlate} đã tự thanh toán trực tuyến ${totalFee.toLocaleString('vi-VN')}đ và yêu cầu mở cổng.`,
            time: checkOut.toTimeString().split(' ')[0]
        });
        
        // Điền thông số vào hóa đơn điện tử mobile
        document.getElementById("rec-slot").textContent = targetSlot.id;
        document.getElementById("rec-plate").textContent = userPlate;
        
        const hrs = Math.floor(diffHrs);
        const mins = Math.floor((diffHrs - hrs) * 60);
        document.getElementById("rec-duration").textContent = `${hrs} giờ ${mins} phút`;
        document.getElementById("rec-base").textContent = `${Math.round(baseFee).toLocaleString('vi-VN')}đ`;
        
        const evRow = document.getElementById("rec-ev-row");
        if (targetSlot.vehicle.evCharging) {
            evRow.classList.remove("hidden");
            document.getElementById("rec-ev").textContent = `${Math.round(surcharge).toLocaleString('vi-VN')}đ`;
        } else {
            evRow.classList.add("hidden");
        }
        
        document.getElementById("rec-total").textContent = `${totalFee.toLocaleString('vi-VN')}đ`;
        document.getElementById("rec-id").textContent = `TXN-${Math.floor(Math.random() * 900000 + 100000)}`;
        
        // Hủy ô đỗ trong dữ liệu dùng chung
        targetSlot.status = "available";
        targetSlot.vehicle = null;
        
        // Lưu trạng thái mới và chờ hoàn thành
        const saveSuccess = await window.savePBMSData();
        
        if (saveSuccess) {
            // Chuyển view hóa đơn thành công và hoạt họa mở barrier
            const arm = document.querySelector(".barrier-arm");
            if (arm) arm.classList.add("open");
            
            showView("view-receipt");
        } else {
            // Restore state on failure
            targetSlot.status = origStatus;
            targetSlot.vehicle = origVehicle;
            data.revenue = origRevenue;
            data.alerts = origAlerts;
            if (typeof window.showCustomAlert === 'function') {
                window.showCustomAlert("Lỗi: Không thể kết nối tới máy chủ đỗ xe để thanh toán! Vui lòng thử lại.", "error");
            } else {
                alert("Lỗi: Không thể kết nối tới máy chủ đỗ xe để thanh toán! Vui lòng thử lại.");
            }
        }
        
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = originalBtnHtml;
            lucide.createIcons();
        }
        
        window.PBMS_IS_SAVING = false;
    });

    // ----------------------------------------------------
    // HOÀN TẤT & THOÁT
    // ----------------------------------------------------
    document.getElementById("btn-rec-done").addEventListener("click", () => {
        // Xóa thông tin xe trong bộ nhớ và đưa về màn hình ban đầu
        localStorage.removeItem("pbms_user_plate");
        userPlate = null;
        
        // Khép arm barrier trong simulation lại
        const arm = document.querySelector(".barrier-arm");
        arm.classList.remove("open");
        
        showView("view-welcome");
    });
});


