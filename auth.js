/* ============================================================
   SYRMA SGS — AUTH MODULE (auth.js)
   Handles Supabase Authentication: login, logout, session
   persistence, and the lamp-themed UI interaction.

   IMPORTANT: Users are created in the Supabase Dashboard
   under Authentication > Users with a real email address.
   Login is done with email + password (not a @syrmasgs.local
   mapping). Example: user@syrmasgs.com or any valid email.
   ============================================================ */

'use strict';

/* ---- Supabase Config (matches script.js) ---- */
const AUTH_SUPABASE_URL = 'https://oqjotrbrwjqwdevicmec.supabase.co';
const AUTH_SUPABASE_KEY = 'sb_publishable_ZpVK3J95QH0RF9Ml4qnydA_I7BkUVm-';

/* ---- Module-level references ---- */
let _supabaseClient = null;
let _onLoginSuccess = null; // callback(user) when login succeeds
let _lampOn = false;

/* ============================================================
   PUBLIC API
   ============================================================ */

/**
 * Initialize the auth module.
 * @param {object} supabaseClient  Already-created Supabase client
 * @param {function} onLoginSuccess  Called with (user) after sign-in
 */
function authInit(supabaseClient, onLoginSuccess) {
  _supabaseClient = supabaseClient;
  _onLoginSuccess = onLoginSuccess;
  _wireLampInteraction();
  _wireFormEvents();
}

/**
 * Check for an existing persisted session.
 * Returns the session user or null.
 */
async function authCheckSession() {
  if (!_supabaseClient) return null;
  try {
    const { data, error } = await _supabaseClient.auth.getSession();
    if (error || !data || !data.session) return null;
    return data.session.user;
  } catch (e) {
    console.error('[Auth] Session check failed', e);
    return null;
  }
}

/**
 * Sign out from Supabase and show the login screen again.
 */
async function authSignOut() {
  if (!_supabaseClient) return;
  try {
    await _supabaseClient.auth.signOut();
  } catch (e) {
    console.error('[Auth] Sign out error', e);
  }
  _resetToLoginScreen();
}

/**
 * Show the lamp login screen (call when app first loads, before session check).
 */
function authShowLoginScreen() {
  const el = document.getElementById('lampLoginScreen');
  if (el) el.style.display = 'flex';
}

/**
 * Hide the lamp login screen (call after successful auth).
 */
function authHideLoginScreen() {
  const el = document.getElementById('lampLoginScreen');
  if (el) el.style.display = 'none';
}

/**
 * Listen for background auth state changes (token refresh, revocation, etc.)
 * Pass in a callback that receives (event, session).
 */
function authListenStateChanges(callback) {
  if (!_supabaseClient) return;
  _supabaseClient.auth.onAuthStateChange(callback);
}

/* ============================================================
   PRIVATE — LAMP INTERACTION
   ============================================================ */

function _wireLampInteraction() {
  const stringWrap = document.getElementById('lampStringWrap');
  const lampString = document.getElementById('lampString');
  const lampBead   = document.getElementById('lampPullBead');
  const hint       = document.getElementById('lampStringHint');

  if (!stringWrap) return;

  let canPull = true;

  function doPull() {
    if (!canPull || _lampOn) return;
    canPull = false;

    // Animate string pull
    lampString.classList.add('pull');
    if (lampBead) lampBead.style.transform = 'translateY(22px)';

    // After short delay: release string, trigger lamp-on
    setTimeout(() => {
      lampString.classList.remove('pull');
      if (lampBead) lampBead.style.transform = '';
      _turnLampOn();
    }, 200);

    // Hide hint immediately
    if (hint) {
      hint.style.opacity = '0';
      hint.style.transition = 'opacity 0.3s';
    }
  }

  stringWrap.addEventListener('click', doPull);
  stringWrap.addEventListener('touchstart', (e) => {
    e.preventDefault();
    doPull();
  }, { passive: false });
}

