const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0b0810');
  tg.setBackgroundColor('#0b0810');
}

const API = window.location.origin;
let currentStep = 1;
let selectedService = null;
let selectedSlot = null;
let photos = [];
let adminToken = localStorage.getItem('adminToken');
const myTgId = tg?.initDataUnsafe?.user?.id || null;

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.page === id);
  });
  if (id === 'bookings') loadMyBookings();
}


function startBooking() {
  showPage('booking');
  currentStep = 1;
  updateProgress();
  loadServices();
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  document.getElementById('step-1').classList.remove('hidden');
}

function goStep(n) {
  currentStep = n === 'success' ? 5 : n;
  updateProgress();
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(n === 'success' ? 'step-success' : 'step-' + n);
  if (el) el.classList.remove('hidden');
  if (n === 3) loadSlots();
  if (n === 5) renderSummary();
}

function updateProgress() {
  const p = (currentStep / 5) * 100;
  document.getElementById('progress-bar').style.setProperty('--p', p + '%');
  document.getElementById('progress-text').textContent = `Шаг ${currentStep} из 5`;
}

const SERVICES = [
  { id: 'ext_1_2', name: 'Наращивание длина 1–2', price: 2000 },
  { id: 'ext_3_4', name: 'Наращивание длина 3–4', price: 2300 },
  { id: 'ext_5_6', name: 'Наращивание длина 5–6', price: 2600 },
  { id: 'gel', name: 'Покрытие гелем', price: 1500 },
  { id: 'model', name: 'Моделирование', price: 1800 },
  { id: 'combo', name: 'Комбинированный маникюр', price: 1000 },
  { id: 'remove_combo', name: 'Снятие + комб. маникюр', price: 1200 },
];

function loadServices() {
  const list = document.getElementById('services-list');
  list.innerHTML = '';
  SERVICES.forEach(s => {
    const el = document.createElement('div');
    el.className = 'service-item';
    el.innerHTML = `<span>${s.name}</span><span class="price">${s.price.toLocaleString('ru')} ₽</span>`;
    el.onclick = () => {
      document.querySelectorAll('.service-item').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
      selectedService = s;
      document.getElementById('btn-next-1').disabled = false;
    };
    list.appendChild(el);
  });
}

document.getElementById('btn-next-1').onclick = () => { if (selectedService) goStep(2); };

document.getElementById('photo-input').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files).slice(0, 3 - photos.length);
  for (const file of files) {
    if (file.size > 2.5 * 1024 * 1024) { alert('Фото слишком большое (макс ~2.5 МБ)'); continue; }
    const b64 = await fileToBase64(file);
    photos.push(b64);
  }
  renderPhotos();
});

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function renderPhotos() {
  const box = document.getElementById('photos-preview');
  box.innerHTML = photos.map((p, i) => `
    <div style="position:relative">
      <img src="${p}" />
      <span onclick="removePhoto(${i})" style="position:absolute;top:-6px;right:-6px;background:#f87171;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;font-weight:700">×</span>
    </div>
  `).join('');
}

function removePhoto(i) { photos.splice(i, 1); renderPhotos(); }

async function loadSlots() {
  const box = document.getElementById('slots-container');
  box.innerHTML = 'Загрузка...';
  try {
    const res = await fetch(API + '/api/slots');
    const slots = await res.json();
    if (!slots.length) {
      box.innerHTML = '<div class="hint">Свободных окошек пока нет</div>';
      return;
    }
    box.innerHTML = '';
    slots.forEach(s => {
      const d = new Date(s.date + 'T00:00:00');
      const days = ['вс','пн','вт','ср','чт','пт','сб'];
      const label = `${days[d.getDay()]} ${s.date.slice(8)}.${s.date.slice(5,7)} · ${s.time}`;
      const el = document.createElement('div');
      el.className = 'slot-item';
      el.innerHTML = `<span>${label}</span><span style="color:#4ade80;font-size:13px;font-weight:700">свободно</span>`;
      el.onclick = () => {
        document.querySelectorAll('.slot-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');
        selectedSlot = s;
        document.getElementById('btn-next-3').disabled = false;
      };
      box.appendChild(el);
    });
  } catch (e) {
    box.innerHTML = 'Ошибка загрузки';
  }
}

