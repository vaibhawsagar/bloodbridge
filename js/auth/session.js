/**
 * BloodBridge – Session Management (js/auth/session.js)
 * Handles login session stored in sessionStorage.
 * Replace with server-side session/JWT when backend is connected.
 *
 * Session object structure:
 * {
 *   userId:      string,               // e.g. 'USR001'
 *   donorId:     string | null,        // 'DON001'  (role = donor)
 *   recipientId: string | null,        // 'REC001'  (role = recipient)
 *   name:        string,
 *   email:       string,
 *   role:        'admin' | 'donor' | 'recipient'
 * }
 */

'use strict';

const SESSION_KEY = 'bb_session';

// ─────────────────────────────────────────────
// Path utilities
// ─────────────────────────────────────────────

/**
 * Returns the number of directory levels from root to the current page.
 * root/index.html          → depth 0
 * root/pages/auth/…       → depth 2
 * root/pages/donor/…      → depth 2
 * root/pages/recipient/…  → depth 2
 * root/pages/admin/…      → depth 2
 */
function _getDepth() {
  const path = window.location.pathname.replace(/\\/g, '/');
  if (path.match(/\/pages\/[^/]+\/[^/]+$/)) return 2;
  if (path.match(/\/pages\/[^/]+$/)) return 1;
  return 0;
}

/**
 * Returns a relative path from the current page back to the project root.
 * e.g. from pages/donor/dashboard.html → '../../'
 */
function _rootPath() {
  const depth = _getDepth();
  if (depth === 0) return './';
  return '../'.repeat(depth);
}

// ─────────────────────────────────────────────
// Session API
// ─────────────────────────────────────────────

const Session = {

  /** Persist a new session after successful login. */
  set(userData) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  },

  /** Retrieve the current session, or null if not logged in. */
  get() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** Destroy the current session (logout). */
  clear() {
    sessionStorage.removeItem(SESSION_KEY);
  },

  /** True if a session exists. */
  isLoggedIn() {
    return this.get() !== null;
  },

  /**
   * Guard a page.  Redirects to login if not authenticated,
   * or to the correct dashboard if the role doesn't match.
   * @param {string|null} requiredRole – 'admin', 'donor', 'recipient', or null (any role).
   * @returns {object|null} session object, or null (after redirect).
   */
  require(requiredRole = null) {
    const session = this.get();
    if (!session) {
      window.location.href = _rootPath() + 'pages/auth/login.html';
      return null;
    }
    if (requiredRole && (session.role || '').toLowerCase() !== requiredRole.toLowerCase()) {
      this.redirectToDashboard(session);
      return null;
    }
    return session;
  },

  /**
   * Redirect to the role-appropriate dashboard.
   * @param {object} [session] – optional session; fetched if not provided.
   */
  redirectToDashboard(session) {
    const s = session || this.get();
    if (!s) {
      window.location.href = _rootPath() + 'pages/auth/login.html';
      return;
    }
    const root = _rootPath();
    const r = (s.role || '').toLowerCase();
    switch (r) {
      case 'admin':     window.location.href = root + 'pages/admin/dashboard.html';     break;
      case 'donor':     window.location.href = root + 'pages/donor/dashboard.html';     break;
      case 'recipient': window.location.href = root + 'pages/recipient/dashboard.html'; break;
      default:          window.location.href = root + 'pages/auth/login.html';
    }
  },

  /** Convenience: get the path from current page back to project root. */
  rootPath: _rootPath
};