function _turnLampOn() {
  _lampOn = true;

  const rig    = document.getElementById('lampRig');
  const bulb   = document.getElementById('lampBulb');
  const cone   = document.getElementById('lampCone');
  const floor  = document.getElementById('lampFloorGlow');
  const ambient = document.getElementById('lampRoomAmbient');
  const formWrap = document.getElementById('lampLoginFormWrap');

  /* Swing */
  if (rig) {
    rig.classList.add('swinging');
    rig.addEventListener('animationend', () => rig.classList.remove('swinging'), { once: true });
  }

  /* Bulb flicker → on */
  if (bulb) {
    bulb.classList.add('flickering');
    bulb.addEventListener('animationend', () => {
      bulb.classList.remove('flickering');
    }, { once: true });
  }

  /* Lamp classes */
  setTimeout(() => {
    if (rig) rig.classList.add('on');
    if (cone) cone.classList.add('lit');
    if (floor) floor.classList.add('lit');
    if (ambient) ambient.classList.add('lit');
  }, 80);

  /* Show login form after lamp settles */
  setTimeout(() => {
    if (formWrap) formWrap.classList.add('visible');
    // Focus first input
    const emailInput = document.getElementById('loginEmail');
    if (emailInput) emailInput.focus();
  }, 800);
}

/* ============================================================
   PRIVATE — FORM EVENTS
   ============================================================ */

function _wireFormEvents() {
  const submitBtn   = document.getElementById('lampLoginSubmitBtn');
  const emailInput  = document.getElementById('loginEmail');
  const passInput   = document.getElementById('loginPassword');

  if (submitBtn) {
    submitBtn.addEventListener('click', _handleLogin);
  }

  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _handleLogin();
    });
  }

  if (emailInput) {
    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && passInput) passInput.focus();
    });
  }
}

async function _handleLogin() {
  const emailInput = document.getElementById('loginEmail');
  const passInput  = document.getElementById('loginPassword');
  const btn        = document.getElementById('lampLoginSubmitBtn');
  const errEl      = document.getElementById('lampLoginError');

  const email    = (emailInput ? emailInput.value : '').trim();
  const password = passInput ? passInput.value : '';

  if (!email || !password) {
    _showLoginError('Please enter your email and password.');
    return;
  }

  if (!_supabaseClient) {
    _showLoginError('Cloud connection not ready. Please reload the page and try again.');
    return;
  }

  // Loading state
  if (btn) { btn.disabled = true; btn.textContent = 'Signing In…'; }
  if (errEl) errEl.textContent = '';

  try {
    const { data, error } = await _supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      _showLoginError('Incorrect email or password.');
      return;
    }

    // Success
    if (_onLoginSuccess) {
      _onLoginSuccess(data.user);
    }
  } catch (e) {
    console.error('[Auth] Login exception', e);
    _showLoginError('Something went wrong. Please check your connection and try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
  }
}

function _showLoginError(msg) {
  const el = document.getElementById('lampLoginError');
  if (el) el.textContent = msg;
}

function _resetToLoginScreen() {
  // Reset lamp state so it can be re-triggered
  _lampOn = false;

  const rig      = document.getElementById('lampRig');
  const bulb     = document.getElementById('lampBulb');
  const cone     = document.getElementById('lampCone');
  const floor    = document.getElementById('lampFloorGlow');
  const ambient  = document.getElementById('lampRoomAmbient');
  const formWrap = document.getElementById('lampLoginFormWrap');
  const hint     = document.getElementById('lampStringHint');
  const emailInput = document.getElementById('loginEmail');
  const passInput  = document.getElementById('loginPassword');
  const errEl    = document.getElementById('lampLoginError');

  if (rig)     { rig.classList.remove('on', 'swinging'); }
  if (bulb)    { bulb.classList.remove('flickering'); bulb.style.opacity = ''; }
  if (cone)    { cone.classList.remove('lit'); }
  if (floor)   { floor.classList.remove('lit'); }
  if (ambient) { ambient.classList.remove('lit'); }
  if (formWrap){ formWrap.classList.remove('visible'); }
  if (hint)    { hint.style.opacity = ''; hint.style.transition = ''; }
  if (emailInput) emailInput.value = '';
  if (passInput)  passInput.value = '';
  if (errEl)   errEl.textContent = '';

  authShowLoginScreen();
}
