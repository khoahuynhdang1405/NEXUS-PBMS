/**
 * server.js - Máy chủ Express Backend tích hợp cơ sở dữ liệu PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initDatabase } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Route trang chủ home.html trên URL gốc
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

// Phục vụ tĩnh toàn bộ thư mục gốc
app.use(express.static(__dirname));


let pool;

// API Lấy trạng thái bãi xe
app.get('/api/state', async (req, res) => {
    console.log(`[GET] /api/state requested from ${req.ip} at ${new Date().toLocaleTimeString()}`);
    try {
        if (!pool) {
            return res.status(500).json({ error: "Cơ sở dữ liệu chưa được khởi tạo!" });
        }

        // Fetch users
        const usersRes = await pool.query('SELECT fullname, username, password, phone, address, role FROM users');
        const users = usersRes.rows;

        // Fetch rates
        const ratesRes = await pool.query('SELECT vehicle_type, price FROM rates');
        const rates = {};
        ratesRes.rows.forEach(row => {
            rates[row.vehicle_type] = row.price;
        });

        // Fetch vehicle_types
        const vtRes = await pool.query('SELECT type_key, type_name FROM vehicle_types');
        const vehicleTypes = {};
        vtRes.rows.forEach(row => {
            vehicleTypes[row.type_key] = row.type_name;
        });

        // Fetch system_alerts
        const alertsRes = await pool.query('SELECT type, message, time FROM system_alerts ORDER BY id DESC LIMIT 50');
        const alerts = alertsRes.rows;

        // Fetch system_config (revenue)
        const configRes = await pool.query("SELECT value FROM system_config WHERE key = 'revenue'");
        const revenue = configRes.rowCount > 0 ? parseInt(configRes.rows[0].value) : 0;

        // Fetch floors
        const floorsRes = await pool.query('SELECT id, name, description, zones, layout FROM floors ORDER BY id DESC');
        const floors = floorsRes.rows.map(f => ({
            id: f.id,
            name: f.name,
            description: f.description,
            zones: f.zones,
            layout: f.layout || {},
            slots: []
        }));

        // Fetch slots & slot_vehicles
        const slotsRes = await pool.query(`
            SELECT s.id, s.floor_id, s.row, s.col, s.status, s.zone_name, s.zone_type,
                   v.plate, v.type as vehicle_type, v.check_in_date, v.check_in_time, v.check_in_raw,
                   v.ev_charging, v.charge_progress, v.charge_speed, v.username
            FROM slots s
            LEFT JOIN slot_vehicles v ON s.id = v.slot_id
            ORDER BY s.id ASC
        `);

        // Attach slots to floors
        const floorMap = {};
        floors.forEach(f => {
            floorMap[f.id] = f;
        });

        slotsRes.rows.forEach(row => {
            const slot = {
                id: row.id,
                row: row.row,
                col: row.col,
                status: row.status,
                zoneName: row.zone_name,
                zoneType: row.zone_type,
                vehicle: null
            };

            if (row.status === 'occupied') {
                slot.vehicle = {
                    plate: row.plate,
                    type: row.vehicle_type,
                    checkInDate: row.check_in_date,
                    checkInTime: row.check_in_time,
                    checkInRaw: row.check_in_raw,
                    evCharging: row.ev_charging,
                    chargeProgress: row.charge_progress,
                    chargeSpeed: row.charge_speed ? parseFloat(row.charge_speed) : null,
                    username: row.username
                };
            }

            if (floorMap[row.floor_id]) {
                floorMap[row.floor_id].slots.push(slot);
            }
        });

        // Assemble the full state object
        const state = {
            floors,
            rates,
            vehicleTypes,
            alerts,
            revenue,
            users
        };

        return res.json(state);
    } catch (e) {
        console.error("GET error:", e);
        return res.status(500).json({ error: e.message });
    }
});

// API Cập nhật trạng thái bãi xe
app.post('/api/state', async (req, res) => {
    console.log(`[POST] /api/state received from ${req.ip} at ${new Date().toLocaleTimeString()}`);
    try {
        if (!pool) {
            return res.status(500).json({ error: "Cơ sở dữ liệu chưa được khởi tạo!" });
        }
        const state = req.body;
        const users = state.users || [];

        // Begin Transaction
        await pool.query('BEGIN');

        // 1. Update rates
        if (state.rates) {
            for (const [key, val] of Object.entries(state.rates)) {
                await pool.query(`
                    INSERT INTO rates (vehicle_type, price)
                    VALUES ($1, $2)
                    ON CONFLICT (vehicle_type) DO UPDATE SET price = EXCLUDED.price
                `, [key, val]);
            }
        }

        // 2. Update vehicleTypes
        if (state.vehicleTypes) {
            for (const [key, val] of Object.entries(state.vehicleTypes)) {
                await pool.query(`
                    INSERT INTO vehicle_types (type_key, type_name)
                    VALUES ($1, $2)
                    ON CONFLICT (type_key) DO UPDATE SET type_name = EXCLUDED.type_name
                `, [key, val]);
            }
        }

        // 3. Update system_alerts (clear old ones and insert the current ones)
        if (state.alerts) {
            await pool.query('DELETE FROM system_alerts');
            for (const a of state.alerts) {
                await pool.query(`
                    INSERT INTO system_alerts (type, message, time)
                    VALUES ($1, $2, $3)
                `, [a.type, a.message, a.time]);
            }
        }

        // 4. Update system_config (revenue)
        if (state.revenue !== undefined) {
            await pool.query(`
                INSERT INTO system_config (key, value)
                VALUES ('revenue', $1)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            `, ['' + state.revenue]);
        }

        // 5. Update floors, slots and slot_vehicles
        if (state.floors) {
            for (const f of state.floors) {
                // Upsert floor
                await pool.query(`
                    INSERT INTO floors (id, name, description, zones, layout)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        zones = EXCLUDED.zones,
                        layout = EXCLUDED.layout
                `, [f.id, f.name, f.description || '', JSON.stringify(f.zones || []), JSON.stringify(f.layout || {})]);

                if (f.slots) {
                    for (const s of f.slots) {
                        // Upsert slot
                        await pool.query(`
                            INSERT INTO slots (id, floor_id, row, col, status, zone_name, zone_type)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (id) DO UPDATE SET
                                status = EXCLUDED.status,
                                zone_name = EXCLUDED.zone_name,
                                zone_type = EXCLUDED.zone_type
                        `, [s.id, f.id, s.row, s.col, s.status, s.zoneName, s.zoneType]);

                        if (s.status === 'occupied' && s.vehicle) {
                            const v = s.vehicle;
                            await pool.query(`
                                INSERT INTO slot_vehicles (slot_id, plate, type, check_in_date, check_in_time, check_in_raw, ev_charging, charge_progress, charge_speed, username)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                ON CONFLICT (slot_id) DO UPDATE SET
                                    plate = EXCLUDED.plate,
                                    type = EXCLUDED.type,
                                    check_in_date = EXCLUDED.check_in_date,
                                    check_in_time = EXCLUDED.check_in_time,
                                    check_in_raw = EXCLUDED.check_in_raw,
                                    ev_charging = EXCLUDED.ev_charging,
                                    charge_progress = EXCLUDED.charge_progress,
                                    charge_speed = EXCLUDED.charge_speed,
                                    username = EXCLUDED.username
                            `, [
                                s.id,
                                v.plate,
                                v.type,
                                v.checkInDate,
                                v.checkInTime,
                                v.checkInRaw,
                                !!v.evCharging,
                                v.chargeProgress !== undefined ? v.chargeProgress : null,
                                v.chargeSpeed !== undefined ? v.chargeSpeed : null,
                                v.username || null
                            ]);
                        } else {
                            // Slot is free, delete vehicle from slot_vehicles
                            await pool.query('DELETE FROM slot_vehicles WHERE slot_id = $1', [s.id]);
                        }
                    }
                }
            }
        }

        // 6. Update users
        for (const u of users) {
            const checkUser = await pool.query('SELECT password FROM users WHERE LOWER(username) = LOWER($1)', [u.username]);
            if (checkUser.rowCount > 0) {
                // User exists, update fields (do not overwrite password if null/empty)
                const passVal = u.password || checkUser.rows[0].password;
                await pool.query(`
                    UPDATE users 
                    SET fullname = $1, 
                        password = $2,
                        phone = $3, 
                        address = $4, 
                        role = $5
                    WHERE LOWER(username) = LOWER($6)
                `, [u.fullname, passVal, u.phone || '', u.address || '', u.role || 'driver', u.username]);
            } else {
                // User does not exist, insert new user
                const passVal = u.password || '123';
                await pool.query(`
                    INSERT INTO users (fullname, username, password, phone, address, role)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [u.fullname, u.username, passVal, u.phone || '', u.address || '', u.role || 'driver']);
            }
        }

        // Commit transaction
        await pool.query('COMMIT');

        state.users = users;
        return res.json({ success: true, state });
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error("POST error:", e);
        return res.status(500).json({ error: e.message });
    }
});

// API Đăng ký tài khoản User/Driver
app.post('/api/register', async (req, res) => {
    console.log(`[POST] /api/register from ${req.ip}`);
    try {
        if (!pool) {
            return res.status(500).json({ error: "Cơ sở dữ liệu chưa được khởi tạo!" });
        }
        const newUser = req.body;
        if (!newUser.username || !newUser.password) {
            return res.status(400).json({ error: "Thiếu tài khoản hoặc mật khẩu!" });
        }
        
        const existsRes = await pool.query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [newUser.username]);
        if (existsRes.rowCount > 0) {
            return res.status(400).json({ error: "Tài khoản đã tồn tại trên hệ thống!" });
        }
        
        const role = newUser.role || 'driver';
        await pool.query(`
            INSERT INTO users (fullname, username, password, phone, address, role)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [newUser.fullname, newUser.username, newUser.password, newUser.phone || '', newUser.address || '', role]);
        
        return res.json({ success: true });
    } catch (e) {
        console.error("Register error:", e);
        return res.status(500).json({ error: e.message });
    }
});

// API Đăng nhập cho User/Driver
app.post('/api/login', async (req, res) => {
    console.log(`[POST] /api/login from ${req.ip}`);
    try {
        if (!pool) {
            return res.status(500).json({ error: "Cơ sở dữ liệu chưa được khởi tạo!" });
        }
        const { username, password } = req.body;
        const resUser = await pool.query(`
            SELECT fullname, username, phone, address, role 
            FROM users 
            WHERE LOWER(username) = LOWER($1) AND password = $2
        `, [username, password]);
        
        if (resUser.rowCount > 0) {
            const user = resUser.rows[0];
            return res.json({ 
                success: true, 
                user: { 
                    fullname: user.fullname, 
                    username: user.username, 
                    phone: user.phone, 
                    address: user.address,
                    role: user.role
                } 
            });
        }
        return res.status(400).json({ error: "Tài khoản hoặc mật khẩu không chính xác!" });
    } catch (e) {
        console.error("Login error:", e);
        return res.status(500).json({ error: e.message });
    }
});

// Khởi động server (Chỉ listen cổng khi chạy cục bộ, Vercel sẽ tự động mount Express app thông qua export)
if (!process.env.VERCEL) {
    const PORT = 8080;
    initDatabase().then(p => {
        pool = p;
        app.listen(PORT, () => {
            console.log(`Server API running on port ${PORT} with PostgreSQL`);
        });
    }).catch(err => {
        console.error("Critical database startup error:", err);
    });
} else {
    // Trên Vercel, khởi động kết nối CSDL PostgreSQL từ xa
    initDatabase().then(p => {
        pool = p;
        console.log("Vercel Database pool initialized successfully.");
    }).catch(err => {
        console.error("Vercel database initialization error:", err);
    });
}

// Xuất Express app để Vercel serverless engine nhận diện và chạy
module.exports = app;
