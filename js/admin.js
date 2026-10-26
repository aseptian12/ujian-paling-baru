// ============================================================
// ADMIN — Dashboard, Bank Soal (bergambar), Jadwal, Rekap Nilai,
//         Analisis Soal, Log Pelanggaran, Pengguna, Pengaturan
// UX instan: tampil dari cache (SWR), perubahan langsung terlihat (optimistic UI),
//            gambar diunggah di latar belakang sejak dipilih.
// ============================================================
const Admin = {
  data: { soal: [], jadwal: [], mapel: [], hasilAll: [], hasil: [], users: [], log: [], analisis: {} },
  gbr: { url: {}, pending: {}, semua: [], diproses: false },

  galat(err) { $('page').innerHTML = pageHead('Terjadi masalah', '') + `<div class="bg-white rounded-2xl card-shadow p-6 text-rose-600">${esc((err && err.message) || 'Gagal memuat data.')}</div>`; },
  mapelNama(idMapel) {
    const l = Data.ada('mapel.list') ? Data.ambil('mapel.list').mapel : Admin.data.mapel;
    const m = (l || []).filter(x => x.id_mapel === idMapel)[0];
    return m ? m.nama_mapel : '';
  },
  opsiUjian(sel, semua) {
    return (semua ? `<option value="">${semua}</option>` : '') +
      Admin.data.jadwal.map(j => { const mp = Admin.mapelNama(j.id_mapel); return `<option value="${esc(j.id_ujian)}" ${j.id_ujian === sel ? 'selected' : ''}>${esc(j.id_ujian)} — ${esc(j.nama_ujian)}${mp ? ' (' + esc(mp) + ')' : ''}</option>`; }).join('');
  },
  // Bangun ulang halaman tanpa menghilangkan isi filter/pencarian & fokus ketik pengguna
  pertahankan(ids, fn) {
    const aktif = document.activeElement && document.activeElement.id, nilai = {};
    ids.forEach(i => { const e = $(i); if (e) nilai[i] = e.value; });
    const pos = aktif && $(aktif) && typeof $(aktif).selectionStart === 'number' ? [$(aktif).selectionStart, $(aktif).selectionEnd] : null;
    fn();
    ids.forEach(i => { if ($(i) && i in nilai) $(i).value = nilai[i]; });
    if (aktif && $(aktif)) { $(aktif).focus(); if (pos) { try { $(aktif).setSelectionRange(pos[0], pos[1]); } catch (e) { /* abaikan */ } } }
  },
  cadang(arr) { const c = JSON.stringify(arr); return () => { arr.splice(0, arr.length, ...JSON.parse(c)); }; },   // untuk membatalkan perubahan optimistik
  sinkronJumlah() {
    const cs = {}, ch = {};
    Admin.data.soal.forEach(s => { cs[s.id_ujian] = (cs[s.id_ujian] || 0) + 1; });
    if (Data.ada('hasil.list')) Data.ambil('hasil.list').hasil.forEach(h => { ch[h.id_ujian] = (ch[h.id_ujian] || 0) + 1; });
    Admin.data.jadwal.forEach(j => { j.jumlah_soal = cs[j.id_ujian] || 0; if (Data.ada('hasil.list')) j.jumlah_hasil = ch[j.id_ujian] || 0; });
    Data.basi('mapel.list'); Data.simpan();
  },
  async unduhXlsx(nama, sheet, aoa, lebar) {
    await Lib.butuh('xlsx');
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = lebar.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, nama);
  },
  async bacaExcel(file) {                       // -> { head, rows } (kunci = header huruf kecil)
    await Lib.butuh('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    if (aoa.length < 2) throw new Error('File kosong atau tidak ada baris data.');
    const head = aoa[0].map(h => String(h).toLowerCase().trim());
    const rows = aoa.slice(1).map(r => { const o = {}; head.forEach((h, i) => { o[h] = r[i] === undefined ? '' : String(r[i]).trim(); }); return o; });
    while (rows.length && Object.keys(rows[rows.length - 1]).every(k => rows[rows.length - 1][k] === '')) rows.pop();
    return { head: head, rows: rows };
  },

  pages: {
    // ================= DASHBOARD =================
    dashboard(id) {
      return Data.swr('admin.dashboard', (o, c, err) => {
        if (!o) return Admin.galat(err);
        const d = o['admin.dashboard'], maks = Math.max(1, ...d.sebaran), lbl = ['0–59', '60–69', '70–79', '80–89', '90–100'];
        const per = d.per_ujian.map(u => `<tr><td class="font-semibold text-blue-600">${esc(u.id_ujian)}</td><td>${esc(u.nama_ujian)}</td><td>${u.jumlah_soal}</td><td>${u.selesai}</td><td class="font-bold">${u.rata}</td>
          <td>${u.status === 'Aktif' ? '<span class="badge b-green">Aktif</span>' : '<span class="badge b-red">Tidak Aktif</span>'}</td></tr>`);
        const baru = d.terbaru.map(h => `<tr><td class="font-medium">${esc(h.nama)}</td><td>${esc(h.id_ujian)}</td><td class="font-bold">${h.nilai}</td><td class="text-xs text-slate-500">${fmtDate(h.waktu_selesai)}</td></tr>`);
        $('page').innerHTML = `<div class="fade-in">` + pageHead('Dashboard', 'Ringkasan seluruh aktivitas ujian.') +
          `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">${statCard('Total Soal', d.jumlah_soal, 'blue')}${statCard('Ujian Aktif', d.ujian_aktif + ' / ' + d.jumlah_ujian, 'green')}
            ${statCard('Peserta Aktif', d.jumlah_peserta, 'amber')}${statCard('Ujian Terkumpul', d.jumlah_hasil, 'slate')}
            ${statCard('Rata-rata Nilai', d.rata, 'blue')}${statCard('Nilai Tertinggi', d.tertinggi, 'green')}${statCard('Persentase Lulus', d.persen_lulus + '%', 'amber')}${statCard('Total Pelanggaran', d.jumlah_pelanggaran, 'rose')}</div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div class="bg-white rounded-2xl card-shadow p-5"><h3 class="font-bold text-slate-800 mb-6">Sebaran Nilai</h3>
              <div class="bar-wrap">${d.sebaran.map((n, i) => `<div class="flex-1 flex flex-col items-center"><div class="bar w-full" style="height:${Math.round(n / maks * 130)}px"><span>${n}</span></div><div class="text-xs text-slate-500 mt-2">${lbl[i]}</div></div>`).join('')}</div></div>
            <div class="bg-white rounded-2xl card-shadow p-5"><h3 class="font-bold text-slate-800 mb-3">Pengumpulan Terbaru</h3>${tabel(['Peserta', 'Ujian', 'Nilai', 'Waktu'], baru, 'Belum ada yang mengumpulkan.')}</div></div>
          <div class="bg-white rounded-2xl card-shadow p-5"><h3 class="font-bold text-slate-800 mb-3">Ringkasan per Ujian</h3>${tabel(['ID', 'Nama Ujian', 'Soal', 'Terkumpul', 'Rata-rata', 'Status'], per, 'Belum ada ujian.')}</div></div>`;
      }, id);
    },

    // ================= BANK SOAL =================
    soal(id) {
      return Data.swr(['soal.list', 'jadwal.list'], (o, c, err) => {
        if (!o) return Admin.galat(err);
        Admin.data.soal = o['soal.list'].soal; Admin.data.jadwal = o['jadwal.list'].jadwal;
        Admin.pertahankan(['fSoalUjian', 'fSoalCari'], () => {
          $('page').innerHTML = pageHead('Bank Soal', 'Kelola soal pilihan ganda. Soal dan setiap opsi dapat diberi gambar.',
            `<button class="btn-gray" onclick="Admin.templateSoal()">⬇️ Template</button>
             <button class="btn-green" onclick="Admin.importSoal()">⬆️ Import Soal</button>
             <button class="btn-blue" onclick="Admin.formSoal()">+ Tambah Soal</button>`) +
            `<div class="bg-white rounded-2xl card-shadow p-5 space-y-4">
              <div class="flex flex-wrap gap-3"><select id="fSoalUjian" class="inp max-w-xs" onchange="Admin.renderSoal()">${Admin.opsiUjian('', 'Semua ujian')}</select>
                <input id="fSoalCari" class="inp max-w-xs" placeholder="Cari pertanyaan..." oninput="Admin.renderSoal()"></div>
              <div id="soalTabel"></div></div>`;
          Admin.renderSoal();
        });
      }, id);
    },

    // ================= JADWAL =================
    jadwal(id) {
      return Data.swr(['jadwal.list', 'mapel.list'], (o, c, err) => {
        if (!o) return Admin.galat(err);
        Admin.data.jadwal = o['jadwal.list'].jadwal; Admin.data.mapel = o['mapel.list'].mapel;
        Admin.renderJadwal();
      }, id);
    },

    // ================= MATA PELAJARAN =================
    mapel(id) {
      return Data.swr('mapel.list', (o, c, err) => {
        if (!o) return Admin.galat(err);
        Admin.data.mapel = o['mapel.list'].mapel;
        Admin.renderMapel();
      }, id);
    },

    // ================= REKAP NILAI =================
    hasil(id) {
      return Data.swr(['jadwal.list', 'hasil.list'], (o, c, err) => {
        if (!o) return Admin.galat(err);
        Admin.data.jadwal = o['jadwal.list'].jadwal; Admin.data.hasilAll = o['hasil.list'].hasil;
        Admin.pertahankan(['fHasilUjian'], () => {
          $('page').innerHTML = pageHead('Rekap Nilai', 'Nilai peserta per ujian.',
            `<button class="btn-green" onclick="Admin.exportHasil()">⬇️ Ekspor Excel</button><button class="btn-gray" onclick="Admin.cetakHasil()">🖨️ Cetak</button>`) +
            `<div class="bg-white rounded-2xl card-shadow p-5 space-y-4"><select id="fHasilUjian" class="inp max-w-xs" onchange="Admin.renderHasil()">${Admin.opsiUjian('', 'Semua ujian')}</select><div id="hasilIsi"></div></div>`;
          Admin.renderHasil();
        });
      }, id);
    },

    // ================= ANALISIS =================
    analisis(id) {
      return Data.swr(['jadwal.list', 'analisis.semua'], (o, c, err) => {
        if (!o) return Admin.galat(err);
        Admin.data.jadwal = o['jadwal.list'].jadwal; Admin.data.analisis = o['analisis.semua'].analisis;
        if (!Admin.data.jadwal.length) { $('page').innerHTML = pageHead('Analisis Soal', '') + '<div class="bg-white rounded-2xl card-shadow p-6 text-slate-500 italic">Belum ada ujian.</div>'; return; }
        Admin.pertahankan(['fAnalisis'], () => {
          $('page').innerHTML = pageHead('Analisis Soal', 'Tingkat kesukaran dan sebaran jawaban tiap soal — membantu menilai kualitas soal.') +
            `<div class="bg-white rounded-2xl card-shadow p-5 space-y-4"><select id="fAnalisis" class="inp max-w-xs" onchange="Admin.renderAnalisis()">${Admin.opsiUjian('')}</select><div id="analisisIsi"></div></div>`;
          Admin.renderAnalisis();
        });
      }, id);
    },

    // ================= LOG PELANGGARAN =================
    pelanggaran(id) {
      return Data.swr(['jadwal.list', 'log.list'], (o, c, err) => {
        if (!o) return Admin.galat(err);
        Admin.data.jadwal = o['jadwal.list'].jadwal; Admin.data.log = o['log.list'].log;
        Admin.pertahankan(['fLog'], () => {
          $('page').innerHTML = pageHead('Log Pelanggaran', 'Catatan pelanggaran anti-cheat selama ujian (fullscreen, pindah tab, copy-paste, dll).') +
            `<div class="bg-white rounded-2xl card-shadow p-5 space-y-4"><select id="fLog" class="inp max-w-xs" onchange="Admin.renderLog()">${Admin.opsiUjian('', 'Semua ujian')}</select><div id="logIsi"></div></div>`;
          Admin.renderLog();
        });
      }, id);
    },

    // ================= PENGGUNA =================
    users(id) {
      return Data.swr('users.list', (o, c, err) => {
        if (!o) return Admin.galat(err);
        Admin.data.users = o['users.list'].users;
        Admin.pertahankan(['fUserRole', 'fUserCari'], () => {
          $('page').innerHTML = pageHead('Pengguna', 'Kelola akun admin dan peserta.',
            `<button class="btn-gray" onclick="Admin.templateUser()">⬇️ Template</button><button class="btn-green" onclick="Admin.importUser()">⬆️ Import Peserta</button>
             <button class="btn-blue" onclick="Admin.formUser()">+ Tambah Pengguna</button>`) +
            `<div class="bg-white rounded-2xl card-shadow p-5 space-y-4"><div class="flex flex-wrap gap-3">
              <select id="fUserRole" class="inp max-w-[10rem]" onchange="Admin.renderUsers()"><option value="">Semua peran</option><option value="peserta">Peserta</option><option value="admin">Admin</option></select>
              <input id="fUserCari" class="inp max-w-xs" placeholder="Cari nama / username..." oninput="Admin.renderUsers()"></div><div id="userTabel"></div></div>`;
          Admin.renderUsers();
        });
      }, id);
    },

    // ================= PENGATURAN =================
    pengaturan(id) {
      return Data.swr('setting.get', (o, c, err) => {
        if (!o) return Admin.galat(err);
        const s = o['setting.get'].setting;
        if (!c && $('sNama')) return;                         // jangan timpa isian yang sedang diketik
        $('page').innerHTML = `<div class="fade-in">` + pageHead('Pengaturan', 'Pengaturan umum aplikasi dan akun Anda.') +
          `<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <form onsubmit="Admin.simpanSetting(event)" class="bg-white rounded-2xl card-shadow p-6 space-y-4">
              <h3 class="font-bold text-slate-800 text-lg">Pengaturan Umum</h3>
              <div><label class="lbl">Nama sekolah / lembaga</label><input id="sNama" class="inp" required maxlength="100" value="${esc(s.nama_sekolah)}"></div>
              <div><label class="lbl">Batas pelanggaran anti-cheat (1–20) — ujian otomatis dikumpulkan jika terlampaui</label><input id="sMaks" type="number" min="1" max="20" class="inp" required value="${esc(s.max_pelanggaran)}"></div>
              <div><label class="lbl">Tampilkan kunci &amp; pembahasan ke peserta setelah selesai</label>
                <select id="sTampil" class="inp"><option value="Ya" ${s.tampil_pembahasan !== 'Tidak' ? 'selected' : ''}>Ya</option><option value="Tidak" ${s.tampil_pembahasan === 'Tidak' ? 'selected' : ''}>Tidak</option></select></div>
              <button class="btn-blue" type="submit">Simpan Pengaturan</button></form>
            ${App.profilHtml()}</div></div>`;
      }, id);
    }
  },

  // ============================================================
  // BANK SOAL
  // ============================================================
  renderSoal() {
    if (!$('soalTabel')) return;
    const f = $('fSoalUjian').value, cari = $('fSoalCari').value.toLowerCase().trim();
    const nama = {}; Admin.data.jadwal.forEach(j => { nama[j.id_ujian] = j.nama_ujian; });
    const list = Admin.data.soal.filter(s => (!f || s.id_ujian === f) && (!cari || (s.pertanyaan + ' ' + s.id_soal).toLowerCase().includes(cari)));
    const rows = list.slice(0, 300).map((s, i) => {
      const gb = ['gambar_soal', 'gambar_a', 'gambar_b', 'gambar_c', 'gambar_d'].filter(k => s[k]).length;
      const lag = !!s._menyimpan;
      return `<tr class="${lag ? 'opacity-60' : ''}"><td class="text-slate-500">${i + 1}</td><td class="font-semibold text-blue-600 whitespace-nowrap">${lag ? '⏳' : esc(s.id_soal)}</td>
        <td class="text-xs">${esc(s.id_ujian)}<br><span class="text-slate-400">${esc(nama[s.id_ujian] || '')}</span></td>
        <td class="max-w-md"><div class="line-clamp-2">${esc(s.pertanyaan) || '<i class="text-slate-400">(hanya gambar)</i>'}</div>${gb ? `<span class="badge b-blue mt-1">🖼️ ${gb} gambar</span>` : ''}${lag ? ' <span class="badge b-amber mt-1">menyimpan…</span>' : ''}</td>
        <td class="font-bold uppercase text-emerald-600">${esc(s.kunci)}</td>
        <td class="whitespace-nowrap">${lag ? '' : `<button class="btn-gray btn-xs" onclick="Admin.previewSoal('${esc(s.id_soal)}')">Pratinjau</button>
          <button class="btn-gray btn-xs" onclick="Admin.formSoal('${esc(s.id_soal)}')">Edit</button>
          <button class="btn-red btn-xs" onclick="Admin.hapusSoal('${esc(s.id_soal)}')">Hapus</button>`}</td></tr>`;
    });
    $('soalTabel').innerHTML = `<p class="text-xs text-slate-500 mb-2">${list.length} soal${list.length > 300 ? ' (menampilkan 300 pertama — gunakan filter)' : ''}</p>` +
      tabel(['No', 'ID Soal', 'Ujian', 'Pertanyaan', 'Kunci', 'Aksi'], rows, 'Belum ada soal.');
  },
  async muatUlangSoal() {                       // dipakai setelah import
    const [a, b] = await Promise.all([api('soal.list'), api('jadwal.list')]);
    if (a.success) { Data.put('soal.list', a.data); Admin.data.soal = a.data.soal; }
    if (b.success) { Data.put('jadwal.list', b.data); Admin.data.jadwal = b.data.jadwal; }
    Data.basi('admin.dashboard', 'analisis.semua');
    Admin.renderSoal();
  },

  previewSoal(idSoal) {
    const q = Admin.data.soal.find(x => x.id_soal === idSoal); if (!q) return;
    Modal.open('Pratinjau Soal ' + q.id_soal,
      `<div class="space-y-3">${imgTag(q.gambar_soal, 'q-img')}${q.pertanyaan ? `<p class="q-text text-lg font-medium text-slate-800">${esc(q.pertanyaan)}</p>` : ''}
        <div class="space-y-2">${['a', 'b', 'c', 'd'].map(k => `<div class="p-3 rounded-xl border ${q.kunci === k ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}">
          <b class="uppercase">${k}.</b> <span class="q-text">${optHtml(q, k)}</span>${q.kunci === k ? ' <span class="badge b-green">Kunci</span>' : ''}</div>`).join('')}</div>
        ${q.pembahasan ? `<div class="p-3 bg-blue-50 rounded-lg border border-blue-100"><p class="text-xs font-bold text-blue-700 uppercase mb-1">💡 Pembahasan</p><p class="text-sm q-text">${esc(q.pembahasan)}</p></div>` : ''}</div>`);
  },

  // ---------- Form soal + unggah gambar (unggah berjalan di latar belakang sejak gambar dipilih) ----------
  gbrField(k) {
    return `<div class="mt-2"><div id="gbrPrev-${k}" class="gbr-prev"></div><div class="flex items-center gap-2 flex-wrap">
      <label class="btn-gray btn-xs cursor-pointer">🖼️ <span id="gbrLbl-${k}">Tambah gambar</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" onchange="Admin.pilihGambar('${k}', this)"></label>
      <button type="button" id="gbrDel-${k}" class="btn-red btn-xs hidden" onclick="Admin.hapusGambar('${k}')">Hapus gambar</button>
      <span id="gbrStat-${k}" class="text-xs text-slate-500"></span></div></div>`;
  },
  renderGbr(k) {
    const g = Admin.gbr, e = g.pending[k], src = e ? e.dataUrl : g.url[k], prev = $('gbrPrev-' + k);
    if (!prev) return;
    prev.replaceChildren();
    if (src) { const im = document.createElement('img'); im.alt = 'Pratinjau gambar'; im.src = src; prev.appendChild(im); }
    $('gbrLbl-' + k).textContent = src ? 'Ganti gambar' : 'Tambah gambar';
    $('gbrDel-' + k).classList.toggle('hidden', !src);
    $('gbrStat-' + k).textContent = !e ? '' : e.status === 'unggah' ? '⏳ mengunggah…' : e.status === 'ok' ? '✓ siap' : '✗ gagal: ' + e.pesan;
  },
  async pilihGambar(k, input) {
    const f = input.files[0]; input.value = '';
    if (!f) return;
    const g = Admin.gbr;
    let c;
    try { c = await compressImage(f, k === 'soal' ? 1280 : 800); } catch (e) { return UI.err(e.message); }
    const entry = { dataUrl: c.dataUrl, mime: c.mime, status: 'unggah', url: '', pesan: '' };
    entry.promise = api('soal.upload', { mime: c.mime, base64: c.dataUrl.split(',')[1] }).then(r => {
      if (r.success) { entry.status = 'ok'; entry.url = r.data.url; } else { entry.status = 'gagal'; entry.pesan = r.message; }
      if (Admin.gbr === g && g.pending[k] === entry) Admin.renderGbr(k);
      return entry;
    });
    g.pending[k] = entry; g.semua.push(entry);
    Admin.renderGbr(k);                                   // pratinjau muncul seketika; unggahan jalan sendiri
  },
  hapusGambar(k) { delete Admin.gbr.pending[k]; Admin.gbr.url[k] = ''; Admin.renderGbr(k); },
  async buangUnggahan(g, dipakai) {             // hapus file Drive yang terunggah tapi tidak jadi dipakai
    const hasil = await Promise.all(g.semua.map(e => e.promise.catch(() => e)));
    const urls = hasil.filter(e => e.status === 'ok' && !dipakai.has(e.url)).map(e => e.url);
    if (urls.length) api('soal.buang', { urls: urls });
  },

  formSoal(idSoal, draft, gLama) {
    if (!Admin.data.jadwal.length) return UI.err('Buat jadwal ujian terlebih dahulu di menu Jadwal Ujian.', 'Belum ada ujian');
    const s = draft || (idSoal ? Admin.data.soal.find(x => x.id_soal === idSoal) : null);
    const filter = $('fSoalUjian') ? $('fSoalUjian').value : '';
    const g = gLama || { url: { soal: s ? s.gambar_soal : '', a: s ? s.gambar_a : '', b: s ? s.gambar_b : '', c: s ? s.gambar_c : '', d: s ? s.gambar_d : '' }, pending: {}, semua: [], diproses: false };
    g.diproses = false; Admin.gbr = g;
    const opsi = ['a', 'b', 'c', 'd'].map(k => `<div class="border border-slate-200 rounded-xl p-3">
      <div class="flex items-center gap-2 mb-2"><input type="radio" name="fsKunci" value="${k}" id="fsK${k}" ${s && s.kunci === k ? 'checked' : ''}>
        <label for="fsK${k}" class="font-bold uppercase text-slate-700">Opsi ${k}</label><span class="text-xs text-slate-400 ml-auto">pilih = kunci jawaban</span></div>
      <input id="fsOp${k}" class="inp" maxlength="500" placeholder="Teks opsi ${k.toUpperCase()}" value="${esc(s ? s['opsi_' + k] : '')}">${Admin.gbrField(k)}</div>`).join('');
    Modal.open(idSoal ? 'Edit Soal ' + idSoal : 'Tambah Soal Pilihan Ganda',
      `<div class="space-y-4">
        <div><label class="lbl">Ujian</label><select id="fsUjian" class="inp">${Admin.opsiUjian(s ? s.id_ujian : filter)}</select></div>
        <div><label class="lbl">Pertanyaan</label><textarea id="fsPert" rows="3" class="inp" maxlength="3000" placeholder="Tulis pertanyaan...">${esc(s ? s.pertanyaan : '')}</textarea>${Admin.gbrField('soal')}
          <p class="text-xs text-slate-400 mt-1">Gambar diperkecil otomatis dan diunggah begitu dipilih. Format: JPG, PNG, WEBP, GIF.</p></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${opsi}</div>
        <div><label class="lbl">Pembahasan (opsional)</label><textarea id="fsPemb" rows="2" class="inp" maxlength="3000">${esc(s ? s.pembahasan : '')}</textarea></div></div>`,
      { lebar: 'max-w-3xl', label: 'Simpan Soal', simpan: () => Admin.simpanSoal(idSoal || ''),
        onOpen: () => ['soal', 'a', 'b', 'c', 'd'].forEach(k => Admin.renderGbr(k)),
        onTutup: () => { if (!g.diproses) Admin.buangUnggahan(g, new Set(Object.keys(g.url).map(k => g.url[k]).filter(Boolean))); } });
  },

  // Validasi cepat di browser → modal langsung tertutup → penyimpanan berjalan di latar belakang
  simpanSoal(idSoal) {
    const g = Admin.gbr, ada = k => !!(g.pending[k] || g.url[k]);
    const f = { id_ujian: $('fsUjian').value, pertanyaan: $('fsPert').value.trim(), pembahasan: $('fsPemb').value.trim(),
      opsi_a: $('fsOpa').value.trim(), opsi_b: $('fsOpb').value.trim(), opsi_c: $('fsOpc').value.trim(), opsi_d: $('fsOpd').value.trim(),
      kunci: (document.querySelector('input[name=fsKunci]:checked') || {}).value || '' };
    if (!f.kunci) { UI.err('Pilih kunci jawaban (bulatan di samping opsi yang benar).'); return false; }
    if (!f.pertanyaan && !ada('soal')) { UI.err('Isi pertanyaan atau unggah gambar soal.'); return false; }
    for (const k of ['a', 'b', 'c', 'd']) { if (!f['opsi_' + k] && !ada(k)) { UI.err('Opsi ' + k.toUpperCase() + ' belum diisi (teks atau gambar).'); return false; } }
    if (Object.keys(g.pending).some(k => g.pending[k].status === 'gagal')) { UI.err('Ada gambar yang gagal diunggah. Hapus atau ganti gambar tersebut.'); return false; }
    g.diproses = true;
    Admin.simpanSoalLatar(idSoal, f, g);
    return true;                                           // modal tertutup seketika
  },
  async simpanSoalLatar(idSoal, f, g) {
    const L = Admin.data.soal, temp = idSoal || ('TEMP-' + Date.now());
    const gam = k => (g.pending[k] ? g.pending[k].dataUrl : g.url[k]) || '';
    const tampil = Object.assign({}, f, { id_soal: temp, gambar_soal: gam('soal'), gambar_a: gam('a'), gambar_b: gam('b'), gambar_c: gam('c'), gambar_d: gam('d'), _menyimpan: true });
    const idx = L.findIndex(x => x.id_soal === idSoal), lama = idx >= 0 ? Object.assign({}, L[idx]) : null;
    if (idx >= 0) L[idx] = tampil; else L.push(tampil);      // langsung terlihat di daftar
    if ($('soalTabel')) Admin.renderSoal();
    const batal = pesan => {
      const i = L.findIndex(x => x.id_soal === temp);
      if (i >= 0) { if (lama) L[i] = lama; else L.splice(i, 1); }
      Admin.sinkronJumlah(); if ($('soalTabel')) Admin.renderSoal();
      UI.err(pesan, 'Soal gagal disimpan').then(() => Admin.formSoal(idSoal, f, g));   // buka lagi formulir dengan isian semula
    };
    const url = {};
    for (const k of ['soal', 'a', 'b', 'c', 'd']) {
      if (g.pending[k]) { const e = await g.pending[k].promise; if (e.status !== 'ok') return batal('Gambar gagal diunggah: ' + e.pesan); url[k] = e.url; }
      else url[k] = g.url[k] || '';
    }
    const r = await api('soal.simpan', { id_soal: idSoal, id_ujian: f.id_ujian, pertanyaan: f.pertanyaan, kunci_jawaban: f.kunci, pembahasan: f.pembahasan,
      opsi_a: f.opsi_a, opsi_b: f.opsi_b, opsi_c: f.opsi_c, opsi_d: f.opsi_d,
      gambar_soal: url.soal, gambar_a: url.a, gambar_b: url.b, gambar_c: url.c, gambar_d: url.d });
    if (!r.success) return batal(r.message);
    const i = L.findIndex(x => x.id_soal === temp);
    if (i >= 0) L[i] = r.data.soal; else L.push(r.data.soal);
    Admin.sinkronJumlah(); Data.basi('admin.dashboard', 'analisis.semua');
    if ($('soalTabel')) Admin.renderSoal();
    UI.ok(r.message);
    Admin.buangUnggahan(g, new Set(Object.keys(url).map(k => url[k]).filter(Boolean)));
  },

  async hapusSoal(idSoal) {
    if (!(await UI.yakin('Hapus soal?', 'Soal dan gambar-gambarnya akan dihapus permanen.', 'Ya, Hapus', true))) return;
    const L = Admin.data.soal, pulih = Admin.cadang(L), i = L.findIndex(x => x.id_soal === idSoal);
    if (i < 0) return;
    L.splice(i, 1);                                           // hilang seketika
    Admin.sinkronJumlah(); Data.basi('admin.dashboard', 'analisis.semua');
    if ($('soalTabel')) Admin.renderSoal();
    UI.ok('Soal dihapus');
    const r = await api('soal.hapus', { id_soal: idSoal });
    if (!r.success) { pulih(); Admin.sinkronJumlah(); if ($('soalTabel')) Admin.renderSoal(); UI.err(r.message, 'Gagal menghapus — soal dikembalikan'); }
  },

  async templateSoal() {
    const contoh = (Admin.data.jadwal[0] || {}).id_ujian || 'EXAM-001';
    await Admin.unduhXlsx('Template_Import_Soal.xlsx', 'Template Soal', [
      ['id_ujian', 'pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'kunci_jawaban', 'pembahasan'],
      [contoh, 'Contoh pertanyaan?', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'a', 'Contoh pembahasan.']], [12, 50, 20, 20, 20, 20, 15, 50]);
    UI.ok('Template diunduh');
  },
  importSoal() {
    Modal.open('Import Soal dari Excel / CSV',
      `<p class="text-sm text-slate-600 mb-3">Gunakan format template (kolom: id_ujian, pertanyaan, opsi_a–d, kunci_jawaban, pembahasan). Maksimal 500 soal. Gambar ditambahkan setelah impor lewat tombol Edit.</p>
       <input type="file" id="impFile" accept=".xlsx,.xls,.csv" class="inp">`,
      { lebar: 'max-w-lg', label: 'Import Sekarang', simpan: Admin.prosesImportSoal });
  },
  async prosesImportSoal() {
    const f = $('impFile').files[0];
    if (!f) { UI.err('Pilih file terlebih dahulu.'); return false; }
    let d; try { d = await Admin.bacaExcel(f); } catch (e) { UI.err(e.message); return false; }
    const perlu = ['id_ujian', 'pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'kunci_jawaban'], hilang = perlu.filter(k => !d.head.includes(k));
    if (hilang.length) { UI.err('Kolom wajib tidak ditemukan: ' + hilang.join(', ')); return false; }
    if (d.rows.length > 500) { UI.err('Maksimal 500 soal per file.'); return false; }
    const r = await api('soal.import', { rows: d.rows });
    if (!r.success) { UI.err(r.message); return false; }
    const gal = r.data.errors || [];
    Admin.muatUlangSoal();
    Swal.fire({ icon: gal.length ? 'warning' : 'success', title: 'Hasil Import', confirmButtonColor: '#2563EB',
      html: `<p>${esc(r.message)}</p>${gal.length ? `<p class="text-amber-600 text-sm mt-2">${gal.length} baris dilewati:</p><ul class="text-xs text-left list-disc ml-5 max-h-40 overflow-y-auto">${gal.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` });
    return true;
  },

  // ============================================================
  // JADWAL
  // ============================================================
  renderJadwal() {
    if (App.page !== 'jadwal') return;
    const rows = Admin.data.jadwal.map(j => {
      const aktif = j.status.toLowerCase() === 'aktif', mp = Admin.mapelNama(j.id_mapel);
      const akses = j.kode_akses === 'Ya' ? (j.ada_kode ? '<span class="badge b-green">Kode aktif</span>' : '<span class="badge b-amber">Kode belum dibuat</span>') : '<span class="badge b-slate">Tanpa kode</span>';
      return `<tr><td class="font-semibold text-blue-600">${esc(j.id_ujian)}</td>
        <td class="font-bold">${esc(j.nama_ujian)}<br>${mp ? `<span class="badge b-blue">${esc(mp)}</span>` : '<span class="text-xs text-slate-400">Lainnya</span>'}</td>
        <td class="text-xs text-slate-600">${fmtDate(j.waktu_mulai)}<br>s.d. ${fmtDate(j.waktu_selesai)}</td><td>${j.durasi_menit} mnt</td><td>${j.kkm}</td>
        <td>${j.jumlah_soal}</td><td>${j.jumlah_hasil}</td><td>${akses}</td>
        <td>${aktif ? '<span class="badge b-green">Aktif</span>' : '<span class="badge b-red">Tidak Aktif</span>'}</td>
        <td class="whitespace-nowrap"><button class="btn-amber btn-xs" onclick="Admin.dialogKode('${esc(j.id_ujian)}')">${ikon('kunci', 14, 2.5)} Kode</button>
          <button class="btn-gray btn-xs" onclick="Admin.formJadwal('${esc(j.id_ujian)}')">Edit</button>
          <button class="${aktif ? 'btn-red' : 'btn-green'} btn-xs" onclick="Admin.toggleJadwal('${esc(j.id_ujian)}')">${aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
          <button class="btn-red btn-xs" onclick="Admin.hapusJadwal('${esc(j.id_ujian)}')">Hapus</button></td></tr>`;
    });
    $('page').innerHTML = `<div class="fade-in">` + pageHead('Jadwal Ujian', 'Atur mata pelajaran, waktu buka/tutup, durasi, KKM, dan kode akses ujian.', `<button class="btn-blue" onclick="Admin.formJadwal()">${ikon('tambah', 18)} Buat Ujian</button>`) +
      `<div class="bg-white rounded-3xl card-shadow p-5">${tabel(['ID', 'Ujian / Mapel', 'Waktu Buka / Tutup', 'Durasi', 'KKM', 'Soal', 'Hasil', 'Akses', 'Status', 'Aksi'], rows, 'Belum ada jadwal ujian.')}</div></div>`;
  },
  formJadwal(idUjian) {
    const j = idUjian ? Admin.data.jadwal.find(x => x.id_ujian === idUjian) : null;
    const mulai = j ? j.waktu_mulai : new Date().toISOString(), selesai = j ? j.waktu_selesai : new Date(Date.now() + 7 * 86400000).toISOString();
    const opsiMapel = `<option value="">Lainnya (tanpa mata pelajaran)</option>` + Admin.data.mapel.map(m => `<option value="${esc(m.id_mapel)}" ${j && j.id_mapel === m.id_mapel ? 'selected' : ''}>${esc(m.nama_mapel)}</option>`).join('');
    Modal.open(j ? 'Edit Ujian ' + j.id_ujian : 'Buat Jadwal Ujian Baru',
      `<div class="space-y-3">
        <div><label class="lbl" for="fjNama">Nama ujian</label><input id="fjNama" class="inp" maxlength="150" value="${esc(j ? j.nama_ujian : '')}"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label class="lbl" for="fjMapel">Mata pelajaran</label><select id="fjMapel" class="inp">${opsiMapel}</select></div>
          <div><label class="lbl" for="fjKode">Wajib kode akses untuk memulai</label><select id="fjKode" class="inp"><option value="Tidak" ${!j || j.kode_akses !== 'Ya' ? 'selected' : ''}>Tidak</option><option value="Ya" ${j && j.kode_akses === 'Ya' ? 'selected' : ''}>Ya</option></select></div>
          <div><label class="lbl" for="fjMulai">Waktu dibuka</label><input id="fjMulai" type="datetime-local" class="inp" value="${toLocalInput(mulai)}"></div>
          <div><label class="lbl" for="fjSelesai">Waktu ditutup</label><input id="fjSelesai" type="datetime-local" class="inp" value="${toLocalInput(selesai)}"></div>
          <div><label class="lbl" for="fjDurasi">Durasi pengerjaan (menit, 1–360)</label><input id="fjDurasi" type="number" min="1" max="360" class="inp" value="${j ? j.durasi_menit : 60}"></div>
          <div><label class="lbl" for="fjKkm">KKM / nilai minimum lulus (0–100)</label><input id="fjKkm" type="number" min="0" max="100" class="inp" value="${j ? j.kkm : 70}"></div>
          <div><label class="lbl" for="fjAcak">Acak urutan soal</label><select id="fjAcak" class="inp"><option value="Ya" ${!j || j.acak_soal === 'Ya' ? 'selected' : ''}>Ya</option><option value="Tidak" ${j && j.acak_soal === 'Tidak' ? 'selected' : ''}>Tidak</option></select></div>
          <div><label class="lbl" for="fjStatus">Status</label><select id="fjStatus" class="inp"><option value="Aktif" ${!j || j.status.toLowerCase() === 'aktif' ? 'selected' : ''}>Aktif</option><option value="Tidak Aktif" ${j && j.status.toLowerCase() !== 'aktif' ? 'selected' : ''}>Tidak Aktif</option></select></div>
        </div>
        <p class="text-xs text-slate-500">Kode akses dibuat lewat tombol <b>Kode</b> pada daftar jadwal setelah ujian disimpan.</p></div>`,
      { label: 'Simpan Jadwal', simpan: async () => {
        const r = await api('jadwal.simpan', { id_ujian: idUjian || '', nama_ujian: $('fjNama').value, waktu_mulai: fromLocalInput($('fjMulai').value),
          waktu_selesai: fromLocalInput($('fjSelesai').value), durasi_menit: $('fjDurasi').value, kkm: $('fjKkm').value, acak_soal: $('fjAcak').value, status: $('fjStatus').value,
          id_mapel: $('fjMapel').value, kode_akses: $('fjKode').value });
        if (!r.success) { UI.err(r.message); return false; }
        const L = Admin.data.jadwal, i = L.findIndex(x => x.id_ujian === r.data.jadwal.id_ujian);
        if (i >= 0) L[i] = Object.assign({}, L[i], r.data.jadwal, { ada_kode: L[i].ada_kode }); else L.push(r.data.jadwal);
        Data.basi('admin.dashboard', 'mapel.list'); Data.simpan();
        if (App.page === 'jadwal') Admin.renderJadwal();
        UI.ok(r.message);
        return true;
      } });
  },

  // ---------- Kode akses ujian (disimpan di server sebagai hash; hanya terlihat saat dibuat) ----------
  dialogKode(id) {
    const j = Admin.data.jadwal.find(x => x.id_ujian === id); if (!j) return;
    const status = j.ada_kode ? '<span class="badge b-green">Kode aktif</span>' : '<span class="badge b-amber">Belum ada kode</span>';
    Modal.open('Kode Akses — ' + j.nama_ujian,
      `<p class="text-sm mb-2">Status: ${status}</p>
       <p class="text-sm text-slate-600">Siswa harus memasukkan kode ini sebelum ujian dimulai. Kode disimpan terenkripsi di server, jadi <b>hanya terlihat saat dibuat</b>. Lupa kode? Buat yang baru — siswa yang sudah mulai mengerjakan tidak terpengaruh.</p>
       <div class="grid gap-3 mt-4">
         <button class="btn-amber" onclick="Admin.buatKode('${esc(id)}', 'acak')">Buat kode acak (6 karakter)</button>
         <div><label class="lbl" for="kodeManual">Atau tentukan sendiri (4–12 huruf/angka)</label>
           <div class="flex gap-2"><input id="kodeManual" class="inp" style="text-transform:uppercase" maxlength="12" autocomplete="off" placeholder="Contoh: MATEMATIKA7">
           <button class="btn-blue" onclick="Admin.buatKode('${esc(id)}', 'manual')">Pakai</button></div></div>
         ${j.ada_kode ? `<button class="btn-red" onclick="Admin.buatKode('${esc(id)}', 'hapus')">Hapus kode</button>` : ''}</div>`, { lebar: 'max-w-md' });
  },
  async buatKode(id, mode) {
    const j = Admin.data.jadwal.find(x => x.id_ujian === id); if (!j) return;
    const body = { id_ujian: id, mode: mode }; if (mode === 'manual') body.kode = $('kodeManual').value;
    UI.loading(mode === 'hapus' ? 'Menghapus kode...' : 'Membuat kode...');
    const r = await api('jadwal.kode', body);
    UI.close();
    if (!r.success) return UI.err(r.message);
    j.ada_kode = !!r.data.ada_kode;
    if (j.ada_kode && j.kode_akses !== 'Ya') {            // membuat kode berarti kode diwajibkan
      j.kode_akses = 'Ya';
      api('jadwal.simpan', { id_ujian: id, nama_ujian: j.nama_ujian, waktu_mulai: j.waktu_mulai, waktu_selesai: j.waktu_selesai, durasi_menit: j.durasi_menit, kkm: j.kkm,
        acak_soal: j.acak_soal, status: j.status, id_mapel: j.id_mapel || '', kode_akses: 'Ya' });
    }
    Data.simpan(); Modal.close(); Admin.renderJadwal();
    if (!j.ada_kode) return UI.ok('Kode akses dihapus');
    Swal.fire({ title: 'Kode Akses Ujian', confirmButtonColor: '#4F46E5', confirmButtonText: 'Sudah saya catat',
      html: `<p class="text-sm opacity-80 mb-3">${esc(j.nama_ujian)}</p><div class="kode-besar" aria-label="Kode akses">${esc(r.data.kode)}</div>
        <p class="text-xs font-bold mt-3" style="color:#B45309">Catat atau tampilkan di papan tulis sekarang — kode tidak bisa dilihat lagi.</p>
        <button class="btn-gray mt-3" onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(r.data.kode)}');this.textContent='Tersalin'">Salin kode</button>` });
  },

  // ---------- Mata pelajaran ----------
  renderMapel() {
    if (App.page !== 'mapel') return;
    const l = Admin.data.mapel;
    const kartu = l.map((m, i) => `<div class="mapel-tile mp-${esc(m.warna)} rise ${m.aktif === 'Tidak' ? 'opacity-60' : ''}" style="--i:${i};min-height:170px;cursor:default">
      <span class="mapel-ico">${ikon(m.ikon, 28)}</span><span class="mapel-nama">${esc(m.nama_mapel)}</span><span class="mapel-desk">${esc(m.deskripsi) || 'Belum ada deskripsi'}</span>
      <span class="mapel-foot"><span class="chip">${m.jumlah_ujian || 0} ujian</span><span class="chip">${m.jumlah_soal || 0} soal</span>${m.aktif === 'Tidak' ? '<span class="chip">Nonaktif</span>' : ''}</span>
      <span class="mapel-foot" style="margin-top:.6rem"><button class="btn-xs" style="background:#fff;color:#1E1B4B;border-radius:.6rem;padding:.2rem .8rem;font-weight:800;min-height:32px" onclick="Admin.formMapel('${esc(m.id_mapel)}')">Edit</button>
        <button class="btn-xs" style="background:rgba(0,0,0,.28);color:#fff;border-radius:.6rem;padding:.2rem .8rem;font-weight:800;min-height:32px" onclick="Admin.hapusMapel('${esc(m.id_mapel)}')">Hapus</button></span></div>`);
    $('page').innerHTML = `<div class="fade-in">` + pageHead('Mata Pelajaran', 'Siswa memilih mata pelajaran dan memasukkan kode akses SEBELUM login; akunnya lalu hanya melihat ujian yang dipilih. Atur mata pelajaran tiap ujian di Jadwal Ujian.',
      `<button class="btn-blue" onclick="Admin.formMapel()">${ikon('tambah', 18)} Tambah Mata Pelajaran</button>`) +
      (l.length ? `<div class="mapel-grid">${kartu.join('')}</div>` : `<div class="bg-white rounded-3xl card-shadow p-10 text-center"><p class="text-slate-600 mb-4">Belum ada mata pelajaran.</p>
        <button class="btn-amber" onclick="Admin.mapelContoh()">Tambahkan contoh mata pelajaran SD</button></div>`) + `</div>`;
  },
  async mapelContoh() {
    UI.loading('Menambahkan contoh...');
    const r = await api('mapel.contoh');
    if (!r.success) { UI.close(); return UI.err(r.message); }
    const b = await api('mapel.list'); UI.close();
    if (b.success) { Data.put('mapel.list', b.data); Admin.data.mapel = b.data.mapel; }
    Admin.renderMapel(); UI.ok(r.message);
  },
  formMapel(idMapel) {
    const m = idMapel ? Admin.data.mapel.find(x => x.id_mapel === idMapel) : null;
    Admin.fm = { ikon: m ? m.ikon : 'buku', warna: m ? m.warna : 'indigo' };
    const ikons = ['hitung', 'buku', 'sains', 'bendera', 'dunia', 'bintang', 'musik', 'seni', 'alam', 'olahraga', 'agama', 'komputer'];
    const warnas = ['indigo', 'sky', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange'];
    Modal.open(m ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran',
      `<div class="space-y-4">
        <div><label class="lbl" for="fmNama">Nama mata pelajaran</label><input id="fmNama" class="inp" maxlength="60" value="${esc(m ? m.nama_mapel : '')}" placeholder="Contoh: Matematika"></div>
        <div><label class="lbl" for="fmDesk">Deskripsi singkat (tampil di kartu siswa)</label><input id="fmDesk" class="inp" maxlength="120" value="${esc(m ? m.deskripsi : '')}"></div>
        <div><span class="lbl">Ikon</span><div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Ikon">${ikons.map(k => `<button type="button" class="ic-pick" role="radio" aria-checked="${Admin.fm.ikon === k}" data-k="${k}" aria-label="${k}" onclick="Admin.pilihFm('ikon','${k}')">${ikon(k, 24)}</button>`).join('')}</div></div>
        <div><span class="lbl">Warna</span><div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Warna">${warnas.map(k => `<button type="button" class="sw mp-${k}" role="radio" aria-checked="${Admin.fm.warna === k}" data-k="${k}" aria-label="${k}" onclick="Admin.pilihFm('warna','${k}')"></button>`).join('')}</div></div>
        <div><label class="lbl" for="fmAktif">Status</label><select id="fmAktif" class="inp"><option value="Ya" ${!m || m.aktif === 'Ya' ? 'selected' : ''}>Aktif (tampil untuk siswa)</option><option value="Tidak" ${m && m.aktif === 'Tidak' ? 'selected' : ''}>Nonaktif</option></select></div></div>`,
      { lebar: 'max-w-lg', simpan: async () => {
        const r = await api('mapel.simpan', { id_mapel: idMapel || '', nama_mapel: $('fmNama').value, deskripsi: $('fmDesk').value, ikon: Admin.fm.ikon, warna: Admin.fm.warna, aktif: $('fmAktif').value });
        if (!r.success) { UI.err(r.message); return false; }
        const L = Admin.data.mapel, i = L.findIndex(x => x.id_mapel === r.data.mapel.id_mapel);
        if (i >= 0) L[i] = Object.assign({}, L[i], r.data.mapel); else L.push(Object.assign({ jumlah_ujian: 0, jumlah_soal: 0 }, r.data.mapel));
        Data.basi('peserta.beranda'); Data.simpan(); Admin.renderMapel(); UI.ok(r.message);
        return true;
      } });
  },
  pilihFm(jenis, k) {
    Admin.fm[jenis] = k;
    document.querySelectorAll(jenis === 'ikon' ? '.ic-pick' : '.sw').forEach(b => b.setAttribute('aria-checked', String(b.dataset.k === k)));
  },
  async hapusMapel(idMapel) {
    const L = Admin.data.mapel, m = L.find(x => x.id_mapel === idMapel); if (!m) return;
    if (!(await UI.yakin('Hapus mata pelajaran?', `<b>${esc(m.nama_mapel)}</b> akan dihapus. Hanya bisa jika tidak ada ujian di dalamnya.`, 'Ya, Hapus', true))) return;
    const pulih = Admin.cadang(L);
    L.splice(L.findIndex(x => x.id_mapel === idMapel), 1);
    Data.simpan(); Admin.renderMapel(); UI.ok('Mata pelajaran dihapus');
    const r = await api('mapel.hapus', { id_mapel: idMapel });
    if (!r.success) { pulih(); Data.simpan(); Admin.renderMapel(); UI.err(r.message, 'Gagal menghapus — dikembalikan'); }
  },

  async toggleJadwal(id) {
    const L = Admin.data.jadwal, j = L.find(x => x.id_ujian === id); if (!j) return;
    const aktif = j.status.toLowerCase() === 'aktif';
    if (!(await UI.yakin(aktif ? 'Nonaktifkan ujian?' : 'Aktifkan ujian?', `Ujian <b>${esc(id)}</b> akan ${aktif ? 'disembunyikan dari peserta' : 'ditampilkan ke peserta'}.`, aktif ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan', aktif))) return;
    const pulih = Admin.cadang(L);
    j.status = aktif ? 'Tidak Aktif' : 'Aktif';              // berubah seketika
    Data.basi('admin.dashboard'); Data.simpan(); Admin.renderJadwal();
    UI.ok('Status ujian: ' + j.status);
    const r = await api('jadwal.toggle', { id_ujian: id });
    if (!r.success) { pulih(); if (App.page === 'jadwal') Admin.renderJadwal(); UI.err(r.message, 'Gagal mengubah status — dikembalikan'); }
  },
  async hapusJadwal(id) {
    const L = Admin.data.jadwal, j = L.find(x => x.id_ujian === id); if (!j) return;
    if (!(await UI.yakin('Hapus ujian?', `Ujian <b>${esc(id)}</b> beserta <b>${j.jumlah_soal} soalnya</b> (termasuk gambar) akan dihapus permanen.`, 'Ya, Hapus', true))) return;
    const SL = Data.ada('soal.list') ? Data.ambil('soal.list').soal : [], pulihJ = Admin.cadang(L), pulihS = Admin.cadang(SL);
    L.splice(L.findIndex(x => x.id_ujian === id), 1);
    for (let i = SL.length - 1; i >= 0; i--) { if (SL[i].id_ujian === id) SL.splice(i, 1); }
    Data.basi('admin.dashboard', 'analisis.semua'); Data.simpan(); Admin.renderJadwal();
    UI.ok('Ujian dihapus');
    const r = await api('jadwal.hapus', { id_ujian: id });
    if (!r.success) { pulihJ(); pulihS(); Data.simpan(); if (App.page === 'jadwal') Admin.renderJadwal(); UI.err(r.message, 'Gagal menghapus — dikembalikan'); }
  },

  // ============================================================
  // REKAP NILAI
  // ============================================================
  renderHasil() {
    if (!$('hasilIsi')) return;
    const f = $('fHasilUjian').value;
    const l = Admin.data.hasil = Admin.data.hasilAll.filter(h => !f || h.id_ujian === f), n = l.map(x => x.nilai);
    const rata = n.length ? (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1) : 0;
    const rows = l.map((h, i) => `<tr><td class="text-slate-500">${i + 1}</td><td class="font-medium">${esc(h.nama)}<br><span class="text-xs text-slate-400">${esc(h.username)}</span></td>
      <td class="text-xs">${esc(h.id_ujian)}<br><span class="text-slate-400">${esc(h.nama_ujian)}</span></td><td class="font-bold text-lg ${nilaiCls(h.nilai, h.kkm)}">${h.nilai}</td>
      <td>${h.lulus ? '<span class="badge b-green">Lulus</span>' : '<span class="badge b-red">Belum Lulus</span>'}</td>
      <td>${h.pelanggaran ? `<span class="badge b-amber">${h.pelanggaran}</span>` : '<span class="text-slate-300">0</span>'}</td>
      <td class="text-xs text-slate-500">${fmtDate(h.waktu_selesai)}</td>
      <td><button class="btn-red btn-xs" onclick="Admin.hapusHasil('${esc(h.id_hasil)}')">Hapus</button></td></tr>`);
    $('hasilIsi').innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">${statCard('Peserta', l.length, 'blue')}${statCard('Rata-rata', rata, 'green')}
      ${statCard('Tertinggi', n.length ? Math.max(...n) : 0, 'amber')}${statCard('Terendah', n.length ? Math.min(...n) : 0, 'rose')}</div>` +
      tabel(['No', 'Peserta', 'Ujian', 'Nilai', 'Status', 'Pelanggaran', 'Waktu Submit', 'Aksi'], rows, 'Belum ada hasil ujian.');
  },
  async hapusHasil(idHasil) {
    if (!(await UI.yakin('Hapus hasil ini?', 'Nilai peserta dihapus dan peserta <b>dapat mengerjakan ujian ini lagi</b>. Tindakan ini tidak bisa dibatalkan.', 'Ya, Hapus', true))) return;
    const L = Admin.data.hasilAll, pulih = Admin.cadang(L), i = L.findIndex(x => x.id_hasil === idHasil);
    if (i < 0) return;
    L.splice(i, 1);
    Admin.sinkronJumlah(); Data.basi('admin.dashboard', 'analisis.semua'); Data.simpan();
    Admin.renderHasil(); UI.ok('Hasil dihapus');
    const r = await api('hasil.hapus', { id_hasil: idHasil });
    if (!r.success) { pulih(); Admin.sinkronJumlah(); Admin.renderHasil(); UI.err(r.message, 'Gagal menghapus — dikembalikan'); }
  },
  async exportHasil() {
    const l = Admin.data.hasil;
    if (!l || !l.length) return Swal.fire('Info', 'Tidak ada data untuk diekspor.', 'info');
    try { await Lib.butuh('exceljs', 'filesaver'); } catch (e) { return UI.err(e.message); }
    const wb = new ExcelJS.Workbook(); wb.creator = App.setting.nama_sekolah; wb.created = new Date();
    const ws = wb.addWorksheet('Rekap Nilai', { views: [{ state: 'frozen', ySplit: 3 }] });
    ws.mergeCells('A1:J1'); ws.getCell('A1').value = 'REKAPITULASI NILAI UJIAN — ' + App.setting.nama_sekolah.toUpperCase();
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } }; ws.getCell('A1').alignment = { horizontal: 'center' };
    ws.mergeCells('A2:J2'); ws.getCell('A2').value = 'Diekspor: ' + new Date().toLocaleString('id-ID');
    ws.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } }; ws.getCell('A2').alignment = { horizontal: 'center' };
    const hr = ws.addRow(['No', 'ID Hasil', 'Username', 'Nama', 'Ujian', 'Nilai', 'KKM', 'Status', 'Pelanggaran', 'Waktu Submit']);
    hr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; c.alignment = { horizontal: 'center' }; });
    l.forEach((h, i) => {
      const row = ws.addRow([i + 1, h.id_hasil, h.username, h.nama, h.nama_ujian, h.nilai, h.kkm, h.lulus ? 'Lulus' : 'Belum Lulus', h.pelanggaran, fmtDate(h.waktu_selesai)]);
      row.getCell(6).font = { bold: true, color: { argb: h.lulus ? 'FF059669' : 'FFDC2626' } };
      [1, 6, 7, 9].forEach(c => { row.getCell(c).alignment = { horizontal: 'center' }; });
    });
    const n = l.map(h => h.nilai);
    ws.addRow([]);
    [['Rata-rata', (n.reduce((a, b) => a + b, 0) / n.length).toFixed(2)], ['Nilai Tertinggi', Math.max(...n)], ['Nilai Terendah', Math.min(...n)]].forEach(x => {
      const r = ws.addRow(['', '', '', '', x[0] + ':', x[1]]); r.getCell(5).font = { bold: true }; r.getCell(6).font = { bold: true };
    });
    [6, 18, 16, 28, 32, 8, 8, 14, 13, 22].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    const nama = 'Rekap_Nilai_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    saveAs(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nama);
    UI.ok('Ekspor berhasil: ' + nama);
  },
  cetakHasil() {
    const l = Admin.data.hasil;
    if (!l || !l.length) return Swal.fire('Info', 'Tidak ada data untuk dicetak.', 'info');
    const w = window.open('', '_blank');
    if (!w) return UI.err('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.');
    w.document.write(`<html><head><title>Rekap Nilai</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#1E40AF;text-align:center;font-size:18px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th{background:#2563EB;color:#fff;padding:8px;text-align:left}td{border:1px solid #E2E8F0;padding:6px}
      tr:nth-child(even){background:#F8FAFC}p{text-align:center;font-size:11px;color:#64748B}</style></head><body>
      <h1>REKAPITULASI NILAI UJIAN — ${esc(App.setting.nama_sekolah.toUpperCase())}</h1><p>Dicetak: ${esc(new Date().toLocaleString('id-ID'))}</p>
      <table><tr><th>No</th><th>Nama</th><th>Username</th><th>Ujian</th><th>Nilai</th><th>Status</th><th>Pelanggaran</th><th>Waktu</th></tr>
      ${l.map((h, i) => `<tr><td>${i + 1}</td><td>${esc(h.nama)}</td><td>${esc(h.username)}</td><td>${esc(h.nama_ujian)}</td><td><b>${h.nilai}</b></td><td>${h.lulus ? 'Lulus' : 'Belum Lulus'}</td><td>${h.pelanggaran}</td><td>${esc(fmtDate(h.waktu_selesai))}</td></tr>`).join('')}
      </table></body></html>`);
    w.document.close(); w.print();
  },

  // ============================================================
  // ANALISIS SOAL (data semua ujian sudah ada di browser → ganti ujian instan)
  // ============================================================
  renderAnalisis() {
    if (!$('analisisIsi')) return;
    const d = Admin.data.analisis[$('fAnalisis').value];
    if (!d) { $('analisisIsi').innerHTML = '<p class="text-slate-400 italic">Belum ada data.</p>'; return; }
    const tone = { Mudah: 'b-green', Sedang: 'b-amber', Sulit: 'b-red' };
    const cel = (b, k) => `<td class="text-center ${b.kunci === k ? 'font-bold text-emerald-600 bg-emerald-50' : ''}">${b[k]}</td>`;
    const rows = d.butir.map(b => `<tr><td>${b.nomor}</td><td class="max-w-sm">${esc(b.pertanyaan) || '<i class="text-slate-400">(hanya gambar)</i>'}${b.ada_gambar ? ' <span class="badge b-blue">🖼️</span>' : ''}</td>
      <td class="font-bold uppercase text-emerald-600">${esc(b.kunci)}</td>${cel(b, 'a')}${cel(b, 'b')}${cel(b, 'c')}${cel(b, 'd')}<td class="text-center text-slate-400">${b.kosong}</td>
      <td style="min-width:120px"><div class="flex items-center gap-2"><div class="flex-1 bg-slate-100 rounded h-2"><div class="h-2 rounded ${b.persen >= 70 ? 'bg-emerald-500' : b.persen >= 30 ? 'bg-amber-500' : 'bg-rose-500'}" style="width:${b.persen}%"></div></div><b class="text-xs">${b.persen}%</b></div></td>
      <td><span class="badge ${tone[b.tingkat]}">${b.tingkat}</span></td></tr>`);
    $('analisisIsi').innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">${statCard('Peserta', d.jumlah_peserta, 'blue')}${statCard('Rata-rata', d.rata, 'green')}${statCard('KKM', d.kkm, 'slate')}${statCard('Lulus', d.persen_lulus + '%', 'amber')}</div>
      <p class="text-xs text-slate-500 mb-2">Kolom A–D = jumlah peserta yang memilih opsi tersebut (hijau = kunci). Tingkat: Mudah ≥ 70% benar, Sedang 30–69%, Sulit &lt; 30%. Soal yang terlalu sulit atau sebaran jawabannya janggal layak ditinjau ulang.</p>` +
      tabel(['No', 'Pertanyaan', 'Kunci', 'A', 'B', 'C', 'D', 'Kosong', '% Benar', 'Tingkat'], rows, 'Belum ada soal pada ujian ini.');
  },

  // ============================================================
  // LOG PELANGGARAN
  // ============================================================
  renderLog() {
    if (!$('logIsi')) return;
    const f = $('fLog').value;
    const l = Admin.data.logTampil = Admin.data.log.filter(x => !f || x.id_ujian === f);
    const rows = l.map((x, i) => `<tr><td class="text-xs text-slate-500">${fmtDate(x.timestamp)}</td><td class="font-medium">${esc(x.nama)}<br><span class="text-xs text-slate-400">${esc(x.username)}</span></td>
      <td>${esc(x.id_ujian)}</td><td><span class="badge ${x.total >= 5 ? 'b-red' : 'b-amber'}">${x.total}</span></td><td><button class="btn-gray btn-xs" onclick="Admin.detailLog(${i})">Lihat detail</button></td></tr>`);
    $('logIsi').innerHTML = tabel(['Waktu', 'Peserta', 'Ujian', 'Pelanggaran', 'Detail'], rows, 'Tidak ada catatan pelanggaran.');
  },
  detailLog(i) {
    const l = (Admin.data.logTampil || [])[i]; if (!l) return;
    Swal.fire({ title: 'Detail Pelanggaran', confirmButtonColor: '#2563EB', width: '600px',
      html: `<p class="text-sm text-slate-600 mb-3">${esc(l.nama)} &middot; ${esc(l.id_ujian)} &middot; total <b>${l.total}</b></p><ul class="text-left text-sm space-y-1 max-h-72 overflow-y-auto">${
        l.detail.length ? l.detail.map(x => `<li class="border-b pb-1"><span class="text-xs text-slate-400">${fmtDate(x.time)}</span><br>${esc(x.message)}</li>`).join('') : '<li class="text-slate-400 italic">Tidak ada rincian.</li>'}</ul>` });
  },

  // ============================================================
  // PENGGUNA
  // ============================================================
  renderUsers() {
    if (!$('userTabel')) return;
    const role = $('fUserRole').value, cari = $('fUserCari').value.toLowerCase().trim();
    const l = Admin.data.users.filter(u => (!role || u.role === role) && (!cari || (u.nama_lengkap + ' ' + u.username).toLowerCase().includes(cari)));
    const rows = l.slice(0, 300).map((u, i) => `<tr><td class="text-slate-500">${i + 1}</td><td class="font-mono text-sm">${esc(u.username)}</td><td class="font-medium">${esc(u.nama_lengkap)}</td>
      <td>${u.role === 'admin' ? '<span class="badge b-blue">ADMIN</span>' : '<span class="badge b-slate">PESERTA</span>'}</td>
      <td>${u.aktif === 'Ya' ? '<span class="badge b-green">Aktif</span>' : '<span class="badge b-red">Nonaktif</span>'}</td><td>${u.selesai}</td>
      <td class="whitespace-nowrap"><button class="btn-gray btn-xs" onclick="Admin.formUser('${esc(u.id_user)}')">Edit</button>
        <button class="btn-gray btn-xs" onclick="Admin.resetUser('${esc(u.id_user)}')">Reset Password</button>
        <button class="btn-red btn-xs" onclick="Admin.hapusUser('${esc(u.id_user)}')">Hapus</button></td></tr>`);
    $('userTabel').innerHTML = `<p class="text-xs text-slate-500 mb-2">${l.length} pengguna${l.length > 300 ? ' (menampilkan 300 pertama — gunakan filter)' : ''}</p>` +
      tabel(['No', 'Username', 'Nama Lengkap', 'Peran', 'Status', 'Ujian Selesai', 'Aksi'], rows, 'Belum ada pengguna.');
  },
  async muatUlangUsers() {
    const r = await api('users.list');
    if (!r.success) return UI.err(r.message);
    Data.put('users.list', r.data); Admin.data.users = r.data.users; Data.basi('admin.dashboard');
    Admin.renderUsers();
  },
  formUser(idUser) {
    const u = idUser ? Admin.data.users.find(x => x.id_user === idUser) : null;
    Modal.open(u ? 'Edit Pengguna' : 'Tambah Pengguna Baru',
      `<div class="space-y-3">
        <div><label class="lbl">Username ${u ? '(tidak dapat diubah)' : '(3–30 karakter: huruf, angka, . _ -)'}</label><input id="fuUser" class="inp" maxlength="30" value="${esc(u ? u.username : '')}" ${u ? 'disabled' : ''}></div>
        <div><label class="lbl">Nama lengkap</label><input id="fuNama" class="inp" maxlength="100" value="${esc(u ? u.nama_lengkap : '')}"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="lbl">Peran</label><select id="fuRole" class="inp"><option value="peserta" ${!u || u.role === 'peserta' ? 'selected' : ''}>Peserta</option><option value="admin" ${u && u.role === 'admin' ? 'selected' : ''}>Admin</option></select></div>
          <div><label class="lbl">Status</label><select id="fuAktif" class="inp"><option value="Ya" ${!u || u.aktif === 'Ya' ? 'selected' : ''}>Aktif</option><option value="Tidak" ${u && u.aktif === 'Tidak' ? 'selected' : ''}>Nonaktif</option></select></div></div>
        <div><label class="lbl">${u ? 'Password baru (kosongkan jika tidak diubah)' : 'Password (minimal 6 karakter)'}</label><input id="fuPass" type="password" autocomplete="new-password" class="inp"></div></div>`,
      { lebar: 'max-w-lg', simpan: async () => {
        const r = await api('users.simpan', { id_user: idUser || '', username: u ? u.username : $('fuUser').value, nama_lengkap: $('fuNama').value, role: $('fuRole').value, aktif: $('fuAktif').value, password: $('fuPass').value });
        if (!r.success) { UI.err(r.message); return false; }
        const L = Admin.data.users, i = L.findIndex(x => x.id_user === r.data.user.id_user);
        if (i >= 0) L[i] = Object.assign({}, L[i], r.data.user); else L.push(r.data.user);
        Data.basi('admin.dashboard'); Data.simpan(); Admin.renderUsers();
        UI.ok(r.message);
        return true;
      } });
  },
  async resetUser(idUser) {
    const u = Admin.data.users.find(x => x.id_user === idUser); if (!u) return;
    if (!(await UI.yakin('Reset password?', `Password <b>${esc(u.username)}</b> akan diganti dengan password acak baru dan pengguna dikeluarkan dari semua perangkat.`, 'Ya, Reset', true))) return;
    UI.loading('Mereset...');
    const r = await api('users.reset', { id_user: idUser });
    UI.close();
    if (!r.success) return UI.err(r.message);
    Swal.fire({ icon: 'success', title: 'Password Baru', confirmButtonColor: '#2563EB',
      html: `<p class="text-sm text-slate-600">Username: <b>${esc(r.data.username)}</b></p><p class="text-3xl font-mono font-bold my-3 select-all">${esc(r.data.password)}</p>
        <p class="text-xs text-rose-600">Catat sekarang — password ini hanya ditampilkan sekali. Minta pengguna menggantinya setelah login.</p>` });
  },
  async hapusUser(idUser) {
    const L = Admin.data.users, u = L.find(x => x.id_user === idUser); if (!u) return;
    if (!(await UI.yakin('Hapus pengguna?', `Akun <b>${esc(u.username)}</b> akan dihapus permanen.`, 'Ya, Hapus', true))) return;
    const pulih = Admin.cadang(L);
    L.splice(L.findIndex(x => x.id_user === idUser), 1);
    Data.basi('admin.dashboard'); Data.simpan(); Admin.renderUsers(); UI.ok('Pengguna dihapus');
    const r = await api('users.hapus', { id_user: idUser });
    if (!r.success) { pulih(); Data.simpan(); Admin.renderUsers(); UI.err(r.message, 'Gagal menghapus — dikembalikan'); }
  },
  async templateUser() {
    await Admin.unduhXlsx('Template_Import_Peserta.xlsx', 'Template Peserta', [
      ['username', 'password', 'nama_lengkap', 'role'],
      ['siswa001', 'GantiSandi1', 'Nama Siswa Pertama', 'peserta'],
      ['siswa002', 'GantiSandi2', 'Nama Siswa Kedua', 'peserta']], [16, 16, 32, 12]);
    UI.ok('Template diunduh');
  },
  importUser() {
    Modal.open('Import Peserta dari Excel / CSV',
      `<p class="text-sm text-slate-600 mb-3">Kolom: <b>username, password, nama_lengkap, role</b> (role opsional, default peserta). Password disimpan dalam bentuk hash. Proses dikirim bertahap — mohon tunggu hingga selesai.</p>
       <input type="file" id="impFile" accept=".xlsx,.xls,.csv" class="inp">`,
      { lebar: 'max-w-lg', label: 'Import Sekarang', simpan: Admin.prosesImportUser });
  },
  async prosesImportUser() {
    const f = $('impFile').files[0];
    if (!f) { UI.err('Pilih file terlebih dahulu.'); return false; }
    let d; try { d = await Admin.bacaExcel(f); } catch (e) { UI.err(e.message); return false; }
    const hilang = ['username', 'password', 'nama_lengkap'].filter(k => !d.head.includes(k));
    if (hilang.length) { UI.err('Kolom wajib tidak ditemukan: ' + hilang.join(', ')); return false; }
    if (d.rows.length > 300) { UI.err('Maksimal 300 pengguna per file.'); return false; }
    d.rows.forEach((r, i) => { r.__baris = i + 2; });
    let ok = 0; const gal = [];
    for (let i = 0; i < d.rows.length; i += 25) {
      Swal.fire({ title: 'Mengimpor pengguna...', html: `${Math.min(i + 25, d.rows.length)} / ${d.rows.length}`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const r = await api('users.import', { rows: d.rows.slice(i, i + 25) });
      if (!r.success) { UI.close(); await UI.err(r.message); break; }
      ok += r.data.imported; (r.data.errors || []).forEach(x => gal.push(x));
    }
    Admin.muatUlangUsers();
    await Swal.fire({ icon: gal.length ? 'warning' : 'success', title: 'Hasil Import', confirmButtonColor: '#2563EB',
      html: `<p>Berhasil menambahkan <b>${ok}</b> pengguna.</p>${gal.length ? `<p class="text-amber-600 text-sm mt-2">${gal.length} baris dilewati:</p><ul class="text-xs text-left list-disc ml-5 max-h-40 overflow-y-auto">${gal.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` });
    return true;
  },

  // ============================================================
  // PENGATURAN
  // ============================================================
  async simpanSetting(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Menyimpan...';
    const r = await api('setting.simpan', { nama_sekolah: $('sNama').value, max_pelanggaran: $('sMaks').value, tampil_pembahasan: $('sTampil').value });
    btn.disabled = false; btn.textContent = 'Simpan Pengaturan';
    if (!r.success) return UI.err(r.message);
    const s = r.data.setting;
    Data.put('setting.get', { setting: s });
    App.setting = { nama_sekolah: s.nama_sekolah, max_pelanggaran: parseInt(s.max_pelanggaran), tampil_pembahasan: s.tampil_pembahasan !== 'Tidak' };
    Sesi.simpanSetting(App.setting); App.setNama(App.setting.nama_sekolah);
    UI.ok(r.message);
  }
};
