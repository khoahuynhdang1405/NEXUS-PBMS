/**
 * mockData.js - Dữ liệu mô phỏng cho Hệ thống Quản lý Tòa nhà Đỗ xe (PBMS)
 * Định nghĩa cấu hình bãi đỗ, tầng, khu vực, vị trí và thông tin giá vé.
 */

const VEHICLE_PLATES = [
    "30A-123.45", "30E-987.65", "29C-555.22", "51G-888.88", "43A-777.11",
    "30F-234.56", "30H-876.54", "29D-444.11", "51H-999.99", "43B-666.22",
    "30K-456.78", "30L-345.67", "29A-111.22", "51K-777.66", "75A-888.99",
    "30M-567.89", "30N-234.12", "29F-333.44", "51L-888.55", "98A-999.00"
];

const VEHICLE_TYPES = {
    car: "Ô tô tiêu chuẩn",
    suv: "SUV / Xe cỡ lớn",
    ev: "Ô tô điện (EV)",
    motorbike: "Xe máy",
    handicap: "Xe ưu tiên / Khuyết tật"
};

// Biểu phí đỗ xe mỗi giờ (VND)
const PARKING_RATES = {
    car: 20000,
    suv: 30000,
    ev: 20000,       // Phí cơ bản, cộng thêm phụ phí sạc nếu đang sạc
    motorbike: 5000,
    handicap: 10000,
    evChargingSurcharge: 15000 // Phụ thu sạc điện mỗi giờ
};

// Tạo ngẫu nhiên thời gian vào bãi trong 12 giờ qua
function getRandomCheckIn() {
    const now = new Date();
    const hoursAgo = Math.random() * 12 + 0.5; // từ 30 phút đến 12 giờ trước
    const checkIn = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    
    return {
        date: checkIn.toLocaleDateString('vi-VN'),
        time: checkIn.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        rawTime: checkIn
    };
}

// Tạo danh sách ô đỗ cho từng khu vực (Zone)
function generateSlots(floorId, zoneName, zoneType, count, startId, rows, cols, driveways, startRow) {
    const slots = [];
    let slotIndex = 0;
    let currentRow = startRow;
    
    for (let r = 0; r < rows; r++) {
        // Bỏ qua hàng đi nội bộ (Driveway)
        while (driveways.includes(currentRow)) {
            currentRow++;
        }
        
        for (let c = 0; c < cols; c++) {
            if (slotIndex >= count) break;
            
            const num = (startId + slotIndex).toString().padStart(2, '0');
            const id = `${floorId}-${zoneName}-${num}`;
            
            // Tỷ lệ phân bố trạng thái ngẫu nhiên
            const rand = Math.random();
            let status = "available";
            let vehicle = null;
            
            if (rand < 0.6) {
                status = "occupied";
                const isEVCharging = (zoneType === 'ev' && Math.random() < 0.8);
                const checkIn = getRandomCheckIn();
                vehicle = {
                    plate: VEHICLE_PLATES[Math.floor(Math.random() * VEHICLE_PLATES.length)],
                    type: zoneType,
                    checkInDate: checkIn.date,
                    checkInTime: checkIn.time,
                    checkInRaw: checkIn.rawTime.toISOString(),
                    evCharging: isEVCharging,
                    chargeProgress: isEVCharging ? Math.floor(Math.random() * 80) + 15 : null, // 15% đến 95%
                    chargeSpeed: isEVCharging ? (Math.random() > 0.5 ? 22 : 7.2) : null // kW
                };
            } else if (rand < 0.75) {
                status = "reserved";
                vehicle = {
                    plate: "ĐÃ ĐẶT CHỖ",
                    type: zoneType,
                    checkInDate: "-",
                    checkInTime: "Đã đặt trước"
                };
            } else if (rand < 0.8) {
                status = "maintenance";
            }
            
            slots.push({
                id,
                row: currentRow,
                col: c,
                status,
                vehicle,
                zoneName,
                zoneType
            });
            slotIndex++;
        }
        currentRow++;
    }
    return { slots, nextRow: currentRow };
}

