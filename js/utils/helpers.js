/**
 * BloodBridge – Helper Utilities (js/utils/helpers.js)
 * General-purpose formatting, date, and DOM helper functions.
 */

'use strict';

// ─────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────

/** Format ISO date string → 'DD-Mon-YYYY' (e.g. '01-Sep-2024') */
function formatDate(isoString) { if (!isoString) return '-'; const d = new Date(isoString); if (isNaN(d)) return isoString; const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(d); const getPart = (type) => { const p = parts.find(x => x.type === type); return p ? p.value : ''; }; return getPart('day') + '-' + getPart('month') + '-' + getPart('year'); }

function formatDateTime(isoString) { if (!isoString) return '-'; const d = new Date(isoString); if (isNaN(d)) return isoString; const dateStr = formatDate(isoString); const timeStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(d); return dateStr + ' ' + timeStr; }

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Days between two ISO date strings (positive = d2 after d1) */
function daysBetween(isoD1, isoD2) {
  const ms = new Date(isoD2) - new Date(isoD1);
  return Math.floor(ms / 86400000);
}

/** Days from an ISO date until today (negative if in past) */
function daysFromToday(isoDate) {
  return daysBetween(todayISO(), isoDate);
}

/** True if the ISO date is in the past */
function isPast(isoDate) {
  return new Date(isoDate) < new Date();
}

/** True if the ISO date is within `days` days from today */
function isNearFuture(isoDate, days = 7) {
  const d = daysFromToday(isoDate);
  return d >= 0 && d <= days;
}

// ─────────────────────────────────────────────
// String Helpers
// ─────────────────────────────────────────────

/** Truncate text to maxLen with ellipsis */
function truncate(text, maxLen = 60) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
}

/** Escape HTML special chars to prevent XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────
// DOM Helpers
// ─────────────────────────────────────────────

/** Show a temporary toast notification */
function showToast(message, type = 'success', duration = 3500) {
  // Remove any existing toast
  const existing = document.getElementById('bb-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'bb-toast';
  toast.className = `bb-toast bb-toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
    <span>${escHtml(message)}</span>
  `;
  document.body.appendChild(toast);

  // Trigger fade-in
  requestAnimationFrame(() => toast.classList.add('bb-toast-show'));

  setTimeout(() => {
    toast.classList.remove('bb-toast-show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/** Show or hide a loading spinner overlay on a button */
function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

/** Populate a <select> with options */
function populateSelect(selectEl, options, valueProp, labelProp, placeholder = 'Select…') {
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt[valueProp];
    o.textContent = opt[labelProp];
    selectEl.appendChild(o);
  });
}

/** Set the unread-notification count badge in sidebar */
function updateNotificationBadge(count) {
  const badge = document.getElementById('notif-count');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

/** Confirm dialog wrapper */
function confirmAction(message) {
  return window.confirm(message);
}

/** Render an empty-state placeholder */
function emptyState(icon, title, message) {
  return `
    <div class="empty-state">
      <i class="fa-solid ${icon} empty-state-icon"></i>
      <h3 class="empty-state-title">${escHtml(title)}</h3>
      <p class="empty-state-msg">${escHtml(message)}</p>
    </div>`;
}

// ─────────────────────────────────────────────
// Blood group helpers
// ─────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** Returns coloured blood-group pill HTML */
function bloodGroupPill(bg) {
  const cls = bg ? bg.replace('+','pos').replace('-','neg') : '';
  return `<span class="bg-pill bg-${cls}">${escHtml(bg || '—')}</span>`;
}

// Public API
const Helpers = {
  formatDate,
  formatDateTime,
  todayISO,
  daysBetween,
  daysFromToday,
  isPast,
  isNearFuture,
  truncate,
  escHtml,
  showToast,
  setButtonLoading,
  populateSelect,
  updateNotificationBadge,
  confirmAction,
  emptyState,
  BLOOD_GROUPS,
  bloodGroupPill
};
