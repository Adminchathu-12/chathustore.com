/* ============================================================
   CHATHUTOPUP — admin.js
   Dashboard: login gate (demo), stats, order status updates,
   package price management.
   PRODUCTION: all reads/writes must go through a secured API
   with server-side authentication. localStorage here is demo-only.
   ============================================================ */

const $ = (s) => document.querySelector(s);
const LS_PACKAGES = 'ct_packages';
const LS_ORDERS = 'ct_orders';
const DEMO_PASS = 'admin123'; // ⚠ demo only — use hashed server auth!

const getOrders = () => JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
const setOrders = (o) => localStorage.setItem(LS_ORDERS, JSON.stringify(o));
const getPackages = () => JSON.parse(localStorage.getItem(LS_PACKAGES) || 'null') || [
  { id: 100, name: '100 Diamonds', price: 190, popular: false },
  { id: 210, name: '210 Diamonds', price: 370, popular: false },
  { id: 530, name: '530 Diamonds', price: 890, popular: true },
  { id: 1080, name: '1080 Diamonds', price: 1750, popular: false },
  { id: 2200, name: '2200 Diamonds', price: 3450, popular: false },
  { id: 5600, name: '5600 Diamonds', price: 8450, popular: false },
];

/* ---------- Loading screen ---------- */
window.addEventListener('load', () =>
  setTimeout(() => $('#loader').classList.add('done'), 500));

/* ---------- Login gate (DEMO) ---------- */
$('#loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if ($('#adminUser').value.trim() && $('#adminPass').value === DEMO_PASS) {
    sessionStorage.setItem('ct_admin', '1');
    showDashboard();
  } else {
    $('#loginErr').textContent = 'Invalid credentials. (Demo pass: admin123)';
  }
});
$('#logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('ct_admin');
  location.reload();
});
if (sessionStorage.getItem('ct_admin') === '1') showDashboard();

function showDashboard() {
  $('#loginView').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');
  renderStats();
  renderOrders();
  renderPackageEditor();
}

/* ---------- Stats ---------- */
function renderStats() {
  const o = getOrders();
  $('#stTotal').textContent = o.length;
  $('#stPending').textContent = o.filter(x => x.status === 'Pending').length;
  $('#stProcessing').textContent = o.filter(x => x.status === 'Processing').length;
  $('#stCompleted').textContent = o.filter(x => x.status === 'Completed').length;
}

/* ---------- Order table + status updates ---------- */
const STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled'];

function renderOrders() {
  const orders = getOrders();
  $('#noOrders').style.display = orders.length ? 'none' : 'block';
  $('#ordersBody').innerHTML = orders.map((o, i) => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.customerName}<br><span class="muted">${o.phone}</span></td>
      <td>${o.playerId}<br><span class="muted">${o.server}</span></td>
      <td>${o.packageName}</td>
      <td>LKR ${Number(o.price).toLocaleString()}</td>
      <td>${o.payRef || '—'}</td>
      <td>
        <select data-order-index="${i}">
          ${STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');

  // Status change handler
  $$_('#ordersBody select').forEach(sel =>
    sel.addEventListener('change', () => {
      const orders = getOrders();
      orders[+sel.dataset.orderIndex].status = sel.value;
      setOrders(orders);
      renderStats();
    }));
}
function $$_(s) { return Array.from(document.querySelectorAll(s)); }

/* ---------- Package editor ---------- */
function renderPackageEditor() {
  const pkgs = getPackages();
  $('#pkgEditor').innerHTML = pkgs.map((p, i) => `
    <div class="pkg-row">
      <strong>${p.name}</strong>
      <label>Price (LKR)
        <input class="pkg-price-input" type="number" min="1" value="${p.price}" data-i="${i}" />
      </label>
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" data-pop="${i}" ${p.popular ? 'checked' : ''} /> Popular
      </label>
    </div>`).join('');
}

$('#savePackages').addEventListener('click', () => {
  const pkgs = getPackages();
  $$_('.pkg-price-input').forEach(inp => pkgs[+inp.dataset.i].price = Math.max(1, +inp.value || 1));
  $$_('[data-pop]').forEach(cb => pkgs[+cb.dataset.pop].popular = cb.checked);
  localStorage.setItem(LS_PACKAGES, JSON.stringify(pkgs));
  alert('Packages saved. They now appear on the store page.');
});