document.getElementById('btn-next-3').onclick = () => { if (selectedSlot) goStep(4); };

function renderSummary() {
  const name = document.getElementById('client-name').value;
  const phone = document.getElementById('client-phone').value;
  const user = document.getElementById('client-username').value;
  const comment = document.getElementById('design-comment').value;
  document.getElementById('summary').innerHTML = `
    <div><strong>${selectedService?.name}</strong> — ${selectedService?.price.toLocaleString('ru')} ₽</div>
    <div>📅 ${selectedSlot?.date} ${selectedSlot?.time}</div>
    <div>👤 ${name}</div>
    <div>📞 ${phone}</div>
    ${user ? `<div>@${user.replace('@','')}</div>` : ''}
    ${comment ? `<div>💬 ${comment}</div>` : ''}
    ${photos.length ? `<div>🖼 Фото: ${photos.length}</div>` : ''}
  `;
}

function copyRequisites() {
  navigator.clipboard.writeText('+79226466607').then(() => {
    alert('Номер скопирован: +79226466607');
  });
}

document.getElementById('btn-submit').onclick = async () => {
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const username = document.getElementById('client-username').value.trim();
  const comment = document.getElementById('design-comment').value.trim();
  if (!name || !phone) return alert('Заполни имя и телефон');
  if (!selectedSlot || !selectedService) return alert('Выбери услугу и время');

  try {
    const res = await fetch(API + '/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: selectedSlot.id,
        client_name: name,
        client_username: username || tg?.initDataUnsafe?.user?.username || '',
        client_phone: phone,
        service: selectedService.name,
        comment,
        tg_id: myTgId,
        photos
      })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Ошибка');
    goStep('success');
  } catch (e) {
    alert('Ошибка сети');
  }
};

// ===== MY BOOKINGS =====
async function loadMyBookings() {
  const box = document.getElementById('my-bookings-list');
  if (!box) return;
  box.innerHTML = '<div class="empty">Загрузка...</div>';
  if (!myTgId) {
    box.innerHTML = '<div class="empty">Открой приложение через Telegram, чтобы видеть свои записи</div>';
    return;
  }
  try {
    const res = await fetch(API + '/api/my-bookings?tg_id=' + myTgId);
    const list = await res.json();
    if (!list.length) {
      box.innerHTML = '<div class="empty">Пока нет записей.<br>После заявки они появятся здесь.</div>';
      return;
    }
    box.innerHTML = list.map(s => {
      const statusMap = { pending: 'Ожидает подтверждения', booked: 'Подтверждена', cancelled: 'Отменена' };
      const colorMap = { pending: '#fbbf24', booked: '#4ade80', cancelled: '#f87171' };
      return `
        <div class="booking-card">
          <div class="date">${s.date} · ${s.time}</div>
          <div>${s.service || '—'}</div>
          <div style="color:var(--muted);font-size:13px;margin-top:4px">${s.client_name}</div>
          <span class="status-tag" style="background:${colorMap[s.status]}22;color:${colorMap[s.status]}">${statusMap[s.status] || s.status}</span>
        </div>
      `;
    }).join('');
  } catch {
    box.innerHTML = '<div class="empty">Ошибка загрузки</div>';
  }
}

