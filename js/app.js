// ============================================================
// APP — helper UI, modal, gambar, login, navigasi menu, profil
// ============================================================
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Ikon SVG (tanpa emoji; gaya garis konsisten) ----------
const IKON = {
  hitung: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01M16 14v4"/>',
  buku: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  sains: '<path d="M10 2v7.5a2 2 0 0 1-.2.9L4.7 20.5a1 1 0 0 0 .9 1.5h12.8a1 1 0 0 0 .9-1.5l-5.1-10.1a2 2 0 0 1-.2-.9V2"/><path d="M8.5 2h7M7 16h10"/>',
  bendera: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  dunia: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  bintang: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>',
  musik: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  seni: '<circle cx="13.5" cy="6.5" r=".6"/><circle cx="17.5" cy="10.5" r=".6"/><circle cx="8.5" cy="7.5" r=".6"/><circle cx="6.5" cy="12.5" r=".6"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.7-1.7H16c3 0 5.5-2.5 5.5-5.5C21.5 6 17.5 2 12 2z"/>',
  alam: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.500-4.800 10-10 10z"/><path d="M2 21c0-3 1.900-5.400 5.100-6C9.500 14.500 12 13 13 12"/>',
  olahraga: '<path d="M6 9H4.500a2.500 2.500 0 0 1 0-5H6M18 9h1.500a2.500 2.500 0 0 0 0-5H18M4 22h16"/><path d="M10 14.700V17c0 .6-.5 1-1 1.200C7.800 18.800 7 20.200 7 22M14 14.700V17c0 .6.5 1 1 1.200 1.200.6 2 2 2 3.800"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
  agama: '<path d="M19 14c1.500-1.500 3-3.200 3-5.500A5.500 5.500 0 0 0 16.500 3c-1.800 0-3 .5-4.500 2-1.500-1.500-2.700-2-4.500-2A5.500 5.500 0 0 0 2 8.500c0 2.300 1.500 4.100 3 5.500l7 7z"/>',
  komputer: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  soal: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  mapel: '<rect x="3" y="3" width="7" height="7" rx="1.500"/><rect x="14" y="3" width="7" height="7" rx="1.500"/><rect x="3" y="14" width="7" height="7" rx="1.500"/><rect x="14" y="14" width="7" height="7" rx="1.500"/>',
  jadwal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  analisis: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  pelanggaran: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.900M16 3.100a4 4 0 0 1 0 7.800"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  riwayat: '<path d="M3 3v5h5"/><path d="M3.050 13A9 9 0 1 0 6 5.300L3 8"/><path d="M12 7v5l4 2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  kunci: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M6.300 17.700l-1.400 1.400M19.100 4.900l-1.400 1.400"/>',
  moon: '<path d="M21 12.800A9 9 0 1 1 11.200 3 7 7 0 0 0 21 12.800z"/>',
  panah: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  topi: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  tambah: '<path d="M12 5v14M5 12h14"/>'
};
function ikon(nama, ukuran, tebal) {
  return `<svg class="ico" viewBox="0 0 24 24" width="${ukuran || 20}" height="${ukuran || 20}" fill="none" stroke="currentColor" stroke-width="${tebal || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[nama] || IKON.buku}</svg>`;
}
function bintangNilai(nilai, kkm) { return nilai >= 90 ? 3 : nilai >= (kkm == null ? 70 : kkm) ? 2 : nilai >= 50 ? 1 : 0; }

// ---------- Konfeti perayaan (ringan, menghormati prefers-reduced-motion) ----------
function confetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const warna = ['#4F46E5', '#F59E0B', '#10B981', '#E11D48', '#0EA5E9', '#7C3AED'];
  const p = Array.from({ length: 110 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
    vx: -1.500 + Math.random() * 3, vy: 2.500 + Math.random() * 3.500, r: Math.random() * 6, vr: -.2 + Math.random() * .4, c: warna[Math.floor(Math.random() * warna.length)] }));
  const t0 = performance.now();
  (function f(t) {
    x.clearRect(0, 0, c.width, c.height);
    p.forEach(o => { o.x += o.vx; o.y += o.vy; o.r += o.vr; x.save(); x.translate(o.x, o.y); x.rotate(o.r); x.fillStyle = o.c; x.fillRect(-o.w / 2, -o.h / 2, o.w, o.h); x.restore(); });
    if (t - t0 < 3200) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
  })(t0);
}

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function fromLocalInput(v) { const d = new Date(v); return isNaN(d.getTime()) ? '' : d.toISOString(); }
function nilaiCls(n, kkm) { return n >= (kkm == null ? 70 : kkm) ? 'text-emerald-600' : 'text-rose-600'; }

