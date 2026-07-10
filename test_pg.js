const { Client } = require('pg');

const passwords = [
    'root', 'sa', 'pgadmin', 'pgadmin4', 'manager', '1', 
    'password', '12345', '12345678', '123456789', 
    'postgres123', 'admin123', 'admin1234', 'nexus', 'parking'
];
async function test() {
    for (const pwd of passwords) {
        console.log(`Testing password: "${pwd}"`);
        const client = new Client({
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: pwd,
            database: 'postgres'
        });
        try {
            await client.connect();
            console.log(`SUCCESS! Password is: "${pwd}"`);
            await client.end();
            process.exit(0);
        } catch (e) {
            console.log(`Failed: ${e.message}`);
        }
    }
    console.log("All passwords failed.");
    process.exit(1);
}
test();
