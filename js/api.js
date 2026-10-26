// ============================================================
// API — komunikasi dengan backend Google Apps Script + lapisan cache instan
// ============================================================
const Sesi = {
  get token() { return localStorage.getItem('ujian_token') || ''; },
  get user() { try { return JSON.parse(localStorage.getItem('ujian_user') || 'null'); } catch (e) { return null; } },
  get setting() { try { return JSON.parse(localStorage.getItem('ujian_setting') || 'null'); } catch (e) { return null; } },
  simpan(token, user) { localStorage.setItem('ujian_token', token); if (user) localStorage.setItem('ujian_user', JSON.stringify(user)); },
  simpanSetting(s) { try { localStorage.setItem('ujian_setting', JSON.stringify(s)); } catch (e) { /* abaikan */ } },
  hapus() { localStorage.removeItem('ujian_token'); localStorage.removeItem('ujian_user'); localStorage.removeItem('ujian_setting'); }
};

function configValid() {
  const u = window.APP_CONFIG && window.APP_CONFIG.GAS_URL;
  return !!u && !/GANTI|XXXX/.test(u);
}

// Selalu mengembalikan objek { success, message, data, network? } — tidak pernah melempar error
async function api(action, data) {
  if (!configValid()) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.' };
  try {
    const res = await fetch(window.APP_CONFIG.GAS_URL, {
      method: 'POST',
      // WAJIB text/plain agar tidak memicu CORS preflight (GAS tidak mendukung preflight)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: Sesi.token, data: data || {} })
    });
    const json = await res.json();
    if (json && json.code === 'AUTH') App.paksaKeluar();
    return json;
  } catch (e) {
    return { success: false, network: true, message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
  }
}

// ------------------------------------------------------------
// DATA — cache di memori + sessionStorage, pola "tampilkan dulu, segarkan di latar belakang"
//  1. Halaman tampil INSTAN dari cache (0 ms), tanpa loading.
//  2. Data disegarkan diam-diam di latar belakang; layar diperbarui hanya bila ada perubahan.
//  3. Semua data menu diambil SEKALI (app.boot) tepat setelah login.
// ------------------------------------------------------------
const Data = {
  mem: {}, t: {}, bootP: null, _tmr: null, SEGAR_MS: 20000,

  key(action) { return action + '|{}'; },
  _nama() { const u = Sesi.user; return 'ujian_cache_' + (u ? u.username : ''); },
  pulihkan() {
    try { const o = JSON.parse(sessionStorage.getItem(Data._nama()) || '{}'); Object.keys(o).forEach(k => { Data.mem[k] = o[k]; Data.t[k] = 0; }); } catch (e) { /* abaikan */ }
  },
  simpan() {                                   // simpan ke sessionStorage (ditunda agar tidak berat)
    clearTimeout(Data._tmr);
    Data._tmr = setTimeout(() => { try { sessionStorage.setItem(Data._nama(), JSON.stringify(Data.mem)); } catch (e) { /* penuh: abaikan */ } }, 400);
  },
  reset() { clearTimeout(Data._tmr); try { sessionStorage.removeItem(Data._nama()); } catch (e) { /* abaikan */ } Data.mem = {}; Data.t = {}; Data.bootP = null; },
  put(action, v) { const k = Data.key(action); Data.mem[k] = v; Data.t[k] = Date.now(); Data.simpan(); },
  ada(action) { return Data.key(action) in Data.mem; },
  ambil(action) { return Data.mem[Data.key(action)]; },
  basi(...actions) { actions.forEach(a => { Data.t[Data.key(a)] = 0; }); },   // tandai perlu disegarkan (data lama tetap tampil)
  _segar(k) { return Data.t[k] && Date.now() - Data.t[k] < Data.SEGAR_MS; },

  isiBoot(o) {
    Object.keys(o || {}).forEach(k => {
      if (k === '_setting') { App.setting = o[k]; Sesi.simpanSetting(o[k]); App.setNama(o[k].nama_sekolah); }
      else Data.put(k, o[k]);
    });
  },
  // Ambil SEMUA data menu dalam satu panggilan (latar belakang)
  mulaiBoot() {
    Data.bootP = api('app.boot').then(r => {
      Data.bootP = null;
      if (r.success) Data.isiBoot(r.data);
      return r;
    });
    return Data.bootP;
  },

  // Tampilkan dari cache lalu segarkan. render(dataMap, dariCache, errorResp)
  async swr(actions, render, navId) {
    if (typeof actions === 'string') actions = [actions];
    const basiHalaman = () => navId !== undefined && App.nav !== navId;
    const lengkap = () => actions.every(a => Data.ada(a));
    const kumpul = () => { const o = {}; actions.forEach(a => { o[a] = Data.ambil(a); }); return o; };
    if (!lengkap() && Data.bootP) { await Data.bootP; if (basiHalaman()) return; }
    const adaCache = lengkap();
    if (adaCache) render(kumpul(), true);                                  // INSTAN
    if (adaCache && Data.bootP) {                                          // boot sedang jalan: tunggu, jangan ambil dobel
      const snap = JSON.stringify(kumpul());
      await Data.bootP; if (basiHalaman()) return;
      if (JSON.stringify(kumpul()) !== snap) render(kumpul(), false);
    }
    const perlu = actions.filter(a => !Data.ada(a) || !Data._segar(Data.key(a)));
    if (!perlu.length) return;
    const hasil = await Promise.all(perlu.map(a => api(a, {})));
    const gagal = hasil.filter(r => !r.success)[0];
    if (gagal) { if (!adaCache && !basiHalaman()) render(null, false, gagal); return; }
    const sebelum = adaCache ? JSON.stringify(kumpul()) : '';
    perlu.forEach((a, i) => Data.put(a, hasil[i].data));
    if (!basiHalaman() && (!adaCache || JSON.stringify(kumpul()) !== sebelum)) render(kumpul(), false);
  }
};

// ------------------------------------------------------------
// LIB — pustaka berat (Excel) dimuat hanya saat dibutuhkan agar halaman awal ringan
// ------------------------------------------------------------
const Lib = {
  _p: {},
  URL: {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    exceljs: 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
    filesaver: 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
  },
  muat(nama) {
    if (!Lib._p[nama]) {
      Lib._p[nama] = new Promise((ok, gagal) => {
        const s = document.createElement('script');
        s.src = Lib.URL[nama]; s.onload = ok;
        s.onerror = () => { delete Lib._p[nama]; gagal(new Error('Gagal memuat pustaka ' + nama + '. Periksa koneksi internet.')); };
        document.head.appendChild(s);
      });
    }
    return Lib._p[nama];
  },
  butuh(...nama) { return Promise.all(nama.map(Lib.muat)); },
  praMuatAdmin() {                             // saat browser menganggur, siapkan pustaka Excel agar klik berikutnya instan
    const f = () => Lib.butuh('xlsx', 'exceljs', 'filesaver').catch(() => {});
    if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 8000 }); else setTimeout(f, 4000);
  }
};
