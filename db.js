const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/postgres';
const dbName = 'nexus_parking';

const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: '12345',
        database: dbName
      };

async function initDatabase() {
    let pool;
    if (process.env.DATABASE_URL) {
        // Trên môi trường cloud (Vercel/Supabase/Neon), sử dụng trực tiếp kết nối chuỗi đã có
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    } else {
        // Kết nối với db default 'postgres' để kiểm tra và tạo db 'nexus_parking' nếu chưa có ở môi trường cục bộ
        const client = new Client({
            connectionString: connectionString
        });
        try {
            await client.connect();
            const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
            if (res.rowCount === 0) {
                console.log(`Database "${dbName}" does not exist. Creating...`);
                await client.query(`CREATE DATABASE ${dbName}`);
                console.log(`Database "${dbName}" created successfully.`);
            }
            await client.end();
        } catch (e) {
            console.error("Lỗi kiểm tra/tạo database cục bộ:", e);
            try { await client.end(); } catch (_) {}
        }
        pool = new Pool(poolConfig);
    }

    try {
        // Bảng 1: users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fullname VARCHAR(255) NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                address VARCHAR(255),
                role VARCHAR(50) DEFAULT 'driver'
            )
        `);

        // Bảng 2: floors
        await pool.query(`
            CREATE TABLE IF NOT EXISTS floors (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description VARCHAR(255),
                zones JSONB NOT NULL,
                layout JSONB
            )
        `);
        // Đảm bảo cột layout tồn tại nếu bảng đã được tạo trước đó
        await pool.query(`
            ALTER TABLE floors ADD COLUMN IF NOT EXISTS layout JSONB
        `);

        // Cập nhật layout cho các floor cũ đang bị NULL
        const nullLayouts = await pool.query(`SELECT id FROM floors WHERE layout IS NULL`);
        if (nullLayouts.rowCount > 0) {
            console.log("Found floors with NULL layout. Migrating layouts from state.json...");
            const stateFilePath = path.join(__dirname, 'state.json');
            let fileFloors = [];
            if (fs.existsSync(stateFilePath)) {
                try {
                    const fileState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
                    fileFloors = fileState.floors || [];
                } catch(e) {
                    console.error("Error reading state.json for layout migration:", e);
                }
            }
            // Fallback default layouts if state.json is missing/invalid
            const defaultLayouts = {
                "B2": {"rows":7,"cols":8,"driveways":[4]},
                "B1": {"rows":5,"cols":10,"driveways":[2]},
                "G": {"rows":7,"cols":7,"driveways":[1,4]},
                "F1": {"rows":5,"cols":8,"driveways":[3]},
                "F2": {"rows":5,"cols":7,"driveways":[2]}
            };
            for (const row of nullLayouts.rows) {
                const matchedFileFloor = fileFloors.find(f => f.id === row.id);
                const layoutVal = matchedFileFloor ? matchedFileFloor.layout : (defaultLayouts[row.id] || {"rows":5,"cols":5,"driveways":[]});
                await pool.query(`UPDATE floors SET layout = $1 WHERE id = $2`, [JSON.stringify(layoutVal), row.id]);
                console.log(`Updated floor ${row.id} layout to:`, JSON.stringify(layoutVal));
            }
        }

        // Bảng 3: slots
        await pool.query(`
            CREATE TABLE IF NOT EXISTS slots (
                id VARCHAR(50) PRIMARY KEY,
                floor_id VARCHAR(50) NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
                row INT NOT NULL,
                col INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'available',
                zone_name VARCHAR(50) NOT NULL,
                zone_type VARCHAR(50) NOT NULL
            )
        `);

        // Bảng 4: slot_vehicles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS slot_vehicles (
                slot_id VARCHAR(50) PRIMARY KEY REFERENCES slots(id) ON DELETE CASCADE,
                plate VARCHAR(50) NOT NULL,
                type VARCHAR(50) NOT NULL,
                check_in_date VARCHAR(50),
                check_in_time VARCHAR(50),
                check_in_raw VARCHAR(100),
                ev_charging BOOLEAN DEFAULT false,
                charge_progress INT,
                charge_speed NUMERIC(5,2),
                username VARCHAR(255) REFERENCES users(username) ON DELETE SET NULL
            )
        `);

        // Bảng 5: rates
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rates (
                vehicle_type VARCHAR(50) PRIMARY KEY,
                price INT NOT NULL
            )
        `);

        // Bảng 6: vehicle_types
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vehicle_types (
                type_key VARCHAR(50) PRIMARY KEY,
                type_name VARCHAR(255) NOT NULL
            )
        `);

        // Bảng 7: system_alerts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_alerts (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                time VARCHAR(50) NOT NULL
            )
        `);

        // Bảng 8: system_config
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_config (
                key VARCHAR(50) PRIMARY KEY,
                value VARCHAR(255) NOT NULL
            )
        `);

        console.log("Database relational tables checked/created successfully.");

        // 3. Di chuyển dữ liệu mặc định/cũ nếu các bảng trống
        const floorsCount = await pool.query(`SELECT COUNT(*) FROM floors`);
        if (parseInt(floorsCount.rows[0].count) === 0) {
            console.log("Database relational tables are empty. Initializing migration...");
            
            const stateFilePath = path.join(__dirname, 'state.json');
            let initialState = null;

            // Thử kiểm tra xem có dữ liệu JSONB cũ từ bảng parking_state hay không
            let hasOldState = false;
            try {
                const checkOldRes = await pool.query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'parking_state'`);
                if (parseInt(checkOldRes.rows[0].count) > 0) {
                    const oldStateCount = await pool.query(`SELECT COUNT(*) FROM parking_state`);
                    if (parseInt(oldStateCount.rows[0].count) > 0) {
                        const oldStateRes = await pool.query(`SELECT data FROM parking_state WHERE id = 1`);
                        if (oldStateRes.rowCount > 0) {
                            initialState = oldStateRes.rows[0].data;
                            hasOldState = true;
                            console.log("Found old parking_state. Migrating from old database state...");
                        }
                    }
                }
            } catch (err) {
                console.log("No old parking_state found, or query failed. Using state.json file.");
            }

            if (!hasOldState) {
                if (fs.existsSync(stateFilePath)) {
                    initialState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
                } else {
                    initialState = {
                        floors: [],
                        rates: {
                            car: 20000,
                            suv: 30000,
                            ev: 20000,
                            motorbike: 5000,
                            handicap: 10000,
                            evChargingSurcharge: 15000
                        },
                        vehicleTypes: {
                            car: "Ô tô tiêu chuẩn",
                            suv: "SUV / Xe cỡ lớn",
                            ev: "Ô tô điện (EV)",
                            motorbike: "Xe máy",
                            handicap: "Xe ưu tiên / Khuyết tật"
                        },
                        alerts: [
                            { type: "info", message: "Hệ thống đã khởi tạo qua PostgreSQL cấu trúc quan hệ.", time: "08:00:00" }
                        ],
                        revenue: 1820000
                    };
                }
            }

            // Tách users ra để lưu vào bảng users
            const users = initialState.users || [];
            for (const u of users) {
                try {
                    await pool.query(`
                        INSERT INTO users (fullname, username, password, phone, address, role)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (username) DO NOTHING
                    `, [u.fullname, u.username, u.password, u.phone, u.address, u.role || 'driver']);
                } catch (err) {
                    console.error("Lỗi di chuyển user:", err);
                }
            }

            // Lưu floors & slots & slot_vehicles
            const floorsList = initialState.floors || [];
            for (const f of floorsList) {
                try {
                    await pool.query(`
                        INSERT INTO floors (id, name, description, zones, layout)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (id) DO UPDATE SET layout = EXCLUDED.layout
                    `, [f.id, f.name, f.description || '', JSON.stringify(f.zones || []), JSON.stringify(f.layout || {})]);
                    
                    const slots = f.slots || [];
                    for (const s of slots) {
                        await pool.query(`
                            INSERT INTO slots (id, floor_id, row, col, status, zone_name, zone_type)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (id) DO NOTHING
                        `, [s.id, f.id, s.row, s.col, s.status || 'available', s.zoneName || '', s.zoneType || '']);
                        
                        if (s.status === 'occupied' && s.vehicle) {
                            const v = s.vehicle;
                            await pool.query(`
                                INSERT INTO slot_vehicles (slot_id, plate, type, check_in_date, check_in_time, check_in_raw, ev_charging, charge_progress, charge_speed, username)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                ON CONFLICT (slot_id) DO NOTHING
                            `, [
                                s.id, 
                                v.plate || '', 
                                v.type || '', 
                                v.checkInDate || '', 
                                v.checkInTime || '', 
                                v.checkInRaw || '', 
                                !!v.evCharging, 
                                v.chargeProgress !== undefined ? v.chargeProgress : null, 
                                v.chargeSpeed !== undefined ? v.chargeSpeed : null,
                                v.username || null
                            ]);
                        }
                    }
                } catch (err) {
                    console.error(`Lỗi di chuyển floor ${f.id}:`, err);
                }
            }

            // Lưu rates
            const rates = initialState.rates || {};
            for (const [key, val] of Object.entries(rates)) {
                await pool.query(`
                    INSERT INTO rates (vehicle_type, price)
                    VALUES ($1, $2)
                    ON CONFLICT (vehicle_type) DO UPDATE SET price = EXCLUDED.price
                `, [key, val]);
            }

            // Lưu vehicle_types
            const vehicleTypes = initialState.vehicleTypes || {};
            for (const [key, val] of Object.entries(vehicleTypes)) {
                await pool.query(`
                    INSERT INTO vehicle_types (type_key, type_name)
                    VALUES ($1, $2)
                    ON CONFLICT (type_key) DO UPDATE SET type_name = EXCLUDED.type_name
                `, [key, val]);
            }

            // Lưu alerts
            const alertsList = initialState.alerts || [];
            for (const a of alertsList) {
                await pool.query(`
                    INSERT INTO system_alerts (type, message, time)
                    VALUES ($1, $2, $3)
                `, [a.type, a.message, a.time]);
            }

            // Lưu system_config (revenue)
            const revenue = initialState.revenue !== undefined ? initialState.revenue : 0;
            await pool.query(`
                INSERT INTO system_config (key, value)
                VALUES ('revenue', $1)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            `, ['' + revenue]);

            console.log("Data migration to relational schema completed successfully.");
        }
    } catch (err) {
        console.error("Lỗi cấu hình bảng database:", err);
    }
    return pool;
}

module.exports = { initDatabase, poolConfig };
