/* ═══════════════════════════════════════════════════════════
   deClusterize — ConvertKit form handler
   ───────────────────────────────────────────────────────────
   SETUP:
   1. Sign up at kit.com (free up to 1,000 subscribers)
   2. Go to Grow → Landing Pages & Forms → New Form → Save
   3. Copy the Form ID from the URL:
      app.convertkit.com/forms/YOUR_FORM_ID/edit
   4. Paste it below and replace YOUR_FORM_ID
   ═══════════════════════════════════════════════════════════ */

const CK_FORM_ID = '9532599'; // ← replace this

/* ── Core submit function ─────────────────────────────────── */
async function submitToConvertKit(email, tags = {}) {
  const endpoint = `https://app.convertkit.com/forms/${CK_FORM_ID}/subscriptions`;

  const payload = new URLSearchParams({ email_address: email });

  // Pass source tag so you know where each signup came from
  if (tags.source) payload.append('fields[source]', tags.source);

  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    payload.toString(),
    });
    if (!res.ok) throw new Error(`ConvertKit responded with ${res.status}`);
    return { ok: true };
  } catch (err) {
    console.error('ConvertKit submission error:', err);
    return { ok: false, error: err.message };
  }
}

/* ── Generic helper: wire a form to ConvertKit ────────────── */
// options = {
//   formEl      : HTMLFormElement
//   emailInputId: string
//   source      : string  (tag for ConvertKit — e.g. 'footer-newsletter')
//   onSuccess   : function(email) — called after successful submit
//   onError     : function(err)   — called on network/API failure
// }
function wireForm({ formEl, emailInputId, source, onSuccess, onError }) {
  if (!formEl) return;

  formEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    const emailInput = document.getElementById(emailInputId);
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (emailInput) { emailInput.focus(); emailInput.style.borderColor = 'var(--rose)'; }
      return;
    }
    if (emailInput) emailInput.style.borderColor = '';

    // Disable submit button, show loading state
    const btn = formEl.querySelector('[type="submit"]');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    const result = await submitToConvertKit(email, { source });

    if (result.ok) {
      if (onSuccess) onSuccess(email);
    } else {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
      if (onError) onError(result.error);
      else alert('Something went wrong — please try again or email us at info@declusterize.com');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   PAGE-SPECIFIC WIRING
   Each block below handles one form. Guards (if !el) make
   every block safe to include on every page.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* 1 ── Footer newsletter (present on all pages) ─────────── */
  const newsForm = document.querySelector('.news-form');
  if (newsForm) {
    // Footer form has no id on its input — add one dynamically
    const newsInput = newsForm.querySelector('input[type="email"]');
    if (newsInput && !newsInput.id) newsInput.id = 'footer-email-input';

    wireForm({
      formEl:       newsForm,
      emailInputId: 'footer-email-input',
      source:       'footer-newsletter',
      onSuccess: (email) => {
        const btn = newsForm.querySelector('[type="submit"]');
        if (btn) { btn.textContent = '✓ Subscribed!'; btn.disabled = true; btn.style.background = 'rgba(16,185,129,.2)'; }
        const input = newsForm.querySelector('input[type="email"]');
        if (input) { input.value = ''; input.disabled = true; input.placeholder = 'Thanks! Check your inbox.'; }
      }
    });
  }

  /* 2 ── Quiz email form (index.html) ─────────────────────── */
  const quizForm = document.getElementById('quizEmailForm');
  if (quizForm) {
    wireForm({
      formEl:       quizForm,
      emailInputId: 'quizEmail',
      source:       'quiz-plan-signup',
      onSuccess: (email) => {
        document.getElementById('quizSuccessEmail').textContent = email;
        quizForm.hidden = true;
        document.getElementById('quizSuccess').removeAttribute('hidden');
      }
    });
  }

  /* 3 ── Login / early-access modal (index.html) ──────────── */
  const loginForm = document.getElementById('loginEmailForm');
  if (loginForm) {
    wireForm({
      formEl:       loginForm,
      emailInputId: 'loginEmail',
      source:       'login-early-access',
      onSuccess: (email) => {
        document.getElementById('loginSuccessEmail').textContent = email;
        loginForm.hidden = true;
        document.getElementById('loginSuccess').removeAttribute('hidden');
        setTimeout(() => {
          const modal = document.getElementById('loginModal');
          if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
          loginForm.removeAttribute('hidden');
          loginForm.reset();
          document.getElementById('loginSuccess').setAttribute('hidden', '');
        }, 3500);
      }
    });
  }

  /* 4 ── Contact form (contact.html) ──────────────────────── */
  // Contact uses Formspree-style (name+subject+message too) —
  // we send just the email to ConvertKit and separately POST
  // the full message to Formspree (configure FORMSPREE_ID below).
  const FORMSPREE_ID = 'xrevppva'; // ← get from formspree.io (free)

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name    = document.getElementById('cf-name').value.trim();
      const email   = document.getElementById('cf-email').value.trim();
      const subject = document.getElementById('cf-subject').value;
      const message = document.getElementById('cf-message').value.trim();

      if (!name || !email || !subject || !message) { alert('Please fill in all required fields.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email address.'); return; }

      const btn = contactForm.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      // Send full message to Formspree
      let formspreeOk = true;
      if (FORMSPREE_ID !== 'YOUR_FORMSPREE_ID') {
        try {
          const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body:    JSON.stringify({ name, email, subject, message }),
          });
          if (!res.ok) formspreeOk = false;
        } catch { formspreeOk = false; }
      }

      // Also add to ConvertKit so they're in your subscriber list
      await submitToConvertKit(email, { source: 'contact-form' });

      if (formspreeOk) {
        document.getElementById('successEmail').textContent = email;
        contactForm.style.display = 'none';
        document.getElementById('formSuccess').classList.add('visible');
      } else {
        if (btn) { btn.disabled = false; btn.textContent = 'Send message'; }
        alert('Something went wrong. Please email us directly at info@declusterize.com');
      }
    });
  }

  /* 5 ── Help Center / guides newsletter CTAs ─────────────── */
  // These use .g-cta-form class on guides.html
  document.querySelectorAll('.g-cta-form').forEach((form, i) => {
    const input = form.querySelector('input[type="email"]');
    if (input && !input.id) input.id = `g-cta-email-${i}`;
    wireForm({
      formEl:       form,
      emailInputId: `g-cta-email-${i}`,
      source:       'guides-newsletter-cta',
      onSuccess: () => {
        const btn = form.querySelector('[type="submit"]');
        if (btn) { btn.textContent = '✓ You\'re in!'; btn.disabled = true; }
        const inp = form.querySelector('input[type="email"]');
        if (inp) { inp.value = ''; inp.disabled = true; inp.placeholder = 'Thanks! Watch your inbox.'; }
      }
    });
  });

  /* 6 ── Homepage pricing CTA (index.html) ────────────────── */
  // The pricing buttons open the quiz — already handled by quiz form (#2 above).
  // No extra wiring needed.

});
