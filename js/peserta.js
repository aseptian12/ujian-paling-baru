// ============================================================
// PESERTA — daftar ujian, ruang ujian (bergambar), anti-cheat, hasil, riwayat
// ============================================================

// ---------- Anti-cheat ----------
const AntiCheat = {
  active: false, violations: 0, maxViolations: 5, violationLog: [], fullscreenExitCount: 0, blurCount: 0,
  devtoolsOpen: false, devtoolsInterval: null, lastViolationTime: 0, cooldown: 2000,

  init(max) {
    if (this.active) return;
    this.active = true; this.violations = 0; this.violationLog = []; this.fullscreenExitCount = 0; this.blurCount = 0;
    this.maxViolations = max || 5;
    document.body.classList.add('anti-cheat-active');
    this._bind(true);
    this.devtoolsInterval = setInterval(() => {
      if (!this.active) return;
      const t = 160, buka = (window.outerWidth - window.innerWidth > t) || (window.outerHeight - window.innerHeight > t);
      if (buka && !this.devtoolsOpen) { this.devtoolsOpen = true; this.logViolation('Developer Tools terdeteksi', 'danger'); }
      else if (!buka) this.devtoolsOpen = false;
    }, 1000);
  },
  destroy() {
    this.active = false;
    document.body.classList.remove('anti-cheat-active');
    this._bind(false);
    if (this.devtoolsInterval) { clearInterval(this.devtoolsInterval); this.devtoolsInterval = null; }
  },
  _bind(on) {
    const fs = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    const pairs = [[document, 'contextmenu', this.blockContext], [document, 'copy', this.blockClip], [document, 'paste', this.blockClip], [document, 'cut', this.blockClip],
      [document, 'selectstart', this.blockSel], [document, 'dragstart', this.blockSel], [document, 'keydown', this.onKeydown], [document, 'keyup', this.onKeyup],
      [window, 'blur', this.onBlur], [document, 'visibilitychange', this.onVisibility], [window, 'beforeunload', this.onBeforeUnload]]
      .concat(fs.map(n => [document, n, this.onFullscreen]));
    pairs.forEach(p => p[0][on ? 'addEventListener' : 'removeEventListener'](p[1], p[2]));
  },
  blockContext(e) { e.preventDefault(); AntiCheat.logViolation('Klik kanan terdeteksi', 'warning'); return false; },
  blockClip(e) { e.preventDefault(); AntiCheat.logViolation('Copy/Paste terdeteksi', 'warning'); return false; },
  blockSel(e) { e.preventDefault(); return false; },
  onKeydown(e) {
    const key = e.key.toUpperCase(), ctrl = e.ctrlKey || e.metaKey, shift = e.shiftKey;
    if ((ctrl && ['C', 'V', 'X', 'A', 'P', 'S', 'U'].includes(key)) || key === 'F12' || (ctrl && shift && ['I', 'J', 'C'].includes(key)) ||
        (e.altKey && key === 'TAB') || (e.metaKey && key === 'TAB') || key === 'PRINTSCREEN') {
      e.preventDefault(); e.stopPropagation();
      AntiCheat.logViolation('Shortcut terlarang: ' + (ctrl ? 'Ctrl+' : '') + (shift ? 'Shift+' : '') + key, 'danger');
      return false;
    }
  },
  onKeyup(e) {
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      AntiCheat.logViolation('PrintScreen terdeteksi', 'danger');
      try { navigator.clipboard.writeText(''); } catch (err) { /* abaikan */ }
    }
  },
  onFullscreen() {
    if (!AntiCheat.active || !Exam.current) return;
    const fs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!fs) {
      AntiCheat.fullscreenExitCount++;
      AntiCheat.logViolation('Keluar dari mode fullscreen (ke-' + AntiCheat.fullscreenExitCount + ')', 'danger');
      $('fullscreenOverlay').classList.remove('hidden');
      Exam.hentikanTimer();
    }
  },
  onBlur() {
    if (!AntiCheat.active || !Exam.current) return;
    AntiCheat.blurCount++;
    AntiCheat.logViolation('Keluar dari area ujian (ke-' + AntiCheat.blurCount + ')', 'warning');
    $('viewExam').classList.add('exam-blur');
  },
  onVisibility() {
    if (!AntiCheat.active || !Exam.current) return;
    if (document.hidden) { AntiCheat.blurCount++; AntiCheat.logViolation('Tab tidak aktif (ke-' + AntiCheat.blurCount + ')', 'warning'); }
    else $('viewExam').classList.remove('exam-blur');
  },
  onBeforeUnload(e) {
    if (AntiCheat.active && Exam.current) { e.preventDefault(); e.returnValue = 'Ujian sedang berlangsung! Yakin ingin keluar?'; return e.returnValue; }
  },
  logViolation(message, level) {
    if (!this.active || !Exam.current) return;
    const now = Date.now();
    if (now - this.lastViolationTime < this.cooldown) return;
    this.lastViolationTime = now;
    this.violations++;
    this.violationLog.push({ time: new Date().toISOString(), message: message, level: level, count: this.violations });
    const old = document.querySelector('.violation-badge'); if (old) old.remove();
    const badge = document.createElement('div');
    badge.className = 'violation-badge'; badge.textContent = '⚠️ Pelanggaran: ' + this.violations + '/' + this.maxViolations;
    document.body.appendChild(badge); setTimeout(() => badge.remove(), 4000);
    if (this.violations >= this.maxViolations) { this.autoSubmit(); return; }
    Swal.fire({
      icon: level === 'danger' ? 'error' : 'warning', title: '⚠️ Peringatan Keamanan!',
      html: `<p class="text-sm text-slate-600 mb-3">${esc(message)}</p>
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-3 my-3"><p class="text-xs text-rose-600 font-bold uppercase">Pelanggaran</p>
        <p class="text-3xl font-extrabold text-rose-600">${this.violations} / ${this.maxViolations}</p></div>
        <p class="text-xs text-slate-500">Sisa toleransi: <b class="text-rose-600">${this.maxViolations - this.violations}</b> pelanggaran lagi. Ujian otomatis dikumpulkan jika melebihi batas.</p>`,
      confirmButtonText: 'Saya Mengerti', confirmButtonColor: '#EF4444', allowOutsideClick: false, allowEscapeKey: false
    });
  },
  autoSubmit() {
    Exam.hentikanTimer();
    Swal.fire({
      icon: 'error', title: '🚫 Ujian Dihentikan!',
      html: `<p class="text-sm text-slate-600">Anda melanggar aturan ujian sebanyak <b>${this.violations} kali</b>. Ujian akan otomatis dikumpulkan.</p>`,
      confirmButtonText: 'Kumpulkan Sekarang', confirmButtonColor: '#EF4444', allowOutsideClick: false, allowEscapeKey: false
    }).then(() => Exam.selesai(true));
  },
  ringkasan() { return { total: this.violations, log: this.violationLog }; }
};

