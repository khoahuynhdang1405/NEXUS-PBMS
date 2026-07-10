const { initDatabase } = require('./db');
initDatabase().then(pool => {
    console.log("SUCCESS: Database connection pool initialized successfully!");
    process.exit(0);
}).catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
