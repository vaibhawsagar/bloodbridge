-- BloodBridge MySQL Database Schema
-- Run this script in MySQL Workbench or phpMyAdmin to create the tables.

CREATE DATABASE IF NOT EXISTS bloodbridge;
USE bloodbridge;

-- 1. Users Table (Base table for Auth)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'donor', 'recipient') NOT NULL,
    phone_number VARCHAR(15),
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_email_role (email, role)
);

-- 2. Donors Table
CREATE TABLE donors (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    age INT,
    weight DECIMAL(5,2),
    haemoglobin_level DECIMAL(5,2),
    health_history TEXT,
    last_donation_date DATE,
    address TEXT,
    eligibility_status ENUM('Eligible', 'Not Eligible') DEFAULT 'Not Eligible',
    registration_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Recipients / Hospitals Table
CREATE TABLE recipients (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    affiliation VARCHAR(150),
    address TEXT,
    approval_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Blood Requests
CREATE TABLE blood_requests (
    id VARCHAR(50) PRIMARY KEY,
    recipient_id VARCHAR(50) NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    quantity INT NOT NULL,
    urgency ENUM('Normal', 'Urgent', 'Emergency') NOT NULL,
    purpose TEXT NOT NULL,
    request_status ENUM('Submitted', 'CheckingInventory', 'PendingStock', 'PendingApproval', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled') DEFAULT 'Submitted',
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    approval_date DATETIME,
    rejection_reason TEXT,
    FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE
);

-- 5. Blood Inventory
CREATE TABLE blood_inventory (
    id VARCHAR(50) PRIMARY KEY,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    quantity INT NOT NULL,
    collection_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    unit_status ENUM('Available', 'Reserved', 'Issued', 'Expired') DEFAULT 'Available',
    reserved_for_request VARCHAR(50) NULL,
    FOREIGN KEY (reserved_for_request) REFERENCES blood_requests(id) ON DELETE SET NULL
);

-- 6. Donation Camps
CREATE TABLE donation_camps (
    id VARCHAR(50) PRIMARY KEY,
    camp_name VARCHAR(150) NOT NULL,
    camp_date DATE NOT NULL,
    camp_venue TEXT NOT NULL,
    target_collection INT NOT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled'
);

-- 7. Camp Registrations
CREATE TABLE camp_registrations (
    id VARCHAR(50) PRIMARY KEY,
    donor_id VARCHAR(50) NOT NULL,
    camp_id VARCHAR(50) NOT NULL,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Registered', 'Cancelled') DEFAULT 'Registered',
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    FOREIGN KEY (camp_id) REFERENCES donation_camps(id) ON DELETE CASCADE
);

-- 8. Donations (Records of actual donations)
CREATE TABLE donations (
    id VARCHAR(50) PRIMARY KEY,
    donor_id VARCHAR(50) NOT NULL,
    camp_id VARCHAR(50),
    unit_id VARCHAR(50),
    donation_date DATE NOT NULL,
    certificate_number VARCHAR(100),
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    FOREIGN KEY (camp_id) REFERENCES donation_camps(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES blood_inventory(id) ON DELETE SET NULL
);

-- 9. Notifications
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    recipient_id VARCHAR(50) NOT NULL,
    recipient_type ENUM('Admin', 'Donor', 'Recipient') NOT NULL,
    notification_type VARCHAR(50),
    message TEXT NOT NULL,
    read_status ENUM('Read', 'Unread') DEFAULT 'Unread',
    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Activity Log
CREATE TABLE activity_log (
    id VARCHAR(50) PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Eligibility Criteria (Single row config table)
CREATE TABLE eligibility_criteria (
    id INT PRIMARY KEY DEFAULT 1,
    min_age INT DEFAULT 18,
    max_age INT DEFAULT 65,
    min_weight DECIMAL(5,2) DEFAULT 50.0,
    min_haemoglobin DECIMAL(5,2) DEFAULT 12.5,
    min_gap_days INT DEFAULT 90
);

-- Insert Default Admin User
INSERT INTO users (id, name, email, password_hash, role) 
VALUES ('ADM001', 'System Admin', 'admin@bloodbridge.com', 'Admin@123', 'admin');

-- Insert Default Eligibility Criteria
INSERT INTO eligibility_criteria (id, min_age, max_age, min_weight, min_haemoglobin, min_gap_days) 
VALUES (1, 18, 65, 50.0, 12.5, 90);
