document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    const toggleBtn = document.getElementById('togglePassword');
    const pwInput = document.getElementById('password');
    if (toggleBtn && pwInput) {
        toggleBtn.addEventListener('click', () => {
            const type = pwInput.getAttribute('type') === 'password' ? 'text' : 'password';
            pwInput.setAttribute('type', type);
            toggleBtn.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-control').forEach(el => el.classList.remove('invalid'));
        const loginError = document.getElementById('loginError');
        loginError.textContent = '';
        loginError.style.display = 'none';

        const email = document.getElementById('email').value.trim();
        const password = pwInput.value;
        const role = document.getElementById('role').value;

        let isValid = true;
        if (!email) { Validation.showError(document.getElementById('email'), 'Email is required'); isValid = false; }
        if (!password) { Validation.showError(document.getElementById('password'), 'Password is required'); isValid = false; }

        if (!isValid) return;

        const btn = loginForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        btn.disabled = true;

        try {
            // Talk to the Real Node.js Database API!
            const response = await MockData.login(email, password, role);
            
            if (response.success) {
                const user = response.user;
                Session.set({
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role === 'admin' ? 'Admin' : user.role === 'donor' ? 'Donor' : 'Recipient',
                    donorId: user.role === 'donor' ? user.profileId : null,
                    recipientId: user.role === 'recipient' ? user.profileId : null
                });
                Session.redirectToDashboard();
            }
        } catch (error) {
            loginError.textContent = error.message || 'Invalid email or password. Please try again.';
            loginError.style.display = 'block';
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
});
