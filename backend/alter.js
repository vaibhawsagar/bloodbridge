const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterTable() {
    try {
        const db = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bloodbridge'
        });

        console.log('Connected to DB. Altering users table...');
        
        // Try to drop the existing unique constraint on email. 
        // In MySQL, the constraint name is usually the column name if created with UNIQUE keyword inline.
        try {
            await db.execute('ALTER TABLE users DROP INDEX email');
            console.log('Dropped unique constraint on email.');
        } catch (e) {
            console.log('Index "email" might not exist or already dropped.', e.message);
        }

        // Add the composite unique constraint
        try {
            await db.execute('ALTER TABLE users ADD UNIQUE INDEX unique_email_role (email, role)');
            console.log('Added composite unique constraint on (email, role).');
        } catch (e) {
            console.log('Composite constraint might already exist.', e.message);
        }

        console.log('Database schema update complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

alterTable();
