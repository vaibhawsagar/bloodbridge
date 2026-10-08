const API_BASE_URL = 'http://localhost:3000/api';

const ApiClient = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        
        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            return data;
        } catch (error) {
            console.error(`API Error at ${endpoint}:`, error);
            throw error;
        }
    },

    async login(email, password, role) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, role })
        });
    },

    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async getInventory() {
        return this.request('/inventory');
    },

    async getDonors() {
        return this.request('/donors');
    },

    async getRequests() {
        return this.request('/requests');
    }
};

window.ApiClient = ApiClient;