// ---------- Fullscreen ----------
function enterFullscreen() {
  const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (f) { const p = f.call(el); if (p && p.catch) p.catch(() => {}); }
}
function exitFullscreen() {
  const f = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if (f && (document.fullscreenElement || document.webkitFullscreenElement)) { const p = f.call(document); if (p && p.catch) p.catch(() => {}); }
}

// ---------- Mesin ujian ----------
function sedangFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function bintangHtml(n, ukuran) {
  return [0, 1, 2].map(i => `<span class="star ${i < n ? 'on' : ''}" style="--i:${i}">${ikon('bintang', ukuran || 18)}</span>`).join('');
}

const Exam = {
  running: false, current: null, questions: [], idx: 0, jawab: {}, ragu: {}, timer: null, sisa: 0,

  kunciSimpan() { return 'ujian_jawab_' + App.user.username + '_' + this.current.id_ujian; },

  // Dialog mulai: aturan singkat + tombol mulai (kode akses sudah diverifikasi di gerbang sebelum login)
  dialogMulai(u, m) {
    Modal.open('Siap mengerjakan?',
      `<div class="flex items-center gap-3 mb-3"><span class="mp-${esc(m.warna)} w-14 h-14 rounded-2xl grid place-items-center text-white flex-none" style="background:linear-gradient(140deg,var(--c1),var(--c2))">${ikon(m.ikon, 28)}</span>
        <div class="min-w-0"><p class="text-sm font-bold text-slate-500">${esc(m.nama)}</p><p class="font-display font-extrabold text-xl leading-tight">${esc(u.nama_ujian)}</p></div></div>
       <div class="flex flex-wrap gap-2 mb-3"><span class="badge b-blue">${u.durasi_menit} menit</span><span class="badge b-blue">${u.jumlah_soal} soal</span><span class="badge b-blue">KKM ${u.kkm}</span></div>
       <ul class="text-sm text-slate-600 space-y-1.5 list-disc ml-5">
         <li>Ujian berjalan dalam <b>layar penuh</b>; jangan pindah tab atau aplikasi.</li>
         <li>Dilarang copy-paste dan klik kanan. Batas pelanggaran: <b>${App.setting.max_pelanggaran}</b>.</li>
         <li>Waktu berjalan di server — menutup halaman tidak menghentikan waktu.</li></ul>
       <p id="mulaiErr" role="alert" class="hidden mt-3 text-sm font-bold text-rose-600"></p>`,
      { lebar: 'max-w-md', label: 'Mulai Ujian', kelasSimpan: 'btn-amber px-6 text-base', simpan: () => Exam.mulaiDariDialog(u, m) });
  },
  async mulaiDariDialog(u, m) {
    const r = await api('peserta.mulai', { id_ujian: u.id_ujian });
    if (!r.success) { const e = $('mulaiErr'); if (e) { e.textContent = r.message; e.classList.remove('hidden'); } return false; }
    this.mulaiSukses(u, m, r.data);
    return true;
  },
  mulaiSukses(u, m, d) {
    this.current = { id_ujian: u.id_ujian, nama_ujian: u.nama_ujian, mapel: m };
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(this.kunciSimpan()) || '{}'); } catch (e) { saved = {}; }
    this.jawab = saved; this.ragu = {};
    AntiCheat.init(App.setting.max_pelanggaran);
    this.questions = d.questions; this.idx = 0; this.running = true;
    this.questions.forEach(q => ['soal', 'a', 'b', 'c', 'd'].forEach(k => {          // muat semua gambar di muka agar pindah soal instan
      const url = q['gambar_' + k]; if (url) { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = url; }
    }));
    $('viewExam').className = 'exam-wrap mp-' + (m.warna || 'indigo');
    $('examNama').textContent = u.nama_ujian; $('examMapelIco').innerHTML = ikon(m.ikon, 24);
    App.show('viewExam'); window.scrollTo(0, 0);
    enterFullscreen();
    this.sisa = d.sisa_detik; this.tampilTimer();
    this.render(); this.renderGrid();
    setTimeout(() => {                                    // jika browser menolak layar penuh otomatis, minta klik sekali
      if (!this.current) return;
      if (this.sisa <= 0 || sedangFs()) this.startTimer(this.sisa); else $('fullscreenOverlay').classList.remove('hidden');
    }, 350);
  },

  startTimer(detik) {
    this.sisa = detik; this.hentikanTimer(); this.tampilTimer();
    if (this.sisa <= 0) { this.waktuHabis(); return; }
    this.timer = setInterval(() => {
      this.sisa--; this.tampilTimer();
      if (this.sisa <= 0) { this.hentikanTimer(); this.waktuHabis(); }
    }, 1000);
  },
  hentikanTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  tampilTimer() {
    const t = Math.max(0, this.sisa), p = n => String(n).padStart(2, '0'), box = $('timerBox');
    $('timerDisplay').textContent = p(Math.floor(t / 3600)) + ':' + p(Math.floor((t % 3600) / 60)) + ':' + p(t % 60);
    box.classList.toggle('timer-warn', t <= 300 && t > 60); box.classList.toggle('timer-danger', t <= 60);
  },
  waktuHabis() {
    Swal.fire({ icon: 'info', title: 'Waktu Habis!', text: 'Jawabanmu dikumpulkan otomatis.', confirmButtonColor: '#4F46E5', allowOutsideClick: false })
      .then(() => this.selesai(true));
  },
  resumeFullscreen() {
    const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (!f) return UI.err('Browser Anda tidak mendukung mode layar penuh.');
    const lanjut = () => { $('fullscreenOverlay').classList.add('hidden'); if (this.current && !this.timer && this.sisa > 0) this.startTimer(this.sisa); };
    const p = f.call(el);
    if (p && p.then) p.then(lanjut).catch(() => UI.err('Browser memblokir layar penuh. Coba lagi.')); else lanjut();
  },

  render() {
    const q = this.questions[this.idx]; if (!q) return;
    const n = this.questions.length, terjawab = this.questions.filter(x => this.jawab[x.id_soal]).length;
    $('qBadge').textContent = 'Soal ' + (this.idx + 1) + ' dari ' + n;
    $('qNomor').textContent = this.idx + 1;
    $('qBody').innerHTML = `${imgTag(q.gambar_soal, 'q-img mb-4')}${q.pertanyaan ? `<div class="q-main q-text">${esc(q.pertanyaan)}</div>` : ''}`;
    const pilih = this.jawab[q.id_soal] || '';
    $('optionsContainer').innerHTML = ['a', 'b', 'c', 'd'].map(k => `
      <label class="opt ${pilih === k ? 'sel' : ''}">
        <input type="radio" name="examOption" value="${k}" ${pilih === k ? 'checked' : ''} onchange="Exam.pilih('${k}')" aria-label="Pilihan ${k.toUpperCase()}">
        <span class="opt-letter">${k.toUpperCase()}</span><span class="opt-body q-text">${optHtml(q, k)}</span></label>`).join('');
    const rg = !!this.ragu[q.id_soal];
    $('raguText').textContent = rg ? 'Batalkan Ragu' : 'Tandai Ragu-ragu';
    $('btnRagu').className = rg ? 'btn-amber' : 'btn-gray';
    $('btnPrev').style.visibility = this.idx === 0 ? 'hidden' : 'visible';
    $('btnNext').innerHTML = this.idx === n - 1 ? 'Selesai &check;' : 'Selanjutnya &rarr;';
    $('examProg').style.width = Math.round(terjawab / n * 100) + '%';
    $('examProgWrap').setAttribute('aria-valuenow', Math.round(terjawab / n * 100));
    $('examProgText').textContent = terjawab + ' dari ' + n + ' soal terjawab' + (terjawab === n ? ' — hebat, semua terjawab!' : '');
  },
  pilih(k) {
    const q = this.questions[this.idx];
    this.jawab[q.id_soal] = k;
    try { localStorage.setItem(this.kunciSimpan(), JSON.stringify(this.jawab)); } catch (e) { /* penyimpanan penuh: abaikan */ }
    this.render(); this.renderGrid();
    const el = document.querySelector('input[name=examOption]:checked'); if (el) el.focus({ preventScroll: true });
  },
  toggleRagu() { const q = this.questions[this.idx]; this.ragu[q.id_soal] = !this.ragu[q.id_soal]; this.render(); this.renderGrid(); },
  prev() { if (this.idx > 0) { this.idx--; this.render(); this.renderGrid(); window.scrollTo({ top: 0 }); } },
  next() { if (this.idx < this.questions.length - 1) { this.idx++; this.render(); this.renderGrid(); window.scrollTo({ top: 0 }); } else this.konfirmasiSelesai(); },
  renderGrid() {
    $('qGrid').innerHTML = this.questions.map((q, i) => {
      const c = (this.ragu[q.id_soal] ? 'ragu' : this.jawab[q.id_soal] ? 'done' : '') + (i === this.idx ? ' cur' : '');
      return `<button class="qn ${c}" onclick="Exam.loncat(${i})" aria-label="Soal ${i + 1}${this.jawab[q.id_soal] ? ', terjawab' : ''}${this.ragu[q.id_soal] ? ', ragu-ragu' : ''}" ${i === this.idx ? 'aria-current="true"' : ''}>${i + 1}</button>`;
    }).join('');
  },
  loncat(i) { this.idx = i; this.render(); this.renderGrid(); window.scrollTo({ top: 0 }); },

  async konfirmasiSelesai() {
    const belum = this.questions.filter(q => !this.jawab[q.id_soal]).length;
    const ok = await UI.yakin('Kumpulkan jawaban?',
      belum > 0 ? `Masih ada <b>${belum}</b> soal yang belum dijawab. Yakin ingin mengumpulkan?` : 'Semua soal sudah dijawab. Yakin ingin mengumpulkan?', 'Ya, Kumpulkan');
    if (ok) this.selesai(false);
  },

  async selesai() {
    this.hentikanTimer();
    const pel = AntiCheat.ringkasan(), id = this.current.id_ujian, nama = this.current.nama_ujian;
    AntiCheat.destroy(); exitFullscreen();
    $('fullscreenOverlay').classList.add('hidden'); $('viewExam').classList.remove('exam-blur');
    let r;
    for (;;) {                                           // ulangi bila gangguan jaringan (jawaban tetap aman di perangkat)
      UI.loading('Menghitung nilai...');
      r = await api('peserta.submit', { id_ujian: id, jawaban: this.jawab, pelanggaran: pel });
      UI.close();
      if (r.success || !r.network) break;
      const lagi = await Swal.fire({ icon: 'warning', title: 'Koneksi terputus', text: 'Jawabanmu aman di perangkat ini. Coba kirim lagi?',
        confirmButtonText: 'Kirim Lagi', confirmButtonColor: '#4F46E5', allowOutsideClick: false, allowEscapeKey: false });
      if (!lagi.isConfirmed) break;
    }
    if (!r.success) {
      await UI.err(r.message, 'Gagal Submit');
      this.bersihkan(); App.show('viewApp'); App.go('ujian'); return;
    }
    try { localStorage.removeItem(this.kunciSimpan()); } catch (e) { /* abaikan */ }
    const d = r.data, sekarang = new Date().toISOString();
    if (Data.ada('peserta.beranda')) {                       // perbarui tampilan secara instan tanpa menunggu server
      const u = Data.ambil('peserta.beranda').ujian.filter(x => x.id_ujian === id)[0];
      if (u) u.hasil = { id_hasil: '', nilai: d.nilai, waktu_selesai: sekarang, lulus: d.lulus };
    }
    if (Data.ada('peserta.riwayat')) Data.ambil('peserta.riwayat').riwayat.unshift({ id_hasil: '', id_ujian: id, nama_ujian: nama, nilai: d.nilai, kkm: d.kkm, lulus: d.lulus, waktu_selesai: sekarang });
    Data.basi('peserta.beranda', 'peserta.riwayat'); Data.simpan();
    delete Peserta.detail[id];
    if (App.setting.tampil_pembahasan) Peserta.siapkanDetail(id);
    this.bersihkan(); App.show('viewApp'); App.go('ujian');   // beranda langsung tampil di belakang dialog hasil
    await Peserta.perayaan(d, pel.total);
    if (App.setting.tampil_pembahasan) Peserta.lihatHasil(id, nama);
  },

  bersihkan() {
    this.hentikanTimer();
    if (AntiCheat.active) AntiCheat.destroy();
    exitFullscreen();
    $('fullscreenOverlay').classList.add('hidden'); $('viewExam').classList.remove('exam-blur');
    this.running = false; this.current = null; this.questions = []; this.jawab = {}; this.ragu = {};
  }
};