// ===== ADMIN =====
document.getElementById('btn-admin-login').onclick = async () => {
  const login = document.getElementById('admin-login').value;
  const password = document.getElementById('admin-pass').value;
  try {
    const res = await fetch(API + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    adminToken = data.token;
    localStorage.setItem('adminToken', adminToken);
    document.getElementById('admin-login-box').classList.add('hidden');
    document.getElementById('admin-content').classList.remove('hidden');
    loadAdmin();
  } catch (e) {
    alert('Ошибка');
  }
};

function logoutAdmin() {
  adminToken = null;
  localStorage.removeItem('adminToken');
  document.getElementById('admin-content').classList.add('hidden');
  document.getElementById('admin-login-box').classList.remove('hidden');
}

async function loadAdmin() {
  try {
    const res = await fetch(API + '/api/admin/settings', { headers: { 'X-Admin-Token': adminToken } });
    const s = await res.json();
    document.getElementById('notify-id').value = s.admin_tg_id || '';
  } catch {}

  const box = document.getElementById('admin-slots');
  try {
    const res = await fetch(API + '/api/admin/slots', { headers: { 'X-Admin-Token': adminToken } });
    const slots = await res.json();
    box.innerHTML = slots.map(s => {
      const photosHtml = (s.photos && s.photos.length)
        ? `<div class="admin-photos">${s.photos.map(p => `<img src="${p}" onclick="window.open('${p}')" />`).join('')}</div>`
        : '';
      return `
        <div class="admin-slot">
          <div>
            <strong>${s.date} ${s.time}</strong>
            <span class="status status-${s.status}">${s.status}</span>
          </div>
          ${s.client_name ? `
            <div style="font-size:13px;margin-top:8px;color:#c4b5fd;line-height:1.5">
              👤 ${s.client_name}<br>
              📞 ${s.client_phone || '—'}<br>
              ${s.client_username ? '@' + s.client_username.replace('@','') + '<br>' : ''}
              ${s.service ? '💅 ' + s.service + '<br>' : ''}
              ${s.comment ? '💬 ' + s.comment : ''}
            </div>
            ${photosHtml}
          ` : ''}
          <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            ${s.status === 'pending' ? `
              <button class="btn-sec small" onclick="setStatus('${s.id}','booked')">Подтвердить</button>
              <button class="btn-sec small" onclick="setStatus('${s.id}','cancelled')">Отклонить</button>
            ` : ''}
            ${s.status === 'booked' ? `
              <button class="btn-sec small" onclick="setStatus('${s.id}','cancelled')">Отменить</button>
            ` : ''}
            ${s.status === 'available' ? `
              <button class="btn-sec small" onclick="delSlot('${s.id}')">Удалить</button>
            ` : ''}
            ${s.status !== 'available' ? `
              <button class="btn-sec small" onclick="editSlot('${s.id}')">Редактировать</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('') || '<div class="empty">Нет слотов</div>';
  } catch {
    box.innerHTML = 'Ошибка загрузки';
  }
}

document.getElementById('btn-save-notify').onclick = async () => {
  const id = document.getElementById('notify-id').value.trim();
  await fetch(API + '/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
    body: JSON.stringify({ admin_tg_id: id })
  });
  alert('Сохранено');
};

document.getElementById('btn-add-slot').onclick = async () => {
  const date = document.getElementById('new-date').value;
  const time = document.getElementById('new-time').value;
  if (!date || !time) return alert('Укажи дату и время');
  await fetch(API + '/api/admin/slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
    body: JSON.stringify({ date, time })
  });
  loadAdmin();
};

async function setStatus(id, status) {
  await fetch(API + '/api/admin/slots/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
    body: JSON.stringify({ status })
  });
  loadAdmin();
}

async function delSlot(id) {
  if (!confirm('Удалить слот?')) return;
  await fetch(API + '/api/admin/slots/' + id, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': adminToken }
  });
  loadAdmin();
}

async function editSlot(id) {
  const newTime = prompt('Новое время (ЧЧ:ММ):');
  if (!newTime) return;
  const newDate = prompt('Новая дата (ГГГГ-ММ-ДД):');
  if (!newDate) return;
  await fetch(API + '/api/admin/slots/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
    body: JSON.stringify({ date: newDate, time: newTime })
  });
  loadAdmin();
}
