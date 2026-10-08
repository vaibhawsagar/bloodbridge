const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- UTILS ---
const generateId = (prefix) => prefix + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);

// ==========================================
// 1. AUTHENTICATION (Login & Register)
// ==========================================

app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
        
        if (users.length === 0 || users[0].password_hash !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const user = users[0];
        let profileId = null;
        let approvalStatus = 'Approved'; // Admins are always approved

        if (role === 'donor') {
            const [donors] = await db.execute('SELECT id, registration_status FROM donors WHERE user_id = ?', [user.id]);
            if (donors.length > 0) {
                profileId = donors[0].id;
                approvalStatus = donors[0].registration_status;
            }
        } else if (role === 'recipient') {
            const [recips] = await db.execute('SELECT id, approval_status FROM recipients WHERE user_id = ?', [user.id]);
            if (recips.length > 0) {
                profileId = recips[0].id;
                approvalStatus = recips[0].approval_status;
            }
        }

        res.json({ 
            success: true, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role, profileId, approvalStatus }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

app.post('/api/register', async (req, res) => {
    const { role, name, email, password, phone, address, ...details } = req.body;
    try {
        // Check if email exists for this specific role
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ? AND role = ?', [email, role]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: `Email already registered as a ${role}` });

        const userId = generateId('USR');
        await db.execute(
            'INSERT INTO users (id, name, email, password_hash, role, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, name, email, password, role, phone]
        );

        if (role === 'donor') {
            const donorId = generateId('DON');
            await db.execute(
                `INSERT INTO donors (id, user_id, blood_group, age, weight, haemoglobin_level, health_history, last_donation_date, address) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [donorId, userId, details.bloodGroup, details.age, details.weight, details.haemoglobin, details.healthHistory, details.lastDonationDate || null, address]
            );
        } else if (role === 'recipient') {
            const recId = generateId('REC');
            await db.execute(
                'INSERT INTO recipients (id, user_id, affiliation, address) VALUES (?, ?, ?, ?)',
                [recId, userId, details.affiliation, address]
            );
        }

        // Log activity
        await db.execute('INSERT INTO activity_log (id, action_type, details) VALUES (?, ?, ?)', 
            [generateId('LOG'), 'NEW_REGISTRATION', `New ${role} registered: ${name}`]
        );

        res.status(201).json({ success: true, message: 'Registration successful' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});


app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id as userId, name, email, role FROM users');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// ==========================================
// 2. INVENTORY
// ==========================================

app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM blood_inventory ORDER BY expiry_date ASC');
        const mapped = rows.map(r => ({
            unitId: r.id,
            bloodGroup: r.blood_group,
            quantity: r.quantity,
            collectionDate: r.collection_date,
            expiryDate: r.expiry_date,
            unitStatus: r.unit_status,
            reservedForRequest: r.reserved_for_request
        }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
    }
});

app.post('/api/inventory', async (req, res) => {
    const { bloodGroup, quantity, collectionDate, expiryDate } = req.body;
    try {
        const unitId = generateId('UNT');
        await db.execute(
            'INSERT INTO blood_inventory (id, blood_group, quantity, collection_date, expiry_date) VALUES (?, ?, ?, ?, ?)',
            [unitId, bloodGroup, quantity, collectionDate, expiryDate]
        );
        res.json({ success: true, message: 'Blood unit added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add inventory' });
    }
});


// ==========================================
// 3. BLOOD REQUESTS
// ==========================================

app.get('/api/requests', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.*, rec.affiliation, u.name as recipient_name 
            FROM blood_requests r
            JOIN recipients rec ON r.recipient_id = rec.id
            JOIN users u ON rec.user_id = u.id
            ORDER BY r.request_date DESC
        `);
        const mapped = rows.map(r => ({
            requestId: r.id,
            recipientId: r.recipient_id,
            bloodGroup: r.blood_group,
            quantity: r.quantity,
            urgency: r.urgency,
            purpose: r.purpose,
            requestStatus: r.request_status,
            requestDate: r.request_date,
            approvalDate: r.approval_date,
            rejectionReason: r.rejection_reason,
            affiliation: r.affiliation,
            recipientName: r.recipient_name
        }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
});

app.post('/api/requests', async (req, res) => {
    const { requestId, recipientId, bloodGroup, quantity, urgency, purpose } = req.body;
    try {
        const reqId = requestId || generateId('REQ');
        await db.execute(
            'INSERT INTO blood_requests (id, recipient_id, blood_group, quantity, urgency, purpose) VALUES (?, ?, ?, ?, ?, ?)',
            [reqId, recipientId, bloodGroup, quantity, urgency, purpose]
        );
        res.json({ success: true, message: 'Request submitted successfully', requestId: reqId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to submit request' });
    }
});

app.put('/api/requests/:id/status', async (req, res) => {
    const { status, reason } = req.body;
    try {
        await db.execute(
            'UPDATE blood_requests SET request_status = ?, rejection_reason = ? WHERE id = ?',
            [status, reason || null, req.params.id]
        );
        res.json({ success: true, message: 'Request status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update request' });
    }
});


// ==========================================
// 4. DONORS & CAMPS
// ==========================================

app.get('/api/donors', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT d.*, u.name, u.email, u.phone_number 
            FROM donors d JOIN users u ON d.user_id = u.id
        `);
        const mapped = rows.map(r => ({
            donorId: r.id,
            userId: r.user_id,
            name: r.name,
            email: r.email,
            phone: r.phone_number,
            address: r.address,
            bloodGroup: r.blood_group,
            age: r.age,
            weight: r.weight,
            haemoglobinLevel: r.haemoglobin_level,
            healthHistory: r.health_history,
            lastDonationDate: r.last_donation_date,
            eligibilityStatus: r.eligibility_status,
            registrationStatus: r.registration_status
        }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch donors' });
    }
});

app.put('/api/donors/:id', async (req, res) => {
    const { name, phone_number, address, weight, haemoglobin_level, age, last_donation_date, health_history, eligibility_status, registration_status } = req.body;
    try {
        // First get the user_id for this donor
        const [donorRows] = await db.execute('SELECT user_id FROM donors WHERE id = ?', [req.params.id]);
        if (donorRows.length === 0) return res.status(404).json({ success: false, message: 'Donor not found' });
        const userId = donorRows[0].user_id;

        // Update the users table (name, phone)
        if (name || phone_number) {
            await db.execute(
                'UPDATE users SET name = COALESCE(?, name), phone_number = COALESCE(?, phone_number) WHERE id = ?',
                [name || null, phone_number || null, userId]
            );
        }

        // Update the donors table
        await db.execute(
            `UPDATE donors SET 
             address = COALESCE(?, address), 
             weight = COALESCE(?, weight), 
             haemoglobin_level = COALESCE(?, haemoglobin_level), 
             age = COALESCE(?, age), 
             last_donation_date = COALESCE(?, last_donation_date), 
             health_history = COALESCE(?, health_history),
             eligibility_status = COALESCE(?, eligibility_status),
             registration_status = COALESCE(?, registration_status)
             WHERE id = ?`,
            [
                address || null, 
                weight || null, 
                haemoglobin_level || null, 
                age || null, 
                last_donation_date || null, 
                health_history || null, 
                eligibility_status || null,
                registration_status || null,
                req.params.id
            ]
        );

        res.json({ success: true, message: 'Donor profile updated successfully' });
    } catch (error) {
        console.error('Update donor error:', error);
        res.status(500).json({ success: false, message: 'Failed to update donor profile' });
    }
});

app.get('/api/camps', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM donation_camps ORDER BY camp_date DESC');
        const mapped = rows.map(r => ({
            campId: r.id,
            campName: r.camp_name,
            campDate: r.camp_date,
            campVenue: r.camp_venue,
            targetCollection: r.target_collection,
            status: r.status
        }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch camps' });
    }
});

app.post('/api/camps', async (req, res) => {
    const { campId, campName, campDate, campVenue, targetCollection, status } = req.body;
    try {
        await db.execute(
            'INSERT INTO donation_camps (id, camp_name, camp_date, camp_venue, target_collection, status) VALUES (?, ?, ?, ?, ?, ?)',
            [campId, campName, campDate, campVenue, targetCollection, status || 'Scheduled']
        );
        res.json({ success: true, message: 'Camp scheduled successfully' });
    } catch (error) {
        console.error("Failed POST /camps:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/camps/:id', async (req, res) => {
    const { campName, campDate, campVenue, targetCollection, status } = req.body;
    try {
        if (status) {
            await db.execute('UPDATE donation_camps SET status = ? WHERE id = ?', [status, req.params.id]);
        } else {
            await db.execute(
                'UPDATE donation_camps SET camp_name = ?, camp_date = ?, camp_venue = ?, target_collection = ? WHERE id = ?',
                [campName, campDate, campVenue, targetCollection, req.params.id]
            );
        }
        res.json({ success: true, message: 'Camp updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update camp' });
    }
});

app.delete('/api/camps/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM donation_camps WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Camp deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete camp' });
    }
});

// ==========================================
// 5. CAMP REGISTRATIONS & DONATIONS
// ==========================================

// Get all registrations for a specific camp (with donor details)
app.get('/api/camps/:id/registrations', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT cr.id as registrationId, cr.donor_id as donorId, cr.status,
                   cr.registration_date as registrationDate,
                   d.blood_group as bloodGroup, u.name, u.email
            FROM camp_registrations cr
            JOIN donors d ON cr.donor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE cr.camp_id = ?
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Failed to fetch camp registrations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
});

// Get ALL registrations (for donor portal / localStorage fallback sync)
app.get('/api/camp-registrations', async (req, res) => {
    try {
        const { donorId } = req.query;
        let query = `SELECT cr.*, dc.camp_name as campName, dc.camp_date as campDate, dc.camp_venue as campVenue
                     FROM camp_registrations cr
                     JOIN donation_camps dc ON cr.camp_id = dc.id`;
        const params = [];
        if (donorId) {
            query += ' WHERE cr.donor_id = ?';
            params.push(donorId);
        }
        const [rows] = await db.execute(query, params);
        const mapped = rows.map(r => ({
            registrationId: r.id,
            donorId: r.donor_id,
            campId: r.camp_id,
            campName: r.campName,
            campDate: r.campDate,
            campVenue: r.campVenue,
            registrationDate: r.registration_date,
            status: r.status
        }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
});

// Register a donor for a camp
app.post('/api/camp-registrations', async (req, res) => {
    const { registrationId, donorId, campId, registrationDate, status } = req.body;
    try {
        // Prevent duplicate / Handle re-registration
        const [existing] = await db.execute(
            'SELECT id, status FROM camp_registrations WHERE donor_id = ? AND camp_id = ?',
            [donorId, campId]
        );
        if (existing.length > 0) {
            const existingId = existing[0].id;
            // If they are re-registering, update the status back to Registered
            await db.execute('UPDATE camp_registrations SET status = ? WHERE id = ?', [status || 'Registered', existingId]);
            return res.json({ success: true, message: 'Registered successfully', registrationId: existingId });
        }
        
        const regId = registrationId || generateId('REG');
        await db.execute(
            'INSERT INTO camp_registrations (id, donor_id, camp_id, registration_date, status) VALUES (?, ?, ?, ?, ?)',
            [regId, donorId, campId, registrationDate || new Date().toISOString().split('T')[0], status || 'Registered']
        );
        res.json({ success: true, message: 'Registered successfully', registrationId: regId });
    } catch (error) {
        console.error('Failed to register for camp:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update a camp registration status (cancel)
app.put('/api/camp-registrations/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await db.execute('UPDATE camp_registrations SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: 'Registration updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update registration' });
    }
});

// Complete a camp: log donations for checked donors, update inventory, mark camp completed
app.post('/api/camps/:id/complete', async (req, res) => {
    const campId = req.params.id;
    const { donorIds } = req.body; // array of donor IDs who actually donated
    if (!Array.isArray(donorIds)) {
        return res.status(400).json({ success: false, message: 'donorIds must be an array' });
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const donations = [];

        for (const donorId of donorIds) {
            // Check not already logged
            const [existing] = await db.execute(
                'SELECT id FROM donations WHERE donor_id = ? AND camp_id = ?', [donorId, campId]
            );
            if (existing.length > 0) continue;

            // Get donor blood group
            const [donors] = await db.execute('SELECT blood_group, user_id FROM donors WHERE id = ?', [donorId]);
            if (donors.length === 0) continue;
            const bloodGroup = donors[0].blood_group;
            const userId = donors[0].user_id;

            // Generate IDs
            const donationId = 'DON' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
            const certNum = 'CERT-' + campId + '-' + donorId.slice(-4) + '-' + Date.now().toString().slice(-4);
            const unitId = 'UNT' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

            // Add blood inventory unit FIRST (donations FK references it)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 35);
            const expiry = expiryDate.toISOString().split('T')[0];
            await db.execute(
                'INSERT INTO blood_inventory (id, blood_group, quantity, collection_date, expiry_date, unit_status) VALUES (?, ?, ?, ?, ?, ?)',
                [unitId, bloodGroup, 1, today, expiry, 'Available']
            );

            // Now insert donation record (unit_id now exists in blood_inventory)
            await db.execute(
                'INSERT INTO donations (id, donor_id, camp_id, unit_id, donation_date, certificate_number) VALUES (?, ?, ?, ?, ?, ?)',
                [donationId, donorId, campId, unitId, today, certNum]
            );

            // Update donor's last donation date
            await db.execute('UPDATE donors SET last_donation_date = ? WHERE id = ?', [today, donorId]);

            // Send notification to donor
            const notifId = 'NOTIF' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
            await db.execute(
                'INSERT INTO notifications (id, recipient_id, recipient_type, notification_message, notification_type) VALUES (?, ?, ?, ?, ?)',
                [notifId, userId, 'Donor', `Thank you for donating blood! Your certificate number is ${certNum}.`, 'Donation']
            );

            donations.push({ donorId, donationId, certNum, bloodGroup });
        }

        // Mark camp as Completed
        await db.execute("UPDATE donation_camps SET status = 'Completed' WHERE id = ?", [campId]);

        // Log activity
        await db.execute('INSERT INTO activity_log (id, action_type, details) VALUES (?, ?, ?)',
            [generateId('LOG'), 'CAMP_COMPLETED', `Camp ${campId} completed. ${donations.length} donation(s) logged.`]
        );

        res.json({ success: true, message: `Camp completed. ${donations.length} donation(s) recorded.`, donations });
    } catch (error) {
        console.error('Failed to complete camp:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all donations (optionally filtered by donor)
app.get('/api/donations', async (req, res) => {
    try {
        const { donorId } = req.query;
        let query = `
            SELECT dn.*, dc.camp_name, dc.camp_venue, d.blood_group,
                   u.name as donor_name
            FROM donations dn
            JOIN donation_camps dc ON dn.camp_id = dc.id
            JOIN donors d ON dn.donor_id = d.id
            JOIN users u ON d.user_id = u.id
        `;
        const params = [];
        if (donorId) {
            query += ' WHERE dn.donor_id = ?';
            params.push(donorId);
        }
        query += ' ORDER BY dn.donation_date DESC';
        const [rows] = await db.execute(query, params);
        const mapped = rows.map(r => ({
            donationId: r.id,
            donorId: r.donor_id,
            campId: r.camp_id,
            campName: r.camp_name,
            campVenue: r.camp_venue,
            bloodGroup: r.blood_group,
            donorName: r.donor_name,
            donationDate: r.donation_date,
            certificateNumber: r.certificate_number,
            unitId: r.unit_id
        }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch donations' });
    }
});

// ==========================================
// 6. RECIPIENTS & NOTIFICATIONS
// ==========================================

// Get all recipients (joined with users)
app.get('/api/recipients', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.id as recipientId, r.approval_status as approvalStatus, r.affiliation,
                   u.id as userId, u.name, u.email, u.phone_number as phone, r.address
            FROM recipients r
            JOIN users u ON r.user_id = u.id
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Failed to fetch recipients:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch recipients' });
    }
});

// Update recipient profile
app.put('/api/recipients/:id', async (req, res) => {
    const { name, phone, address, affiliation } = req.body;
    try {
        const [rec] = await db.execute('SELECT user_id FROM recipients WHERE id = ?', [req.params.id]);
        if (rec.length === 0) return res.status(404).json({ success: false, message: 'Recipient not found' });
        
        const userId = rec[0].user_id;
        
        await db.execute('UPDATE users SET name = ?, phone_number = ? WHERE id = ?', [name, phone, userId]);
        await db.execute('UPDATE recipients SET address = ?, affiliation = ? WHERE id = ?', 
            [address, affiliation, req.params.id]
        );
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Failed to update recipient:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Get notifications
app.get('/api/notifications', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM notifications ORDER BY sent_date DESC');
        const mapped = rows.map(r => ({
            notificationId: r.id,
            recipientId: r.recipient_id,
            recipientType: r.recipient_type,
            notificationMessage: r.notification_message,
            notificationType: r.notification_type,
            sentDate: r.sent_date,
            readStatus: r.read_status
        }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

app.post('/api/notifications', async (req, res) => {
    const { recipientId, recipientType, notificationMessage, notificationType } = req.body;
    try {
        const notifId = generateId('NOT');
        await db.execute(
            'INSERT INTO notifications (id, recipient_id, recipient_type, notification_message, notification_type, read_status) VALUES (?, ?, ?, ?, ?, ?)',
            [notifId, recipientId, recipientType, notificationMessage, notificationType, 'Unread']
        );
        res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send notification' });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        await db.execute("UPDATE notifications SET read_status = 'Read' WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`BloodBridge Backend Server is running on port ${PORT}`);
});
