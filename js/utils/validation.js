/**
 * BloodBridge – Form Validation (js/utils/validation.js)
 * All client-side form validation logic.
 * Inline error messages shown near the relevant field per SRS §4.4.
 */

'use strict';

// ─────────────────────────────────────────────
// Core validation helpers
// ─────────────────────────────────────────────

function _isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function _isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function _isPhone(value) {
  return /^\d{10}$/.test(value.replace(/\s/g, ''));
}

function _isStrongPassword(value) {
  // Min 8 chars, at least one letter and one number
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

// ─────────────────────────────────────────────
// Inline error display
// ─────────────────────────────────────────────

/** Show inline error below a field */
function showFieldError(fieldEl, message) {
  fieldEl.classList.add('is-invalid');
  let err = fieldEl.parentElement.querySelector('.form-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'form-error';
    fieldEl.parentElement.appendChild(err);
  }
  err.textContent = message;
}

/** Clear inline error on a field */
function clearFieldError(fieldEl) {
  fieldEl.classList.remove('is-invalid');
  const err = fieldEl.parentElement && fieldEl.parentElement.querySelector('.form-error');
  if (err) err.textContent = '';
}

/** Clear all errors in a form */
function clearFormErrors(formEl) {
  formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  formEl.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; });
}

// Auto-clear error when user edits the field
function attachLiveValidation(formEl) {
  formEl.querySelectorAll('.form-control').forEach(el => {
    el.addEventListener('input', () => clearFieldError(el));
    el.addEventListener('change', () => clearFieldError(el));
  });
}

// ─────────────────────────────────────────────
// Specific form validators
// ─────────────────────────────────────────────

/**
 * Validate login form.
 * @returns {boolean} true if valid
 */
function validateLogin(emailEl, passwordEl) {
  let valid = true;

  if (_isEmpty(emailEl.value)) {
    showFieldError(emailEl, 'Email address is required.');
    valid = false;
  } else if (!_isEmail(emailEl.value)) {
    showFieldError(emailEl, 'Please enter a valid email address.');
    valid = false;
  }

  if (_isEmpty(passwordEl.value)) {
    showFieldError(passwordEl, 'Password is required.');
    valid = false;
  }

  return valid;
}

/**
 * Validate common registration fields (shared by donor and recipient).
 * @returns {boolean}
 */
function validateCommonRegistration(fields) {
  const { nameEl, emailEl, passwordEl, confirmPasswordEl, phoneEl, addressEl } = fields;
  let valid = true;

  if (_isEmpty(nameEl.value)) {
    showFieldError(nameEl, 'Full name is required.');
    valid = false;
  }

  if (_isEmpty(emailEl.value)) {
    showFieldError(emailEl, 'Email address is required.');
    valid = false;
  } else if (!_isEmail(emailEl.value)) {
    showFieldError(emailEl, 'Please enter a valid email address.');
    valid = false;
  }

  if (_isEmpty(passwordEl.value)) {
    showFieldError(passwordEl, 'Password is required.');
    valid = false;
  } else if (!_isStrongPassword(passwordEl.value)) {
    showFieldError(passwordEl, 'Password must be at least 8 characters with letters and numbers.');
    valid = false;
  }

  if (confirmPasswordEl) {
    if (_isEmpty(confirmPasswordEl.value)) {
      showFieldError(confirmPasswordEl, 'Please confirm your password.');
      valid = false;
    } else if (confirmPasswordEl.value !== passwordEl.value) {
      showFieldError(confirmPasswordEl, 'Passwords do not match.');
      valid = false;
    }
  }

  if (_isEmpty(phoneEl.value)) {
    showFieldError(phoneEl, 'Phone number is required.');
    valid = false;
  } else if (!_isPhone(phoneEl.value)) {
    showFieldError(phoneEl, 'Enter a valid 10-digit phone number.');
    valid = false;
  }

  if (addressEl && _isEmpty(addressEl.value)) {
    showFieldError(addressEl, 'Address is required.');
    valid = false;
  }

  return valid;
}

/**
 * Validate donor-specific registration fields.
 * @returns {boolean}
 */
function validateDonorFields(fields) {
  const { bloodGroupEl, ageEl, weightEl, haemoglobinEl } = fields;
  let valid = true;

  if (_isEmpty(bloodGroupEl.value)) {
    showFieldError(bloodGroupEl, 'Blood group is required.');
    valid = false;
  }

  const age = parseFloat(ageEl.value);
  if (_isEmpty(ageEl.value) || isNaN(age)) {
    showFieldError(ageEl, 'Age is required.');
    valid = false;
  } else if (age < 1 || age > 120) {
    showFieldError(ageEl, 'Please enter a valid age (1–120).');
    valid = false;
  }

  const weight = parseFloat(weightEl.value);
  if (_isEmpty(weightEl.value) || isNaN(weight)) {
    showFieldError(weightEl, 'Weight is required.');
    valid = false;
  } else if (weight < 20 || weight > 300) {
    showFieldError(weightEl, 'Enter a valid weight in kilograms (20–300).');
    valid = false;
  }

  const haem = parseFloat(haemoglobinEl.value);
  if (_isEmpty(haemoglobinEl.value) || isNaN(haem)) {
    showFieldError(haemoglobinEl, 'Haemoglobin level is required.');
    valid = false;
  } else if (haem < 1 || haem > 25) {
    showFieldError(haemoglobinEl, 'Enter a valid haemoglobin level in g/dL (1–25).');
    valid = false;
  }

  return valid;
}

