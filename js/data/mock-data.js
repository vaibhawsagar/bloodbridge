// mock-data.js - REWRITTEN TO USE REAL API
// We kept the file name as "mock-data.js" so we don't have to change 20+ HTML files,
// but it is now the real API client!

const API_BASE_URL = 'http://localhost:3000/api';

const MockData = {
    STORAGE_KEYS: {
        USERS: 'bb_users',
        DONORS: 'bb_donors',
        RECIPIENTS: 'bb_recipients',
        BLOOD_INVENTORY: 'bb_blood_inventory',
        DONATION_CAMPS: 'bb_donation_camps',
        DONATIONS: 'bb_donations',
        BLOOD_REQUESTS: 'bb_blood_requests',
        NOTIFICATIONS: 'bb_notifications',
        ACTIVITY_LOG: 'bb_activity_log',
        ELIGIBILITY: 'bb_eligibility',
        CAMP_REGS: 'bb_camp_regs'
    },
    // We map old local storage keys to new SQL table names
    tableMap: {
        'bb_users': 'users',
        'bb_donors': 'donors',
        'bb_recipients': 'recipients',
        'bb_blood_inventory': 'blood_inventory',
        'bb_blood_requests': 'blood_requests',
        'bb_donation_camps': 'donation_camps',
        'bb_donations': 'donations',
        'bb_camp_regs': 'camp_registrations',
        'bb_notifications': 'notifications',
        'bb_activity_log': 'activity_log',
        'bb_eligibility': 'eligibility_criteria'
    },

    // --- Backwards Compatibility Shims ---
    add(storageKey, item) {
        return this.insert(storageKey, item);
    },
    saveAll(storageKey, arr) {
        localStorage.setItem(storageKey, JSON.stringify(arr));
    },
    async update(storageKey, idKeyOrId, idValueOrUpdates, updatesOpt) {
        let id, updates;
        if (arguments.length === 4) {
            id = idValueOrUpdates;
            updates = updatesOpt;
        } else {
            id = idKeyOrId;
            updates = idValueOrUpdates;
        }
        
        // local fallback
        const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const idx = arr.findIndex(item => item[idKeyOrId] === id || item.id === id);
        if (idx > -1) {
            arr[idx] = { ...arr[idx], ...updates };
            localStorage.setItem(storageKey, JSON.stringify(arr));
        }

        if (storageKey === 'bb_blood_requests') return this._fetch(`/requests/${id}/status`, { method: 'PUT', body: JSON.stringify(updates) }).catch(e=>console.warn(e));
        if (storageKey === 'bb_donation_camps') return this._fetch(`/camps/${id}`, { method: 'PUT', body: JSON.stringify(updates) }).catch(e=>console.warn(e));
        if (storageKey === 'bb_donors') return this._fetch(`/donors/${id}`, { method: 'PUT', body: JSON.stringify(updates) }).catch(e=>console.warn(e));
        if (storageKey === 'bb_camp_regs') return this._fetch(`/camp-registrations/${id}`, { method: 'PUT', body: JSON.stringify(updates) }).catch(e=>console.warn(e));
        if (storageKey === 'bb_recipients') return this._fetch(`/recipients/${id}`, { method: 'PUT', body: JSON.stringify(updates) }).catch(e=>console.warn(e));
        if (storageKey === 'bb_notifications' && updates.readStatus) return this._fetch(`/notifications/${id}/read`, { method: 'PUT' }).catch(e=>console.warn(e));
        
        console.warn(`Update not implemented on backend yet for ${storageKey}`);
        return true;
    },
    // --- End Shims ---

    async _fetch(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'API request failed');
            return data;
        } catch (error) {
            console.error(`API Error at ${endpoint}:`, error);
            throw error;
        }
    },

    // Mapped standard functions for generic tables
    async getAll(storageKey) {
        try {
            // If we have a dedicated route, use it
            if (storageKey === 'bb_users') return (await this._fetch('/users')).data || [];
            if (storageKey === 'bb_blood_inventory') return (await this._fetch('/inventory')).data || [];
            if (storageKey === 'bb_blood_requests') return (await this._fetch('/requests')).data || [];
            if (storageKey === 'bb_donors') return (await this._fetch('/donors')).data || [];
            if (storageKey === 'bb_donation_camps') return (await this._fetch('/camps')).data || [];
            if (storageKey === 'bb_camp_regs') return (await this._fetch('/camp-registrations')).data || [];
            if (storageKey === 'bb_donations') return (await this._fetch('/donations')).data || [];
            if (storageKey === 'bb_recipients') return (await this._fetch('/recipients')).data || [];
            if (storageKey === 'bb_notifications') return (await this._fetch('/notifications')).data || [];
        } catch (e) {
            console.warn(`Failed to fetch ${storageKey} from API, falling back to localStorage:`, e);
        }
        
        // Otherwise use local storage fallback
        return JSON.parse(localStorage.getItem(storageKey) || '[]');
    },

    async getById(storageKey, id) {
        const all = await this.getAll(storageKey);
        // Find by id, userId, donorId, etc depending on the object
        return all.find(item => item.id === id || item.userId === id || item.donorId === id || item.recipientId === id || item.requestId === id);
    },

    async insert(storageKey, item) {
        // Fallback to local storage
        const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
        arr.push(item);
        localStorage.setItem(storageKey, JSON.stringify(arr));

        try {
            if (storageKey === 'bb_blood_inventory') return await this._fetch('/inventory', { method: 'POST', body: JSON.stringify(item) });
            if (storageKey === 'bb_blood_requests') return await this._fetch('/requests', { method: 'POST', body: JSON.stringify(item) });
            if (storageKey === 'bb_donation_camps') return await this._fetch('/camps', { method: 'POST', body: JSON.stringify(item) });
            if (storageKey === 'bb_donors') return await this._fetch('/donors', { method: 'POST', body: JSON.stringify(item) });
            if (storageKey === 'bb_camp_regs') return await this._fetch('/camp-registrations', { method: 'POST', body: JSON.stringify(item) });
            if (storageKey === 'bb_notifications') return await this._fetch('/notifications', { method: 'POST', body: JSON.stringify(item) });
        } catch(e) { console.warn(e); }
        
        console.warn(`Insert not implemented on backend yet for ${storageKey}`);
        return true;
    },

    async delete(storageKey, id) {
        // Fallback to local storage
        let arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
        arr = arr.filter(item => item.id !== id && item.campId !== id && item.requestId !== id && item.unitId !== id);
        localStorage.setItem(storageKey, JSON.stringify(arr));

        try {
            if (storageKey === 'bb_donation_camps') return await this._fetch(`/camps/${id}`, { method: 'DELETE' });
            if (storageKey === 'bb_blood_requests') return await this._fetch(`/requests/${id}`, { method: 'DELETE' });
        } catch(e) { console.warn(e); }
        
        console.warn(`Delete not implemented on backend yet for ${storageKey}`);
        return true;
    },

    // Auth specific (used by the new login.js/register.js)
    async login(email, password, role) {
        return this._fetch('/login', { method: 'POST', body: JSON.stringify({ email, password, role }) });
    },
    
    async register(data) {
        return this._fetch('/register', { method: 'POST', body: JSON.stringify(data) });
    },

    generateId(prefix) {
        return prefix + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
    },

    initialize() {
        console.log("Database initialized via real Node.js Backend!");
    }
};

window.MockData = MockData;
