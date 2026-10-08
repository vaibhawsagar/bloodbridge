/**
 * BloodBridge – Register JS (js/auth/register.js)
 * Handles donor and recipient registration.
 * Fulfills: R.2.1 (Donor Register), R.3.1 (Recipient Register)
 * DFD Process: 2.0 Manage Donor Registration & Profile
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  MockData.initialize();

  if (Session.isLoggedIn()) {
    // If the user navigates back to the register page, they likely want to create a new account.
    // Clear the existing session so they aren't trapped in a redirect loop to the dashboard.
    Session.clear();
  }

  // Determine role from URL parameter
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') || 'donor'; // default to donor

  // Update page heading
  const roleTitle = document.getElementById('roleTitle');
  if (roleTitle) roleTitle.textContent = role === 'recipient' ? 'Recipient / Hospital' : 'Donor';

  // Show/hide role-specific sections
  const donorSection     = document.getElementById('donorSection');
  const recipientSection = document.getElementById('recipientSection');
  if (donorSection)     donorSection.style.display     = role === 'donor'     ? 'block' : 'none';
  if (recipientSection) recipientSection.style.display = role === 'recipient' ? 'block' : 'none';

  const form = document.getElementById('registerForm');
  Validation.attachLiveValidation(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Validation.clearFormErrors(form);

    const nameEl    = document.getElementById('name');
    const emailEl   = document.getElementById('email');
    const passEl    = document.getElementById('password');
    const confirmEl = document.getElementById('confirmPassword');
    const phoneEl   = document.getElementById('phone');
    const addressEl = document.getElementById('address');

    // Common validation
    let valid = Validation.validateCommonRegistration({
      nameEl, emailEl, passwordEl: passEl, confirmPasswordEl: confirmEl, phoneEl, addressEl
    });

    // Donor-specific validation
    let bloodGroupEl, ageEl, weightEl, haemoglobinEl;
    if (role === 'donor') {
      bloodGroupEl  = document.getElementById('bloodGroup');
      ageEl         = document.getElementById('age');
      weightEl      = document.getElementById('weight');
      haemoglobinEl = document.getElementById('haemoglobin');
      if (!Validation.validateDonorFields({ bloodGroupEl, ageEl, weightEl, haemoglobinEl })) {
        valid = false;
      }
    }

    if (!valid) return;

    // Gather registration data
    const userData = {
      role: role,
      name: nameEl.value.trim(),
      email: emailEl.value.trim().toLowerCase(),
      password: passEl.value,
      phone: phoneEl.value.trim(),
      address: addressEl.value.trim()
    };

    if (role === 'donor') {
      const lastDonationEl = document.getElementById('lastDonationDate');
      const healthHistoryEl = document.getElementById('healthHistory');
      
      userData.bloodGroup = bloodGroupEl.value;
      userData.age = parseInt(ageEl.value, 10);
      userData.weight = parseFloat(weightEl.value);
      userData.haemoglobin = parseFloat(haemoglobinEl.value);
      userData.healthHistory = healthHistoryEl ? healthHistoryEl.value.trim() : '';
      userData.lastDonationDate = lastDonationEl && lastDonationEl.value ? lastDonationEl.value : null;
    } else {
      const affiliationEl = document.getElementById('affiliation');
      userData.affiliation = affiliationEl ? affiliationEl.value.trim() : '';
    }

    try {
        const btn = form.querySelector('button[type="submit"]');
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        btn.disabled = true;

        const response = await MockData.register(userData);
        if (response.success) {
            window.location.href = '../../pages/auth/login.html?registered=1&role=' + role;
        }
    } catch (error) {
        Validation.showFieldError(emailEl, error.message || 'Registration failed. Email might already exist.');
        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Submit Registration';
        btn.disabled = false;
    }
  });

  // Toggle password visibility
  const togglePw = document.getElementById('togglePassword');
  const passEl2  = document.getElementById('password');
  if (togglePw && passEl2) {
    togglePw.addEventListener('click', () => {
      const t = passEl2.getAttribute('type') === 'password' ? 'text' : 'password';
      passEl2.setAttribute('type', t);
      togglePw.querySelector('i').classList.toggle('fa-eye');
      togglePw.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }
});
