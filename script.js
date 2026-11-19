/* ============================================================
   CHATHUTOPUP — script.js
   Frontend logic: packages, order form, validation, tracking, UI
   ------------------------------------------------------------
   ⚠ PRODUCTION NOTE: localStorage is ONLY a demo stand-in.
   In production, POST orders to your backend API (Node/PHP +
   MySQL), store receipts server-side, and verify payments via a
   PCI-DSS gateway (ePay/WebXPay/PayHere). NEVER trust or process
   card data in frontend JS.
   ============================================================ */

/* ---------------- Config ---------------- */
const DEFAULT_PACKAGES = [
  { id: 100,  name: '100 Diamonds',  price: 190,  popular: false },
  { id: 210,  name: '210 Diamonds',  price: 370,  popular: false },
  { id: 530,  name: '530 Diamonds',  price: 890,  popular: true  },
  { id: 1080, name: '1080 Diamonds', price: 1750, popular: false },
  { id: 2200, name: '2200 Diamonds', price: 3450, popular: false },
  { id: 5600, name: '5600 Diamonds', price: 8450, popular: false },
];
const LS_PACKAGES = 'ct_packages';
const LS_ORDERS   = 'ct_orders';

/* Helpers ----------------------------------------------------- */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const money = (n) => 'LKR ' + Number(n).toLocaleString('en-LK');

function getPackages() {
  try { return JSON.parse(localStorage.getItem(LS_PACKAGES)) || DEFAULT_PACKAGES; }
  catch { return DEFAULT_PACKAGES; }
}
function getOrders() {
  try { return JSON.parse(localStorage.getItem(LS_ORDERS)) || []; }
  catch { return []; }
}
function saveOrder(order) {
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
}
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* Diamond SVG icon (shared by cards & select options) --------- */
function diamondSVG() {
  return `<svg class="diamond-icon" viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00e5ff"/><stop offset="1" stop-color="#a855f7"/>
    </linearGradient></defs>
    <path d="M32 4 8 26l24 34 24-34L32 4z" fill="rgba(0,229,255,.08)" stroke="url(#dg)" stroke-width="3" stroke-linejoin="round"/>
    <path d="M8 26h48M32 4l-8 22M32 4l8 22M24 48l8-22 8 22" fill="none" stroke="url(#dg)" stroke-width="2" stroke-linejoin="round" opacity=".7"/>
  </svg>`;
}

/* ---------------- Loading screen ------------------------------ */
window.addEventListener('load', () => {
  setTimeout(() => $('#loader').classList.add('done'), 600);
});

/* ---------------- Mobile navigation --------------------------- */
const hamburger = $('#hamburger');
const navLinks  = $('#navLinks');
hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open);
});
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') navLinks.classList.remove('open');
});

/* ---------------- Render package cards ------------------------ */
function renderPackages() {
  const grid = $('#packageGrid');
  grid.innerHTML = getPackages().map(p => `
    <div class="package-card reveal ${p.popular ? 'popular' : ''}">
      ${p.popular ? '<span class="popular-tag">POPULAR</span>' : ''}
      ${diamondSVG()}
      <h3 class="package-name">${p.name}</h3>
      <p class="package-price">${money(p.price)}<small>instant delivery</small></p>
      <button class="btn btn-small buy-btn" data-package="${p.id}">BUY NOW</button>
    </div>`).join('');
}

/* Fill the order-form <select> with same packages */
function renderPackageSelect() {
  const sel = $('#packageSelect');
  sel.innerHTML = '<option value="">-- Choose a package --</option>' +
    getPackages().map(p => `<option value="${p.id}">${p.name} — ${money(p.price)}</option>`).join('');
}