// ---------- Halaman menu peserta ----------
const Peserta = {
  pages: {
    // BERANDA: ujian yang dipilih di gerbang (satu ujian) — langsung mulai
    ujian(id) {
      return Data.swr(['peserta.beranda', 'peserta.riwayat'], (o, dariCache, err) => {
        if (!o) { $('page').innerHTML = pageHead('Ujianku', '') + `<div class="bg-white rounded-2xl card-shadow p-6 text-rose-600">${esc(err.message)}</div>`; return; }
        const d = o['peserta.beranda']; App.setting = d.setting;
        const u = d.ujian[0], m = d.mapel[0] || { id_mapel: '', nama_mapel: 'Lainnya', ikon: 'buku', warna: 'indigo', deskripsi: '' };
        const riw = o['peserta.riwayat'].riwayat, rata = riw.length ? Math.round(riw.reduce((a, x) => a + x.nilai, 0) / riw.length) : 0;
        const bintang = riw.reduce((a, x) => a + bintangNilai(x.nilai, x.kkm), 0);
        const jam = new Date().getHours(), salam = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
        const hero = `<section class="hero"><h1>${salam}, ${esc(App.user.nama_lengkap.split(' ')[0])}!</h1><p class="mb-4">Kamu memilih <b>${esc(m.nama_mapel)}</b>. Semangat ya!</p>
          <div class="flex flex-wrap gap-3">
            <div class="stat-chip">${ikon('check', 26)}<div><b>${riw.length}</b><small>Ujian selesai</small></div></div>
            <div class="stat-chip">${ikon('analisis', 26)}<div><b>${rata}</b><small>Rata-rata nilai</small></div></div>
            <div class="stat-chip">${ikon('bintang', 26)}<div><b>${bintang}</b><small>Bintang</small></div></div></div></section>`;
        const lain = `<button class="btn-gray" onclick="App.keluar()">${ikon('mapel', 18)} Pilih mata pelajaran lain</button>`;
        let isi;
        if (!u) isi = `<p class="text-slate-600 mb-4">Ujian yang kamu pilih sudah tidak tersedia.</p>${lain}`;
        else if (u.hasil) isi = `<div class="text-center mb-4"><p class="text-sm font-bold text-slate-500">Nilaimu</p><p class="font-display font-extrabold text-6xl ${nilaiCls(u.hasil.nilai, u.kkm)}">${u.hasil.nilai}</p>
            <div class="flex justify-center gap-1 mt-1" style="font-size:0">${bintangHtml(bintangNilai(u.hasil.nilai, u.kkm), 30)}</div>
            <p class="font-bold mt-1">${u.hasil.lulus ? 'Lulus' : 'Belum lulus'}</p></div>
            <div class="flex flex-wrap gap-3 justify-center">${App.setting.tampil_pembahasan ? `<button class="btn-blue" data-n="${esc(u.nama_ujian)}" onclick="Peserta.lihatHasil('${esc(u.id_ujian)}', this.dataset.n)">Lihat Pembahasan</button>` : ''}${lain}</div>`;
        else if (u.jumlah_soal === 0) isi = `<p class="text-slate-600 mb-4">Soal untuk ujian ini belum tersedia. Tanyakan pada gurumu.</p>${lain}`;
        else if (u.state === 'belum') isi = `<p class="text-slate-600 mb-4">Ujian dibuka pada <b>${fmtDate(u.waktu_mulai)}</b>.</p>${lain}`;
        else if (u.state === 'tutup') isi = `<p class="text-slate-600 mb-4">Waktu ujian ini sudah berakhir.</p>${lain}`;
        else isi = `<p class="text-slate-600 mb-4">Tekan tombol di bawah saat kamu sudah siap.</p>
            <div class="flex flex-wrap gap-3"><button class="btn-amber text-lg px-8" style="min-height:56px" onclick="Peserta.bukaUjian()">Mulai Ujian ${ikon('panah', 20)}</button>${lain}</div>`;
        $('page').innerHTML = `<div class="fade-in space-y-5">${hero}
          <section class="rise"><div class="mapel-tile mp-${esc(m.warna)}" style="min-height:0;cursor:default;border-radius:1.5rem 1.5rem 0 0">
              <span class="mapel-ico">${ikon(m.ikon, 30)}</span><span class="text-sm font-bold opacity-90">${esc(m.nama_mapel)}</span>
              <span class="mapel-nama" style="font-size:1.7rem">${esc(u ? u.nama_ujian : 'Ujian')}</span>
              ${u ? `<span class="mapel-foot"><span class="chip">${u.durasi_menit} menit</span><span class="chip">${u.jumlah_soal} soal</span><span class="chip">KKM ${u.kkm}</span></span>` : ''}</div>
            <div class="bg-white card-shadow p-5" style="border-radius:0 0 1.5rem 1.5rem">${isi}</div></section></div>`;
      }, id);
    },

    riwayat(id) {
      return Data.swr(['peserta.riwayat', 'peserta.beranda'], (o, dariCache, err) => {
        if (!o) { $('page').innerHTML = pageHead('Riwayat Nilai', '') + `<div class="bg-white rounded-2xl card-shadow p-6 text-rose-600">${esc(err.message)}</div>`; return; }
        App.setting = o['peserta.beranda'].setting;
        const l = o['peserta.riwayat'].riwayat, rata = l.length ? Math.round(l.reduce((a, x) => a + x.nilai, 0) / l.length * 10) / 10 : 0;
        const rows = l.map((x, i) => `<tr><td>${i + 1}</td><td class="font-bold">${esc(x.nama_ujian)}</td>
          <td class="font-extrabold text-lg ${nilaiCls(x.nilai, x.kkm)}">${x.nilai}</td><td><span class="inline-flex">${bintangHtml(bintangNilai(x.nilai, x.kkm), 16)}</span></td>
          <td>${x.lulus ? '<span class="badge b-green">Lulus</span>' : '<span class="badge b-red">Belum Lulus</span>'}</td><td class="text-xs text-slate-500">${fmtDate(x.waktu_selesai)}</td>
          <td>${App.setting.tampil_pembahasan ? `<button class="btn-gray btn-xs" data-n="${esc(x.nama_ujian)}" onclick="Peserta.lihatHasil('${esc(x.id_ujian)}', this.dataset.n)">Pembahasan</button>` : ''}</td></tr>`);
        $('page').innerHTML = `<div class="fade-in">` + pageHead('Riwayat Nilai', 'Semua ujian yang sudah kamu kerjakan.') +
          `<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">${statCard('Ujian Dikerjakan', l.length, 'blue')}${statCard('Rata-rata Nilai', rata, 'green')}${statCard('Lulus', l.filter(x => x.lulus).length + ' / ' + l.length, 'amber')}</div>
          <div class="bg-white rounded-3xl card-shadow p-5">${tabel(['No', 'Ujian', 'Nilai', 'Bintang', 'Status', 'Waktu', ''], rows, 'Kamu belum mengerjakan ujian apa pun.')}</div></div>`;
      }, id);
    },

    profil(id) { if (App.nav === id) $('page').innerHTML = pageHead('Profil', 'Kelola akunmu.') + App.profilHtml(); }
  },

  bukaUjian() {                                  // ujian = yang dipilih di gerbang
    const d = Data.ambil('peserta.beranda'), u = d && d.ujian[0]; if (!u) return;
    const m = d.mapel[0] || { id_mapel: '', nama_mapel: 'Lainnya', ikon: 'buku', warna: 'indigo' };
    if (u.hasil || u.jumlah_soal === 0 || u.state !== 'buka') return;
    Exam.dialogMulai(u, { id: m.id_mapel, nama: m.nama_mapel, ikon: m.ikon, warna: m.warna });
  },
  info(judul, teks) { Swal.fire({ icon: 'info', title: judul, text: teks, confirmButtonColor: '#4F46E5', confirmButtonText: 'Mengerti' }); },

  // Layar hasil: cincin skor animasi, bintang, konfeti
  perayaan(d, pelanggaran) {
    const C = 2 * Math.PI * 54, n = bintangNilai(d.nilai, d.kkm), warna = d.lulus ? '#059669' : '#D97706';
    const pesan = n === 3 ? 'Luar biasa! Kamu hebat sekali!' : n === 2 ? 'Bagus sekali! Kamu lulus!' : n === 1 ? 'Terus semangat, sedikit lagi!' : 'Jangan menyerah, ayo belajar lagi!';
    return Swal.fire({
      title: 'Ujian Selesai!', confirmButtonColor: '#4F46E5', confirmButtonText: App.setting.tampil_pembahasan ? 'Lihat Pembahasan' : 'Tutup', allowOutsideClick: false,
      html: `<div class="py-1"><div style="position:relative;width:150px;height:150px;margin:0 auto">
          <svg class="ring" width="150" height="150" viewBox="0 0 140 140" aria-hidden="true"><circle class="ring-bg" cx="70" cy="70" r="54" fill="none" stroke-width="12"/>
            <circle id="ringFg" class="ring-fg" cx="70" cy="70" r="54" fill="none" stroke="${warna}" stroke-width="12" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
          <div style="position:absolute;inset:0;display:grid;place-items:center"><div><div id="skorAngka" class="font-display" style="font-size:2.8rem;font-weight:800;line-height:1">0</div><div style="font-size:.75rem;font-weight:700;opacity:.7">dari 100</div></div></div></div>
        <div class="flex justify-center gap-1 my-3" style="font-size:0">${bintangHtml(n, 34)}</div>
        <p class="font-display font-extrabold text-xl">${pesan}</p>
        <p class="text-sm mt-1 opacity-80">Benar ${d.benar} dari ${d.total} soal &middot; KKM ${d.kkm} &middot; <b>${d.lulus ? 'Lulus' : 'Belum lulus'}</b></p>
        ${pelanggaran > 0 ? `<p class="text-xs mt-3 font-bold" style="color:#B45309">Terdeteksi ${pelanggaran} pelanggaran selama ujian.</p>` : ''}</div>`,
      didOpen: () => {
        setTimeout(() => { const f = $('ringFg'); if (f) f.style.strokeDashoffset = C * (1 - d.nilai / 100); }, 80);
        const t0 = performance.now(), dur = 1100;
        (function f(t) { const el = $('skorAngka'); if (!el) return; const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(d.nilai * p); if (p < 1) requestAnimationFrame(f); })(t0);
        if (d.lulus) confetti();
      }
    });
  },

  detail: {},                                    // cache pembahasan (hasil yang sudah dikumpulkan tidak berubah)
  siapkanDetail(id_ujian) {                      // diambil di latar belakang agar "Lihat Pembahasan" langsung terbuka
    api('peserta.hasilDetail', { id_ujian: id_ujian }).then(r => { if (r.success) Peserta.detail[id_ujian] = r; });
  },

  async lihatHasil(id_ujian, nama) {
    let r = Peserta.detail[id_ujian];
    if (!r) {
      UI.loading('Memuat hasil & pembahasan...');
      r = await api('peserta.hasilDetail', { id_ujian: id_ujian });
      UI.close();
      if (r.success) Peserta.detail[id_ujian] = r;
    }
    if (!r.success) return UI.err(r.message);
    const h = r.data.hasil, qs = r.data.questions, tampil = r.data.tampil_pembahasan;
    const benar = qs.filter(q => q.benar).length;
    const blok = qs.map((q, i) => `
      <div class="text-left border rounded-xl p-4 mb-3 ${q.benar ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}">
        <div class="flex justify-between items-start mb-2"><span class="badge b-blue">Soal ${i + 1}</span>
          ${q.benar ? '<span class="text-emerald-600 font-bold">✓ Benar</span>' : '<span class="text-rose-600 font-bold">✗ Salah</span>'}</div>
        ${imgTag(q.gambar_soal, 'q-img mb-3')}
        ${q.pertanyaan ? `<p class="font-medium text-slate-800 mb-3 q-text">${esc(q.pertanyaan)}</p>` : ''}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm">${['a', 'b', 'c', 'd'].map(k =>
          `<div class="p-2 rounded ${tampil && q.kunci_jawaban === k ? 'bg-emerald-100 font-bold' : (q.jawaban_peserta === k ? 'bg-slate-100' : '')}"><span class="uppercase">${k}.</span> ${optHtml(q, k)}</div>`).join('')}</div>
        <div class="text-sm space-y-1 border-t pt-3"><p>Jawaban Anda: <b class="uppercase ${q.benar ? 'text-emerald-600' : 'text-rose-600'}">${q.jawaban_peserta ? esc(q.jawaban_peserta) : '<span class="text-slate-400 italic normal-case">Tidak dijawab</span>'}</b></p>
          ${tampil ? `<p>Kunci Jawaban: <b class="uppercase text-emerald-600">${esc(q.kunci_jawaban || '-')}</b></p>` : ''}</div>
        ${tampil ? `<div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100"><p class="text-xs font-bold text-blue-700 uppercase mb-1">💡 Pembahasan:</p><p class="text-sm text-slate-700 q-text">${esc(q.pembahasan)}</p></div>` : ''}
      </div>`).join('');
    Swal.fire({
      title: 'Hasil Ujian: ' + esc(nama),
      html: `<div class="text-center mb-4"><p class="text-sm text-slate-500 mb-1">Nilai Akhir Anda</p><p class="text-5xl font-extrabold ${nilaiCls(h.nilai, h.kkm)}">${h.nilai}</p>
        <p class="text-sm text-slate-600 mt-2">Benar: <b class="text-emerald-600">${benar}</b> / ${qs.length} soal &middot; KKM ${h.kkm} &middot; <b>${h.lulus ? 'Lulus' : 'Belum lulus'}</b></p>
        <p class="text-xs text-slate-400 mt-1">Dikumpulkan: ${fmtDate(h.waktu_selesai)}</p></div><hr class="my-3">
        <p class="text-left font-bold text-slate-700 mb-2">📋 Pembahasan Soal:</p><div class="max-h-96 overflow-y-auto pr-2">${blok}</div>`,
      width: '800px', confirmButtonText: 'Tutup', confirmButtonColor: '#2563EB'
    });
  }
};