/**
 * Validate blood request form.
 * @returns {boolean}
 */
function validateBloodRequest(fields) {
  const { bloodGroupEl, quantityEl, urgencyEl, purposeEl } = fields;
  let valid = true;

  if (_isEmpty(bloodGroupEl.value)) {
    showFieldError(bloodGroupEl, 'Blood group is required.');
    valid = false;
  }

  const qty = parseInt(quantityEl.value, 10);
  if (_isEmpty(quantityEl.value) || isNaN(qty)) {
    showFieldError(quantityEl, 'Quantity is required.');
    valid = false;
  } else if (qty < 1 || qty > 50) {
    showFieldError(quantityEl, 'Quantity must be between 1 and 50 units.');
    valid = false;
  }

  if (_isEmpty(urgencyEl.value)) {
    showFieldError(urgencyEl, 'Urgency level is required.');
    valid = false;
  }

  if (_isEmpty(purposeEl.value)) {
    showFieldError(purposeEl, 'Purpose/reason is required.');
    valid = false;
  } else if (purposeEl.value.trim().length < 5) {
    showFieldError(purposeEl, 'Please provide a more detailed purpose (at least 5 characters).');
    valid = false;
  }

  return valid;
}

/**
 * Validate donation camp form (Admin).
 * @returns {boolean}
 */
function validateCampForm(fields) {
  const { nameEl, dateEl, venueEl, targetEl } = fields;
  let valid = true;

  if (_isEmpty(nameEl.value)) {
    showFieldError(nameEl, 'Camp name is required.');
    valid = false;
  }

  if (_isEmpty(dateEl.value)) {
    showFieldError(dateEl, 'Camp date is required.');
    valid = false;
  }

  if (_isEmpty(venueEl.value)) {
    showFieldError(venueEl, 'Venue is required.');
    valid = false;
  }

  const target = parseInt(targetEl.value, 10);
  if (_isEmpty(targetEl.value) || isNaN(target)) {
    showFieldError(targetEl, 'Target collection is required.');
    valid = false;
  } else if (target < 1 || target > 10000) {
    showFieldError(targetEl, 'Target must be between 1 and 10,000 units.');
    valid = false;
  }

  return valid;
}

/**
 * Validate blood inventory unit form (Admin).
 * @returns {boolean}
 */
function validateInventoryForm(fields) {
  const { bloodGroupEl, quantityEl, collectionDateEl, expiryDateEl } = fields;
  let valid = true;

  if (_isEmpty(bloodGroupEl.value)) {
    showFieldError(bloodGroupEl, 'Blood group is required.');
    valid = false;
  }

  const qty = parseInt(quantityEl.value, 10);
  if (_isEmpty(quantityEl.value) || isNaN(qty)) {
    showFieldError(quantityEl, 'Quantity is required.');
    valid = false;
  } else if (qty < 1) {
    showFieldError(quantityEl, 'Quantity must be at least 1.');
    valid = false;
  }

  if (_isEmpty(collectionDateEl.value)) {
    showFieldError(collectionDateEl, 'Collection date is required.');
    valid = false;
  }

  if (_isEmpty(expiryDateEl.value)) {
    showFieldError(expiryDateEl, 'Expiry date is required.');
    valid = false;
  } else if (collectionDateEl.value && expiryDateEl.value <= collectionDateEl.value) {
    showFieldError(expiryDateEl, 'Expiry date must be after collection date.');
    valid = false;
  }

  return valid;
}

/**
 * Validate donor profile update form.
 * @returns {boolean}
 */
function validateProfileUpdate(fields) {
  const { nameEl, phoneEl, addressEl, weightEl, haemoglobinEl } = fields;
  let valid = true;

  if (nameEl && _isEmpty(nameEl.value)) {
    showFieldError(nameEl, 'Name is required.');
    valid = false;
  }

  if (phoneEl && !_isPhone(phoneEl.value)) {
    showFieldError(phoneEl, 'Enter a valid 10-digit phone number.');
    valid = false;
  }

  if (addressEl && _isEmpty(addressEl.value)) {
    showFieldError(addressEl, 'Address is required.');
    valid = false;
  }

  if (weightEl) {
    const w = parseFloat(weightEl.value);
    if (isNaN(w) || w < 20) {
      showFieldError(weightEl, 'Enter a valid weight (minimum 20 kg).');
      valid = false;
    }
  }

  if (haemoglobinEl) {
    const h = parseFloat(haemoglobinEl.value);
    if (isNaN(h) || h < 1 || h > 25) {
      showFieldError(haemoglobinEl, 'Enter a valid haemoglobin level (g/dL).');
      valid = false;
    }
  }

  return valid;
}

// Public API
const Validation = {
  showFieldError,
  clearFieldError,
  clearFormErrors,
  attachLiveValidation,
  validateLogin,
  validateCommonRegistration,
  validateDonorFields,
  validateBloodRequest,
  validateCampForm,
  validateInventoryForm,
  validateProfileUpdate
};