/* ---------------- Scroll reveal & counters -------------------- */
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => en.isIntersecting && en.target.classList.add('visible'));
  }, { threshold: 0.12 });
  $$('.reveal').forEach(el => io.observe(el));
}
function animateCounters() {
  $$('.hero-stats strong').forEach(el => {
    const target = +el.dataset.count;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1600;
      (function tick(t) {
        const k = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString();
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
    io.observe(el);
  });
}

/* ---------------- Order summary (live) ------------------------ */
function updateSummary() {
  const pkg = getPackages().find(p => p.id === +$('#packageSelect').value);
  const server = $('#server').value;
  $('#sumPackage').textContent = pkg ? pkg.name : '—';
  $('#sumServer').textContent  = server || '—';
  $('#sumTotal').textContent   = money(pkg ? pkg.price : 0);
}
['packageSelect', 'server'].forEach(id =>
  document.addEventListener('change', (e) => { if (e.target.id === id) updateSummary(); }));

/* ---------------- Validation ---------------------------------- */
function setError(input, msg) {
  input.classList.toggle('invalid', !!msg);
  input.closest('.field').querySelector('.error-msg').textContent = msg || '';
  return !msg;
}
const validators = {
  playerId: v => /^\d{6,12}$/.test(v.trim()) || 'Enter a valid Player ID (6–12 digits).',
  server:   v => !!v || 'Please select your server.',
  customerName: v => v.trim().length >= 3 || 'Enter your full name.',
  phone:    v => /^(\+94|0)7\d{8}$/.test(v.replace(/[\s-]/g, '')) || 'Enter a valid SL mobile number (07X XXX XXXX).',
  packageSelect: v => !!v || 'Please choose a package.',
  payRef:   v => v.trim().length >= 4 || 'Enter your bank transfer reference number.',
};
function validateField(input) {
  const fn = validators[input.id];
  return fn ? setError(input, fn(input.value) === true ? '' : fn(input.value)) : true;
}

/* ---------------- Order flow ---------------------------------- */
let pendingOrder = null;

// "BUY NOW" buttons + offer buttons pre-select the package
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-package]');
  if (!btn) return;
  $('#packageSelect').value = btn.dataset.package;
  updateSummary();
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
});

// Step 1: validate details -> show payment box
$('#orderForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = ['playerId', 'server', 'customerName', 'phone', 'packageSelect']
    .map(id => document.getElementById(id));
  const ok = fields.map(validateField).every(Boolean);
  if (!ok) { toast('Please fix the highlighted fields.', true); return; }

  const pkg = getPackages().find(p => p.id === +$('#packageSelect').value);
  pendingOrder = {
    id: 'CT-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    playerId: $('#playerId').value.trim(),
    server: $('#server').value,
    customerName: $('#customerName').value.trim(),
    phone: $('#phone').value.trim(),
    packageName: pkg.name,
    price: pkg.price,
    status: 'Pending',          // Pending → Processing → Completed / Cancelled
    createdAt: new Date().toISOString(),
    payRef: null,
  };
  $('#paymentBox').classList.remove('hidden');
  $('#paymentBox').scrollIntoView({ behavior: 'smooth' });
});

// Step 2: validate payment ref -> save order -> show confirmation
$('#submitPayment').addEventListener('click', () => {
  const refInput = $('#payRef');
  if (!validateField(refInput)) return;

  // Receipt: in production, upload file to server (FormData + fetch POST).
  // Here we just note whether one was attached.
  const hasReceipt = $('#receipt').files.length > 0;

  pendingOrder.payRef = refInput.value.trim();
  pendingOrder.receiptAttached = hasReceipt;
  saveOrder(pendingOrder);

  toast(`✅ Order ${pendingOrder.id} placed! Track it in the Track Order section.`);
  alert(
    `ORDER CONFIRMED!\n\nOrder ID: ${pendingOrder.id}\nPackage: ${pendingOrder.packageName}\nTotal: ${money(pendingOrder.price)}\n\n` +
    `Save your Order ID to track status. A support agent will verify your payment shortly.`
  );

  // Reset form & UI
  $('#orderForm').reset();
  $('#paymentBox').classList.add('hidden');
  $$('.error-msg').forEach(el => el.textContent = '');
  updateSummary();
  pendingOrder = null;
});

/* Live validation while typing */
$$('#orderForm input, #orderForm select, #payRef').forEach(el =>
  el.addEventListener('blur', () => validateField(el)));

/* ---------------- Order tracking ------------------------------ */
$('#trackBtn').addEventListener('click', () => {
  const id = $('#trackInput').value.trim().toUpperCase();
  const box = $('#trackResult');
  if (!id) { toast('Enter your Order ID.', true); return; }

  // PRODUCTION: fetch(`/api/orders/${id}`) instead of localStorage
  const order = getOrders().find(o => o.id.toUpperCase() === id);
  if (!order) {
    box.classList.remove('hidden');
    box.innerHTML = `<h3>❌ Order not found</h3><p class="muted">Check your Order ID (${id}) and try again, or contact support on WhatsApp.</p>`;
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = `
    <h3>ORDER ${order.id}</h3>
    <p class="muted">Package: ${order.packageName} • ${money(order.price)} • Placed ${new Date(order.createdAt).toLocaleString()}</p>
    <p style="margin-top:12px"><span class="status-pill status-${order.status}">${order.status.toUpperCase()}</span></p>`;
});
$('#trackInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#trackBtn').click(); });

/* ---------------- FAQ (smooth native <details>) ---------------- */
$$('#faqList details').forEach(d =>
  d.addEventListener('toggle', () => {
    if (d.open) $$('#faqList details').forEach(o => { if (o !== d) o.open = false; });
  }));

/* ---------------- Init ---------------------------------------- */
renderPackages();
renderPackageSelect();
updateSummary();
initReveal();
animateCounters();
