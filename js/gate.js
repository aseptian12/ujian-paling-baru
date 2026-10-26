// ============================================================
// GATE — layar sebelum login:  Mata Pelajaran  →  Kode Akses  →  Login
// Siswa hanya bisa masuk lewat gerbang ini; akunnya lalu hanya melihat ujian yang dipilih.
// Guru/Admin memakai tautan "Masuk sebagai Guru / Admin" (tanpa mata pelajaran & kode).
// Daftar mata pelajaran disimpan di perangkat sehingga tampil seketika.
// ============================================================
const Gate = {
  s: { langkah: 'mapel', mapel: null, tiket: '', ujian: null, pilih: null, admin: false },
  daftar: [],

  device() {                                     // penanda perangkat acak (untuk membatasi tebak kode per perangkat)
    let d = localStorage.getItem('ujian_dev');
    if (!d) {
      const h = 'abcdefghijklmnopqrstuvwxyz0123456789';
      d = Array.from(crypto.getRandomValues(new Uint8Array(14))).map(b => h[b % h.length]).join('');
      try { localStorage.setItem('ujian_dev', d); } catch (e) { /* abaikan */ }
    }
    return d;
  },

  mulai() {                                      // tampilkan gerbang (dipanggil saat belum login / setelah keluar)
    Gate.s = { langkah: 'mapel', mapel: null, tiket: '', ujian: null, pilih: null, admin: false };
    try { Gate.daftar = JSON.parse(localStorage.getItem('ujian_gate') || '[]'); } catch (e) { Gate.daftar = []; }
    App.show('viewLogin');
    Gate.render();
    Gate.segarkan();
  },
  async segarkan() {
    const r = await api('app.mapel');
    if (r.success) {
      Gate.daftar = r.data.mapel; App.setNama(r.data.nama_sekolah);
      try { localStorage.setItem('ujian_gate', JSON.stringify(Gate.daftar)); } catch (e) { /* abaikan */ }
      Gate.gagalMuat = false; Gate.sudahMuat = true;
    } else if (!Gate.daftar.length) Gate.gagalMuat = r.message;
    if (Gate.s.langkah === 'mapel') Gate.render();
  },

  // ---------- tampilan ----------
  render() {
    const el = $('gate'); if (!el) return;
    const s = Gate.s;
    if (s.langkah === 'mapel') el.innerHTML = Gate.htmlMapel();
    else if (s.langkah === 'kode') el.innerHTML = Gate.htmlKode();
    else if (s.langkah === 'pilih') el.innerHTML = Gate.htmlPilih();
    else el.innerHTML = Gate.htmlLogin();
    const f = s.langkah === 'kode' ? $('gateKode') : s.langkah === 'login' ? $('loginUsername') : null;
    if (f) setTimeout(() => f.focus(), 60);
  },
  htmlMapel() {
    const tiles = Gate.daftar.map((m, i) => `<button class="mapel-tile mp-${esc(m.warna)} rise" style="--i:${i}" onclick="Gate.pilihMapel('${esc(m.id_mapel)}')" aria-label="${esc(m.nama_mapel)}${m.butuh_kode ? ', memerlukan kode akses' : ''}">
        <span class="mapel-go">${ikon('panah', 18)}</span><span class="mapel-ico">${ikon(m.ikon, 30)}</span>
        <span class="mapel-nama">${esc(m.nama_mapel)}</span><span class="mapel-desk">${esc(m.deskripsi || 'Mata pelajaran')}</span>
        <span class="mapel-foot"><span class="chip">${m.n_ujian} ujian dibuka</span>${m.butuh_kode ? `<span class="chip">${ikon('kunci', 12, 2.5)} pakai kode</span>` : ''}</span></button>`);
    const kosong = Gate.gagalMuat ? `<div class="col-span-full bg-white rounded-3xl card-shadow p-8 text-center"><p class="text-rose-600 font-bold mb-3">${esc(Gate.gagalMuat)}</p><button class="btn-blue" onclick="Gate.segarkan()">Coba lagi</button></div>`
      : '<div class="col-span-full bg-white rounded-3xl card-shadow p-10 text-center text-slate-500">Belum ada ujian yang dibuka saat ini. Tanyakan pada gurumu ya.</div>';
    const memuat = !tiles.length && !Gate.gagalMuat && !Gate.sudahMuat;
    return `<div class="space-y-6 fade-in">
      <section class="hero"><h1>Selamat datang, siswa hebat!</h1><p>Pilih mata pelajaran yang akan kamu kerjakan hari ini.</p></section>
      <section aria-labelledby="gMapel"><h2 id="gMapel" class="font-extrabold text-2xl mb-3 text-slate-800">1. Pilih Mata Pelajaran</h2>
        <div class="mapel-grid">${tiles.join('') || (memuat ? '<div class="skel h-44"></div><div class="skel h-44"></div><div class="skel h-44"></div>' : kosong)}</div></section>
      <p class="text-center"><button class="btn-gray" onclick="Gate.keAdmin()">${ikon('user', 18)} Masuk sebagai Guru / Admin</button></p></div>`;
  },
  chipMapel() {
    const m = Gate.s.mapel, u = Gate.s.ujian;
    return `<div class="mp-${esc(m.warna)} rounded-3xl p-4 text-white flex items-center gap-3 mb-5" style="background:linear-gradient(140deg,var(--c1),var(--c2));box-shadow:0 14px 28px -14px var(--c2)">
      <span class="mapel-ico" style="flex:none">${ikon(m.ikon, 28)}</span><div class="min-w-0 flex-1"><p class="font-display font-extrabold text-xl leading-tight">${esc(m.nama_mapel)}</p>
      ${u ? `<p class="text-sm font-bold opacity-90 truncate">${esc(u.nama)}</p>` : ''}</div>
      <button class="icon-btn" onclick="Gate.mulai()" aria-label="Ubah mata pelajaran" title="Ubah mata pelajaran" style="flex:none">${ikon('mapel', 20)}</button></div>`;
  },
  htmlKode() {
    const m = Gate.s.mapel;
    return `<div class="max-w-md mx-auto fade-in">${Gate.chipMapel()}
      <div class="bg-white rounded-3xl card-shadow p-6 sm:p-8"><h2 class="font-extrabold text-2xl mb-1">2. Kode Akses</h2>
        <p class="text-sm text-slate-600 mb-4">${m.kode_wajib ? 'Masukkan kode akses yang diberikan gurumu.' : 'Masukkan kode akses dari gurumu. Kosongkan jika ujiannya tidak memakai kode.'}</p>
        <form onsubmit="Gate.kirimKode(event)" class="space-y-3">
          <label class="lbl" for="gateKode">Kode akses</label>
          <input id="gateKode" class="inp kode-input" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="gateErr" placeholder="••••••" ${m.kode_wajib ? 'required' : ''}>
          <p id="gateErr" role="alert" class="hidden text-sm font-bold text-rose-600"></p>
          <button id="gateBtn" type="submit" class="btn-amber w-full text-base">Lanjut ${ikon('panah', 18)}</button></form>
        <button class="btn-gray w-full mt-3" onclick="Gate.mulai()">&larr; Pilih mata pelajaran lain</button></div></div>`;
  },
  htmlPilih() {
    const baris = Gate.s.pilih.map(u => `<button class="ujian-row" onclick="Gate.pilihUjian('${esc(u.id_ujian)}')"><span class="min-w-0"><span class="block font-extrabold text-slate-800 truncate">${esc(u.nama_ujian)}</span>
      <span class="block text-xs text-slate-500">${u.durasi_menit} menit</span></span>${ikon('panah', 18)}</button>`).join('');
    return `<div class="max-w-md mx-auto fade-in">${Gate.chipMapel()}<div class="bg-white rounded-3xl card-shadow p-6"><h2 class="font-extrabold text-2xl mb-3">2. Pilih Ujian</h2><div class="space-y-3">${baris}</div>
      <button class="btn-gray w-full mt-4" onclick="Gate.mulai()">&larr; Pilih mata pelajaran lain</button></div></div>`;
  },
  htmlLogin() {
    const s = Gate.s;
    return `<div class="max-w-md mx-auto fade-in">${s.admin
      ? `<section class="hero mb-5"><h1>Masuk Guru / Admin</h1><p>Kelola mata pelajaran, soal, jadwal, dan nilai.</p></section>`
      : Gate.chipMapel()}
      <div class="bg-white rounded-3xl card-shadow p-6 sm:p-8">${s.admin ? '' : '<h2 class="font-extrabold text-2xl mb-1">3. Masuk</h2><p class="text-sm text-slate-600 mb-4">Kode benar! Sekarang masuk dengan akunmu.</p>'}
        <form id="loginForm" onsubmit="App.login(event)" class="space-y-4">
          <div><label class="lbl" for="loginUsername">Username</label><input type="text" id="loginUsername" required autocomplete="username" autocapitalize="off" class="inp" placeholder="Contoh: siswa001"></div>
          <div><label class="lbl" for="loginPassword">Password</label><input type="password" id="loginPassword" required autocomplete="current-password" class="inp" placeholder="Masukkan password"></div>
          <button type="submit" id="loginBtn" class="btn-blue w-full text-base">Masuk</button></form>
        <button class="btn-gray w-full mt-3" onclick="Gate.mulai()">&larr; ${s.admin ? 'Kembali' : 'Ubah mata pelajaran'}</button></div></div>`;
  },

  // ---------- aksi ----------
  keAdmin() { Gate.s = { langkah: 'login', mapel: null, tiket: '', ujian: null, pilih: null, admin: true }; Gate.render(); },
  pilihMapel(id) {
    const m = Gate.daftar.filter(x => x.id_mapel === id)[0]; if (!m) return;
    Gate.s.mapel = m;
    if (m.butuh_kode) { Gate.s.langkah = 'kode'; Gate.render(); } else Gate.kirim('', '');       // tanpa kode: langsung lanjut (satu panggilan)
  },
  kirimKode(e) { e.preventDefault(); Gate.kirim($('gateKode').value.trim(), ''); },
  pilihUjian(id) { Gate.kirim('', id); },
  async kirim(kode, idUjian) {
    const s = Gate.s, btn = $('gateBtn'), di_kode = s.langkah === 'kode';
    if (di_kode && kode.length < 4) return Gate.salah('Masukkan kode akses dari gurumu.');
    if (btn) { btn.disabled = true; btn.textContent = 'Memeriksa...'; }
    else UI.loading('Menyiapkan ujian...');
    const r = await api('app.pilihMapel', { id_mapel: s.mapel.id_mapel, kode: kode, id_ujian: idUjian, dev: Gate.device() });
    if (!btn) UI.close();
    if (btn) { btn.disabled = false; btn.innerHTML = 'Lanjut ' + ikon('panah', 18); }
    if (!r.success) {
      if (di_kode) return Gate.salah(r.message);
      if (s.langkah === 'pilih') return UI.err(r.message);
      if (r.code === 'KODE') { s.langkah = 'kode'; Gate.render(); return Gate.salah(r.message); }
      return UI.err(r.message, 'Belum bisa masuk');
    }
    if (r.data.pilih) { s.pilih = r.data.pilih; s.langkah = 'pilih'; return Gate.render(); }
    s.tiket = r.data.tiket; s.ujian = { id: r.data.id_ujian, nama: r.data.nama_ujian };
    s.langkah = 'login'; Gate.render();
  },
  salah(pesan) {
    const e = $('gateErr'), k = $('gateKode');
    if (e) { e.textContent = pesan; e.classList.remove('hidden'); }
    if (k) { k.classList.remove('shake'); void k.offsetWidth; k.classList.add('shake'); k.focus(); k.select(); }
  }
};