// ---------- Komponen tampilan kecil ----------
function pageHead(title, sub, actions) {
  return `<div class="bg-white rounded-2xl card-shadow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
    <div><h1 class="text-xl font-bold text-slate-800">${title}</h1>${sub ? `<p class="text-sm text-slate-500">${sub}</p>` : ''}</div>
    <div class="flex flex-wrap gap-2">${actions || ''}</div></div>`;
}
function statCard(label, value, tone) {
  const t = { blue: 'bg-blue-50 border-blue-100 text-blue-700', green: 'bg-emerald-50 border-emerald-100 text-emerald-700', amber: 'bg-amber-50 border-amber-100 text-amber-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-700', slate: 'bg-slate-50 border-slate-200 text-slate-700' }[tone || 'blue'];
  return `<div class="rounded-xl p-4 border ${t}"><p class="text-xs font-semibold uppercase opacity-80">${label}</p><p class="text-2xl font-bold">${value}</p></div>`;
}
function tabel(heads, rows, kosong) {
  return `<div class="overflow-x-auto"><table class="tbl"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.length ? rows.join('') : `<tr><td colspan="${heads.length}" class="text-center text-slate-400 italic py-6">${kosong || 'Belum ada data.'}</td></tr>`}</tbody></table></div>`;
}
function imgTag(url, cls) {
  return url ? `<img src="${esc(url)}" class="${cls}" alt="Gambar soal" loading="lazy" referrerpolicy="no-referrer" draggable="false" onclick="zoomImg(this.src)">` : '';
}
function zoomImg(src) { Swal.fire({ imageUrl: src, imageAlt: 'Gambar', showConfirmButton: false, showCloseButton: true, width: 'auto', padding: '1rem' }); }
function optHtml(q, k) { return `${esc(q['opsi_' + k])}${imgTag(q['gambar_' + k], 'opt-img')}`; }

function skeleton() {
  return `<div class="skel h-20 mb-5"></div><div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5"><div class="skel h-20"></div><div class="skel h-20"></div><div class="skel h-20"></div><div class="skel h-20"></div></div><div class="skel h-64"></div>`;
}