// Khởi tạo thông tin 5 tầng đỗ xe với khu vực ngẫu nhiên
function generateFloorsData() {
    const floorsConfig = [
        {
            id: "B2",
            name: "Tầng hầm B2",
            description: "Trạm Sạc EV & Khu Xe Máy",
            zones: [
                { name: "A", type: "motorbike", count: 32, rows: 4, cols: 8 },
                { name: "B", type: "ev", count: 16, rows: 2, cols: 8 }
            ],
            layout: { rows: 7, cols: 8, driveways: [4] } // Hàng đường đi nội khu (cập nhật từ 6 thành 7)
        },
        {
            id: "B1",
            name: "Tầng hầm B1",
            description: "Ô Tô Tiêu Chuẩn & Sạc EV",
            zones: [
                { name: "A", type: "car", count: 20, rows: 2, cols: 10 },
                { name: "B", type: "ev", count: 12, rows: 2, cols: 6 }
            ],
            layout: { rows: 5, cols: 10, driveways: [2] }
        },
        {
            id: "G",
            name: "Tầng trệt G",
            description: "Khu Ưu Tiên & Trả Khách Nhanh",
            zones: [
                { name: "A", type: "handicap", count: 6, rows: 1, cols: 6 },
                { name: "B", type: "suv", count: 14, rows: 2, cols: 7 },
                { name: "C", type: "car", count: 12, rows: 2, cols: 6 }
            ],
            layout: { rows: 7, cols: 7, driveways: [1, 4] } // Hàng đường đi nội khu (cập nhật từ 6 thành 7)
        },
        {
            id: "F1",
            name: "Tầng 1 (F1)",
            description: "Khu Đỗ Xe Tiêu Chuẩn",
            zones: [
                { name: "A", type: "car", count: 24, rows: 3, cols: 8 },
                { name: "B", type: "suv", count: 8, rows: 1, cols: 8 }
            ],
            layout: { rows: 5, cols: 8, driveways: [3] }
        },
        {
            id: "F2",
            name: "Tầng 2 (F2)",
            description: "Khu Dài Hạn & Đặt Trước",
            zones: [
                { name: "A", type: "car", count: 28, rows: 4, cols: 7 }
            ],
            layout: { rows: 5, cols: 7, driveways: [2] }
        }
    ];

    return floorsConfig.map(fc => {
        let allSlots = [];
        let cumulativeStartId = 1;
        let startRow = 0;
        
        fc.zones.forEach(zc => {
            const { slots, nextRow } = generateSlots(
                fc.id, 
                zc.name, 
                zc.type, 
                zc.count, 
                cumulativeStartId, 
                zc.rows, 
                zc.cols, 
                fc.layout.driveways, 
                startRow
            );
            allSlots = allSlots.concat(slots);
            cumulativeStartId += zc.count;
            startRow = nextRow;
        });

        return {
            id: fc.id,
            name: fc.name,
            description: fc.description,
            zones: fc.zones.map(z => ({ name: z.name, type: z.type, count: z.count })),
            slots: allSlots,
            layout: fc.layout
        };
    });
}

// Log thông báo hệ thống ban đầu
const INITIAL_ALERTS = [
    { type: "info", message: "Hệ thống đã khởi tạo. Các luồng camera ANPR đã kết nối thành công.", time: "08:00:02" },
    { type: "warning", message: "Trạm sạc EV B2-B-04 báo lỗi nhiệt độ cổng kết nối tăng cao.", time: "08:04:12" },
    { type: "success", message: "Xe ô tô 30A-123.45 đã đỗ thành công vào vị trí B1-A-03.", time: "08:06:55" },
    { type: "info", message: "Gỡ bỏ cờ bảo trì cho ô đỗ G-A-05. Ô đỗ sẵn sàng phục vụ.", time: "08:08:15" },
    { type: "error", message: "Lỗi nhận diện biển số Cổng B vào: Ống kính camera bị mờ sương.", time: "08:09:01" }
];

// Kiểm tra và đồng bộ hóa dữ liệu qua localStorage để liên kết Operator Dashboard và Mobile App
const localSaved = localStorage.getItem("pbms_state");
if (localSaved) {
    window.PBMS_DATA = JSON.parse(localSaved);
} else {
    window.PBMS_DATA = {
        floors: generateFloorsData(),
        rates: PARKING_RATES,
        vehicleTypes: VEHICLE_TYPES,
        alerts: INITIAL_ALERTS,
        revenue: 1820000
    };
    localStorage.setItem("pbms_state", JSON.stringify(window.PBMS_DATA));
}

// Hàm lưu trạng thái dùng chung
window.savePBMSData = async function() {
    // 1. Lưu tạm localStorage phòng hờ
    localStorage.setItem("pbms_state", JSON.stringify(window.PBMS_DATA));
    
    // 2. Gửi lên server
    let serverUrl = localStorage.getItem("pbms_server_url") || "";
    if (!serverUrl && (window.Capacitor || window.location.protocol === 'file:')) {
        // Không có URL được đặt trong cài đặt
        // Thử gọi tương đối (chỉ hoạt động khi chạy qua Serveo tunnel đang còn sống)
        console.warn("[PBMS] Không có URL máy chủ được cấu hình. Vui lòng thiết lập URL máy chủ trong phần cài đặt app.");
    }
    const url = serverUrl ? `${serverUrl.replace(/\/$/, "")}/api/state` : '/api/state';
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(window.PBMS_DATA)
        });
        if (!res.ok) throw new Error("Server responded with error status");
        
        // Phát tán sự kiện storage để các tab đang mở tự động cập nhật
        window.dispatchEvent(new Event('storage'));
        return true;
    } catch (e) {
        console.error("Không thể kết nối máy chủ để lưu:", e);
        window.PBMS_LAST_ERROR = e.toString();
        return false;
    }
};


