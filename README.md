# BloodBridge 🩸

BloodBridge is a comprehensive Blood Bank Management System built with HTML, CSS, JavaScript, Node.js, Express, and MySQL. It connects Blood Donors, Hospitals (Recipients), and Blood Bank Administrators into a single seamless platform.

## Features
- **Admin Dashboard**: Manage inventory, schedule donation camps, approve donors, and process blood requests.
- **Donor Portal**: Register for camps, track donation history, download certificates, and check eligibility.
- **Recipient/Hospital Portal**: Check real-time blood availability, submit blood requests, and track request status.
- **Automated Workflows**: Smart state-machine tracking for blood requests and automated inventory updates.

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+), FontAwesome
- **Backend**: Node.js, Express.js
- **Database**: MySQL (using `mysql2/promise`)

## How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone <your-github-repo-url>
   cd "BLOOD BRIDGE"
   ```

2. **Database Setup:**
   - Ensure MySQL is running on your machine.
   - Run the SQL scripts (if provided) to create the schema and seed data.

3. **Backend Setup:**
   - Navigate to the backend folder:
     ```bash
     cd backend
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Create a `.env` file in the `backend` folder with your database credentials:
     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=bloodbridge
     PORT=3000
     ```
   - Start the server:
     ```bash
     npm start
     ```

4. **Frontend Setup:**
   - You can serve the root folder using a simple live server (like VS Code Live Server) or simply open `index.html` in your browser.