// ---------- Notifikasi & dialog ----------
const UI = {
  loading(msg) { Swal.fire({ title: msg || 'Memuat...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() }); },
  close() { Swal.close(); },
  ok(msg) {                                   // toast kecil: tidak memblokir layar, tidak perlu ditunggu
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: msg, timer: 1800, timerProgressBar: true, showConfirmButton: false, backdrop: false });
  },
  err(msg, title) { return Swal.fire({ icon: 'error', title: title || 'Gagal', text: msg, confirmButtonColor: '#2563EB' }); },
  async yakin(title, html, label, merah) {
    const r = await Swal.fire({ title: title, html: html, icon: 'warning', showCancelButton: true, confirmButtonText: label || 'Ya',
      cancelButtonText: 'Batal', confirmButtonColor: merah ? '#EF4444' : '#2563EB' });
    return r.isConfirmed;
  }
};

// ---------- Modal formulir ----------
const Modal = {
  open(title, body, opt) {
    opt = opt || {};
    $('modalRoot').innerHTML = `<div class="modal-back"><div class="modal-box ${opt.lebar || 'max-w-2xl'}">
      <div class="modal-head"><h3 class="font-bold text-lg text-slate-800">${esc(title)}</h3>
        <button type="button" onclick="Modal.close()" class="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot"><button type="button" onclick="Modal.close()" class="btn-gray">Batal</button>
        ${opt.simpan ? `<button type="button" id="modalSave" class="${opt.kelasSimpan || 'btn-blue'}">${esc(opt.label || 'Simpan')}</button>` : ''}</div></div></div>`;
    document.body.classList.add('modal-open');
    if (opt.simpan) {
      $('modalSave').onclick = async function () {
        const b = this; b.disabled = true; b.textContent = 'Menyimpan...';
        let ok = false;
        try { ok = await opt.simpan(); } catch (e) { UI.err(e.message); }
        if (ok) Modal.close();
        else if ($('modalSave')) { b.disabled = false; b.textContent = opt.label || 'Simpan'; }
      };
    }
    Modal._tutup = opt.onTutup || null;
    if (opt.onOpen) opt.onOpen();
  },
  close() {
    $('modalRoot').innerHTML = ''; document.body.classList.remove('modal-open');
    const f = Modal._tutup; Modal._tutup = null;
    if (f) f();
  }
};

// ---------- Kompres gambar di browser sebelum diunggah ----------
function compressImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return reject(new Error('Format gambar harus JPG, PNG, WEBP, atau GIF.'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Ukuran file terlalu besar (maksimal 15 MB).'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.onload = () => {
      if (file.type === 'image/gif') {
        if (file.size > 1.5 * 1024 * 1024) return reject(new Error('GIF maksimal 1,5 MB.'));
        return resolve({ dataUrl: reader.result, mime: 'image/gif' });
      }
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        const s = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        let q = 0.85, out = c.toDataURL('image/jpeg', q);
        while (out.length > 1.2 * 1024 * 1024 && q > 0.4) { q -= 0.15; out = c.toDataURL('image/jpeg', q); }
        resolve({ dataUrl: out, mime: 'image/jpeg' });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Aplikasi: sesi, login, navigasi ----------
const App = {
  user: null,
  setting: { nama_sekolah: '', max_pelanggaran: 5, tampil_pembahasan: true },
  nav: 0,
  page: '',
  _keluarPaksa: false,
  MENU: {
    admin: [['dashboard', 'Dashboard', 'dash'], ['mapel', 'Mata Pelajaran', 'mapel'], ['soal', 'Bank Soal', 'soal'], ['jadwal', 'Jadwal Ujian', 'jadwal'], ['hasil', 'Rekap Nilai', 'olahraga'],
      ['analisis', 'Analisis Soal', 'analisis'], ['pelanggaran', 'Log Pelanggaran', 'pelanggaran'], ['users', 'Pengguna', 'users'], ['pengaturan', 'Pengaturan', 'settings']],
    peserta: [['ujian', 'Ujianku', 'soal'], ['riwayat', 'Riwayat Nilai', 'riwayat'], ['profil', 'Profil', 'user']]
  },

  siapkanIkon() {
    $('brandIco').innerHTML = ikon('topi', 24); $('keluarIco').innerHTML = ikon('keluar', 20);
    $('fsIkon').innerHTML = ikon('kunci', 38); $('timerIco').innerHTML = ikon('clock', 20); $('raguIco').innerHTML = ikon('bendera', 18);
    App.ikonTema();
  },
  ikonTema() {
    const gelap = document.documentElement.getAttribute('data-theme') === 'dark';
    $('btnTema').innerHTML = ikon(gelap ? 'sun' : 'moon', 22);
  },
  tema() {                                    // mode terang/gelap, tersimpan di perangkat
    const gelap = document.documentElement.getAttribute('data-theme') === 'dark';
    if (gelap) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('ujian_tema', gelap ? 'terang' : 'dark'); } catch (e) { /* abaikan */ }
    App.ikonTema();
  },

  show(id) {
    ['viewConfig', 'viewLogin', 'viewApp', 'viewExam'].forEach(v => $(v).classList.toggle('hidden', v !== id));
    $('mainNav').classList.toggle('hidden', id !== 'viewApp');
  },
  setNama(n) {
    n = n || 'UJIAN ONLINE';
    try { localStorage.setItem('ujian_nama', n); } catch (e) { /* abaikan */ }
    $('brandName').textContent = n + ' — UJIAN ONLINE';
    $('footName').textContent = n;
    document.title = 'Ujian Online — ' + n;
  },

  async init() {
    App.siapkanIkon();
    if (!configValid()) { App.show('viewConfig'); return; }
    const nama = localStorage.getItem('ujian_nama'); if (nama) App.setNama(nama);
    const u = Sesi.user;
    if (Sesi.token && u) {
      // Masuk LANGSUNG dari data tersimpan (tanpa menunggu server); sesi divalidasi di latar belakang oleh app.boot
      App.user = u; App.setting = Sesi.setting || App.setting;
      Data.pulihkan();
      Data.mulaiBoot().then(r => { if (r && !r.success && r.code !== 'AUTH' && !r.network) UI.err(r.message); });
      App.masuk();
      if (App.user.role === 'admin') Lib.praMuatAdmin();
      return;
    }
    Gate.mulai();                                             // gerbang: mata pelajaran → kode akses → login
  },

  async login(e) {
    e.preventDefault();
    const btn = $('loginBtn'); btn.disabled = true; btn.textContent = 'Memproses...';
    const body = { username: $('loginUsername').value, password: $('loginPassword').value };
    if (!Gate.s.admin) body.tiket = Gate.s.tiket;              // siswa membawa tiket dari gerbang
    const r = await api('auth.login', body);
    btn.disabled = false; btn.textContent = 'Masuk';
    if (!r.success) {
      if (r.code === 'TIKET') { Gate.mulai(); return UI.err(r.message, 'Pilih mata pelajaran lagi'); }
      return UI.err(r.message, 'Login Gagal');
    }
    Sesi.simpan(r.data.token, r.data.user);
    App.user = r.data.user; App.setting = r.data.setting; Sesi.simpanSetting(App.setting); App.setNama(App.setting.nama_sekolah);
    $('loginForm').reset();
    Data.reset();
    Object.keys(r.data.boot || {}).forEach(k => Data.put(k, r.data.boot[k]));   // data halaman pertama ikut dalam respons login
    App.masuk();                                                                   // tampil seketika
    Data.mulaiBoot();                                                              // sisa menu dimuat diam-diam
    if (App.user.role === 'admin') Lib.praMuatAdmin();
  },

  masuk() {
    $('navUserName').textContent = App.user.nama_lengkap + ' (' + App.user.role.toUpperCase() + ')';
    $('btnKeluar').classList.remove('hidden');
    App.show('viewApp');
    const menu = App.MENU[App.user.role];
    $('navItems').innerHTML = menu.map(m => `<button class="nav-tab" data-page="${m[0]}" onclick="App.go('${m[0]}')">${ikon(m[2], 18)}<span>${m[1]}</span></button>`).join('');
    const h = location.hash.slice(1);
    App.go(menu.some(m => m[0] === h) ? h : menu[0][0]);
  },

  async go(page) {
    if (Exam.running) return;
    App.page = page; location.hash = page; App.nav++;
    const id = App.nav;
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    $('page').innerHTML = skeleton();
    const fn = (App.user.role === 'admin' ? Admin : Peserta).pages[page];
    if (fn) await fn(id);
  },

  async keluar() {
    if (Exam.running && !(await UI.yakin('Keluar saat ujian?', 'Ujian sedang berlangsung. Jawaban yang belum dikumpulkan tidak akan dinilai.', 'Ya, keluar', true))) return;
    Exam.bersihkan();
    Data.reset(); Sesi.hapus(); App.user = null;
    $('btnKeluar').classList.add('hidden'); $('navUserName').textContent = '';
    Gate.mulai();
  },

  paksaKeluar() {            // dipanggil api() saat token ditolak server
    if (Exam.running || App._keluarPaksa || !App.user) return;
    App._keluarPaksa = true;
    Data.reset(); Sesi.hapus(); App.user = null;
    $('btnKeluar').classList.add('hidden'); $('navUserName').textContent = '';
    Gate.mulai();
    UI.err('Sesi Anda berakhir. Silakan login kembali.', 'Sesi Berakhir').then(() => { App._keluarPaksa = false; });
  },

  // ---------- Profil & ganti password (dipakai admin & peserta) ----------
  profilHtml() {
    const u = App.user;
    return `<div class="bg-white rounded-2xl card-shadow p-6 max-w-xl space-y-4">
      <div><h3 class="font-bold text-slate-800 text-lg">Akun Saya</h3>
        <p class="text-sm text-slate-600 mt-1">${esc(u.nama_lengkap)} &middot; <span class="font-mono">${esc(u.username)}</span> &middot; <span class="badge b-blue">${esc(u.role.toUpperCase())}</span></p></div>
      <form onsubmit="App.gantiPassword(event)" class="space-y-3 border-t pt-4">
        <h4 class="font-semibold text-slate-700">Ganti Password</h4>
        <div><label class="lbl">Password lama</label><input type="password" id="pwLama" required autocomplete="current-password" class="inp"></div>
        <div><label class="lbl">Password baru (minimal 6 karakter)</label><input type="password" id="pwBaru" required minlength="6" autocomplete="new-password" class="inp"></div>
        <div><label class="lbl">Ulangi password baru</label><input type="password" id="pwUlang" required minlength="6" autocomplete="new-password" class="inp"></div>
        <button type="submit" class="btn-blue">Simpan Password</button>
      </form></div>`;
  },
  async gantiPassword(e) {
    e.preventDefault();
    const lama = $('pwLama').value, baru = $('pwBaru').value, ulang = $('pwUlang').value;
    if (baru !== ulang) return UI.err('Ulangi password baru tidak sama.');
    UI.loading('Menyimpan password...');
    const r = await api('auth.gantiPassword', { lama: lama, baru: baru });
    UI.close();
    if (!r.success) return UI.err(r.message);
    Sesi.simpan(r.data.token, null);
    e.target.reset();
    UI.ok('Password berhasil diganti');
  }
};

window.addEventListener('DOMContentLoaded', App.init);
