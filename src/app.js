/* Arayüz ve oyun akışı. */
(function (global) {
  'use strict';

  var tr = global.KB.tr, motor = global.KB.motor, kelimeler = global.KB.kelimeler;

  /* Bir hata olursa sessizce bos ekranla kalma; ne oldugunu goster. */
  window.addEventListener('error', function (o) {
    var kutu = document.getElementById('hata');
    if (!kutu) { return; }
    kutu.hidden = false;
    kutu.textContent = 'Hata: ' + (o.message || o.error) +
      '  (' + String(o.filename || '').split('/').pop() + ':' + o.lineno + ')';
  });

  var HAK = 8;
  var UZUNLUK = 5;              // her seviyede kelime 5 harfli; değişen şey kurallar

  /* Iki seviye. Standart'ta ayni harf iki kez gecmez - bu kural hem gizli
   * kelimeyi hem de girilebilecek tahminleri baglar. Ileri'de kural yok. */
  var ZORLUKLAR = {
    standart: { ad: 'Standart', tekrarsiz: true  },
    ileri:    { ad: 'İleri',    tekrarsiz: false }
  };

  var NOT_SINIF = ['', 'not-kirmizi', 'not-sari', 'not-yesil'];
  var TUS_SINIF = ['', 'not-yok', 'not-belki', 'not-var'];

  var $ = function (s) { return document.querySelector(s); };

  var S = null;       // aktif oyun durumu
  var sozluk = null;  // aktif uzunluk için { cozum, gecerli }
  var havuz = null;   // gizli kelime havuzu (zorluğa göre süzülmüş)
  var hataliSatir = false;

  /* Kart çevirme animasyonu: hangi satırın rozetleri döndürülecek (-1 = yok),
   * perde açılışında bütün harfler döndürülecek mi, kartlar arası gecikme. */
  var cevrilecekSatir = -1;
  var aciklaAnim = false;
  var KART_GECIKME = 140;    // ms, rozet kartlari arasindaki fark
  var ACILIS_GECIKME = 150;  // ms, perde acilisinda SATIRLAR arasi fark
  var KART_SURE = 460;       // ms, tek bir kartin donus suresi (CSS ile ayni)
  var OYUN_SONU_SURE = 2000; // ms, oyun bitisinden istatistik penceresine kadar

  /* ---------- depolama ---------- */

  function oku(anahtar, varsayilan) {
    try {
      var ham = localStorage.getItem(anahtar);
      return ham ? JSON.parse(ham) : varsayilan;
    } catch (e) { return varsayilan; }
  }

  function yaz(anahtar, deger) {
    try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch (e) { /* kota dolabilir */ }
  }

  /* Arsivde oynanan gun, o gunun gunluk bulmacasinin ta kendisidir: ayni kelime,
   * ayni ilerleme. Bu yuzden oyun kaydi moda degil tarihe baglanir. */
  function oyunAnahtari(mod, zorluk, tarih) {
    return mod === 'serbest'
      ? 'kelime500.oyun.serbest.' + zorluk
      : 'kelime500.oyun.gunluk.' + zorluk + '.' + tarih;
  }

  function istAnahtari(mod, zorluk) { return 'kelime500.ist.' + mod + '.' + zorluk; }

  function bosIstatistik() {
    return { oynanan: 0, kazanilan: 0, seri: 0, enIyiSeri: 0, dagilim: {} };
  }

  function bugun() {
    var d = new Date();
    return [d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')].join('-');
  }

  function dun() { return gunEkle(bugun(), -1); }

  /* Arsivde en ileri gidilebilecek gun dundur; bugune donus yok. */
  /* Oyunun yayina alindigi gun. Arsiv bundan oncesine gidemez - yoksa hic
   * yayimlanmamis gunler oynanabiliyordu (1990, hatta 1000 yili gibi).
   * Yayin tarihi degisirse burasi guncellenir. */
  var YAYIN = '2026-08-31';

  function enGecTarih(mod) { return mod === 'arsiv' ? dun() : bugun(); }
  function enErkenTarih(mod) { return mod === 'arsiv' ? YAYIN : bugun(); }

  /* Arsivde oynanabilir gun var mi? Yayin gununde henuz yok. */
  function arsivVarMi() { return dun() >= YAYIN; }

  function tarihSinirla(tarih, mod) {
    var enGec = enGecTarih(mod), enErken = enErkenTarih(mod);
    if (tarih > enGec) { return enGec; }
    if (tarih < enErken) { return enErken; }
    return tarih;
  }

  /* ---------- oyun kurulumu ---------- */

  /* Zorlugun kurallarina gore gizli kelime havuzu. */
  function havuzKur(cozum, zorluk) {
    var z = ZORLUKLAR[zorluk];
    var h = cozum.filter(function (k) {
      return !z.tekrarsiz || motor.tekrarsiz(k);
    });
    return h.length ? h : cozum.slice();
  }

  /* Gunun kelimesi iki havuzu birlikte ister: motor, ayni gun iki seviyenin
   * ayni kelimeyi vermemesini bu sayede garanti ediyor. */
  function gununKelimesi(cozum, tarih, zorluk) {
    return motor.gunlukKelime({
      standart: havuzKur(cozum, 'standart'),
      ileri: havuzKur(cozum, 'ileri')
    }, tarih, zorluk);
  }

  function yeniOyun(mod, zorluk, tarih, zorla) {
    if (!ZORLUKLAR[zorluk]) { zorluk = 'standart'; }
    var z = ZORLUKLAR[zorluk];
    sozluk = kelimeler.al(UZUNLUK);
    havuz = havuzKur(sozluk.cozum, zorluk);

    var kayitli = zorla ? null : oku(oyunAnahtari(mod, zorluk, tarih), null);

    if (kayitli && kayitli.gizli && kayitli.gizli.length === UZUNLUK) {
      S = kayitli;
      S.tusNot = S.tusNot || {};
      S.acikla = !!S.acikla;
    } else {
      S = {
        gizli: mod === 'gunluk' ? gununKelimesi(sozluk.cozum, tarih, zorluk)
                                : motor.rastgeleKelime(havuz),
        gecmis: [], notlar: {}, tusNot: {}, bitti: false, kazandi: false,
        kayitli: false, acikla: false
      };
    }

    S.mod = mod; S.zorluk = zorluk; S.tarih = tarih;
    S.girdi = []; S.imlec = 0;
    hataliSatir = false;
    cevrilecekSatir = -1;
    aciklaAnim = false;
    cevabiGoster = !!(S.bitti && !S.kazandi);
    ciz();
  }

  function kaydet() {
    yaz(oyunAnahtari(S.mod, S.zorluk, S.tarih), {
      gizli: S.gizli, gecmis: S.gecmis, notlar: S.notlar, tusNot: S.tusNot,
      bitti: S.bitti, kazandi: S.kazandi, kayitli: S.kayitli,
      acikla: S.acikla
    });
  }

  /* ---------- girdi ---------- */

  function uzunluk() { return UZUNLUK; }

  /* Aktif satır tamamen doldurulmuşsa girilen kelimeyi döndürür; taslak
   * hâldeyse (eksik harf veya '·' varsa) null. */
  function aktifKelime() {
    var n = uzunluk(), t = '';
    for (var i = 0; i < n; i++) {
      if (!S.girdi[i] || S.girdi[i] === '_') { return null; }
      t += S.girdi[i];
    }
    return t;
  }

  /* Enter'a basmadan, kelime tamamlanır tamamlanmaz sözlükte olmadığını
   * gösterebilmek için: satır kırmızı ve üstü çizili çizilir. */
  function gecersizGirdi() {
    var t = aktifKelime();
    return t !== null && sozluk.gecerli.indexOf(t) === -1;
  }

  function harfYaz(h) {
    if (S.bitti || S.imlec >= uzunluk()) { return; }
    hataliSatir = false;
    S.girdi[S.imlec] = h;
    S.imlec++;
    ciz();
  }

  function atla() {                    // boşluk: bilinmeyen harfin yerini boş bırak
    if (S.bitti || S.imlec >= uzunluk()) { return; }
    hataliSatir = false;
    S.girdi[S.imlec] = '_';
    S.imlec++;
    ciz();
  }

  function sil() {
    if (S.bitti) { return; }
    hataliSatir = false;
    if (S.imlec > 0) { S.imlec--; S.girdi[S.imlec] = undefined; }
    ciz();
  }

  function gonder() {
    if (S.bitti) { return; }
    var n = uzunluk(), t = aktifKelime();
    if (t === null) { return uyar('Kelimeyi tamamla', false, undefined, true); }
    if (sozluk.gecerli.indexOf(t) === -1) { return uyar('Kelime listede yok', true); }
    if (S.gecmis.some(function (g) { return g.tahmin === t; })) { return uyar('Bunu zaten denedin', true); }

    /* Standart'ta harf tekrari kisiti tahminleri de baglar. */
    var z = ZORLUKLAR[S.zorluk];
    if (z.tekrarsiz && !motor.tekrarsiz(t)) {
      return uyar('Standart seviyede aynı harf iki kez kullanılamaz', true);
    }

    var p = motor.puanla(t, S.gizli);
    S.gecmis.push({ tahmin: t, yer: p.yer, harf: p.harf, yok: p.yok });
    S.girdi = []; S.imlec = 0;
    cevrilecekSatir = S.gecmis.length - 1;      // yeni satırın rozetleri dönsün

    if (p.yer === n) { bitir(true); }
    else if (S.gecmis.length >= HAK) { bitir(false); }
    else { kaydet(); ciz(); }
  }

  function bitir(kazandi) {
    S.bitti = true;
    S.kazandi = kazandi;
    kaydet();
    if (!S.kayitli) {
      istatistikGuncelle(kazandi, S.gecmis.length);
      S.kayitli = true;
    }
    /* Kazanilsa da kaybedilse de ayni akis: dogru cevap duyurulur ve ayni anda
     * butun tahminlerdeki harfler gercek renklerine doner. Iki saniye sonra
     * istatistik penceresi acilir. */
    uyar(kazandi ? 'Doğru! ' + S.gizli + ' · ' + S.gecmis.length + '/' + HAK
                 : 'Kelime: ' + S.gizli, false, OYUN_SONU_SURE);
    perdeyiAc();

    /* Kaybedilen oyunda gizli kelime ustteki etikette yazili kalir; istatistik
     * penceresi kapatildiginda oyuncu onu orada bulur. Etiket, bildirim
     * kaybolurken yaziliyor - ikisi ayni anda gorunurse ayni kelime ust uste
     * iki kez ifsa edilmis oluyordu. Kazanilan oyunda gerek yok: son satir
     * zaten dogru cevap. Bir olaya baglamiyoruz, cunku pencerenin 'close'
     * olayi her ortamda tetiklenmiyor. */
    setTimeout(function () {
      if (!kazandi) { cevabiGoster = true; modYaz(); }
      istatistikGoster();
    }, OYUN_SONU_SURE);
  }

  /* Oyun kazanılınca bütün tahminlerdeki harflerin gerçek rengini açar. */
  function perdeyiAc() {
    S.acikla = true;
    aciklaAnim = true;
    kaydet();
    ciz();
  }

  function istatistikGuncelle(kazandi, denemeSayisi) {
    var a = istAnahtari(S.mod, S.zorluk), ist = oku(a, bosIstatistik());
    ist.oynanan++;
    if (kazandi) {
      ist.kazanilan++;
      ist.seri++;
      ist.enIyiSeri = Math.max(ist.enIyiSeri, ist.seri);
      ist.dagilim[denemeSayisi] = (ist.dagilim[denemeSayisi] || 0) + 1;
    } else {
      ist.seri = 0;
    }
    yaz(a, ist);
  }

  /* ---------- çizim ---------- */

  function ciz() {
    var n = uzunluk(), tahta = $('#tahta');
    tahta.innerHTML = '';
    tahta.classList.toggle('oyun-bitti', !!S.bitti);
    var kesinYok = motor.kesinYokHarfler(S.gecmis);
    var cevrilecek = [];

    /* Perde açıldıysa her tahmindeki harflerin gerçek renkleri hesaplanır. */
    var gercekRenkler = S.acikla
      ? S.gecmis.map(function (g) { return motor.harfRenkleri(g.tahmin, S.gizli); })
      : null;

    for (var r = 0; r < HAK; r++) {
      var gonderildi = r < S.gecmis.length;
      var aktif = !S.bitti && r === S.gecmis.length;

      var satir = document.createElement('div');
      satir.className = 'satir' + (gonderildi ? ' gonderildi' : '') +
                        (aktif && hataliSatir ? ' hatali' : '') +
                        (aktif && !hataliSatir && gecersizGirdi() ? ' gecersiz' : '');

      var sifirla = document.createElement('button');
      sifirla.type = 'button';
      sifirla.className = 'satir-sifirla';
      if (gonderildi && !S.bitti) {
        sifirla.textContent = '↺';
        sifirla.title = 'Bu satırın notlarını sıfırla';
        sifirla.dataset.r = r;
      } else {
        sifirla.className += ' bos';
        sifirla.tabIndex = -1;
        sifirla.disabled = true;
      }
      satir.appendChild(sifirla);

      for (var c = 0; c < n; c++) {
        var kutu = document.createElement('div');
        kutu.className = 'kutu';
        if (gonderildi) {
          var harf = S.gecmis[r].tahmin[c];
          if (S.acikla) {
            /* Perde açıldı: harflerin gerçek renkleri gösteriliyor. Kart iki
             * yüzlü kurulur, ön yüzde oyuncunun son gördüğü hâli durur. */
            var gercek = gercekRenkler[r][c];
            var onSinif = kesinYok[harf] ? 'not-kirmizi' : (NOT_SINIF[S.notlar[r + ':' + c] || 0] || '');
            kutu.className = 'kutu dolu cevrilir';
            kutu.innerHTML =
              '<div class="kutu-ic">' +
                '<div class="kutu-yuz on ' + onSinif + '">' + harf + '</div>' +
                '<div class="kutu-yuz arka ' + NOT_SINIF[gercek] + '">' + harf + '</div>' +
              '</div>';
            /* Perde acilisinda sira satir numarasi: bir satirin harfleri
             * birlikte, satirlar sirayla doner. */
            if (aciklaAnim) { cevrilecek.push({ el: kutu, sira: r }); }
            else { kutu.classList.add('cevrik'); }
          } else {
            kutu.textContent = harf;
            kutu.classList.add('dolu');
            if (kesinYok[harf]) {
              kutu.classList.add('not-kirmizi');
              kutu.title = 'Kesin: bu harf kelimede yok';
            } else {
              var not = S.notlar[r + ':' + c] || 0;
              if (not) { kutu.classList.add(NOT_SINIF[not]); }
              kutu.title = 'Not almak için tıkla';
            }
            kutu.dataset.r = r; kutu.dataset.c = c;
          }
        } else if (aktif) {
          var h = S.girdi[c];
          kutu.textContent = h === '_' ? '·' : (h || '');
          if (h && h !== '_') { kutu.classList.add('dolu'); }
          if (h === '_') { kutu.classList.add('atla'); }
          if (c === S.imlec && !hataliSatir) { kutu.classList.add('imlec'); }
        }
        satir.appendChild(kutu);
      }

      /* Puan rozetleri: tahmin gönderilmeden önce boş kartlar durur, gönderilince
       * kartlar dikey eksende dönüp arka yüzlerindeki sayıları gösterir. */
      var rozetler = document.createElement('div');
      rozetler.className = 'rozetler' + (gonderildi ? '' : ' bos');
      var g = S.gecmis[r];
      ['yer', 'harf', 'yok'].forEach(function (tur, i) {
        var baslik = { yer: 'Doğru harf, doğru yerde', harf: 'Kelimede var, yeri yanlış',
                       yok: 'Kelimede hiç yok' }[tur];
        var kart = document.createElement('div');
        kart.className = 'rozet ' + tur + ' cevrilir';
        kart.title = baslik;
        kart.innerHTML =
          '<div class="rozet-ic">' +
            '<div class="rozet-yuz on"></div>' +
            '<div class="rozet-yuz arka">' + (g ? g[tur] : '') + '</div>' +
          '</div>';
        if (gonderildi) {
          if (r === cevrilecekSatir) { cevrilecek.push({ el: kart, sira: i }); }
          else { kart.classList.add('cevrik'); }
        }
        rozetler.appendChild(kart);
      });
      satir.appendChild(rozetler);
      tahta.appendChild(satir);
    }

    /* Yeni oluşturulan kartlar çevrilmemiş hâlde eklendi; bir sonraki karede
     * 'cevrik' sınıfı verilince CSS geçişi tetiklenir ve kartlar sırayla döner.
     * Gecikme, geçişin tanımlı olduğu İÇ öğeye yazılır: dış kapsayıcıda
     * transition yok, oraya yazılan transition-delay hiçbir işe yaramaz. */
    if (cevrilecek.length) {
      var gecikme = aciklaAnim ? ACILIS_GECIKME : KART_GECIKME;
      var basla = function () {
        cevrilecek.forEach(function (o) {
          if (o.el.classList.contains('cevrik')) { return; }
          var ic = o.el.firstElementChild;
          if (ic) { ic.style.transitionDelay = (o.sira * gecikme) + 'ms'; }
          o.el.classList.add('cevrik');
        });
      };
      /* Iki kare beklemek gecisin duzgun baslamasini saglar. Sekme arka planda
       * ise requestAnimationFrame hic calismaz; o durumda kartlar donmemis
       * kalmasin diye zamanlayici yedegi var (islev tekrar cagrilabilir). */
      requestAnimationFrame(function () { requestAnimationFrame(basla); });
      setTimeout(basla, 80);
    }
    cevrilecekSatir = -1;
    aciklaAnim = false;

    tuslariBoya();
    modYaz();
  }

  /* Simdiye kadar herhangi bir tahminde kullanilmis harfler - klavyede
   * koyu gri olarak isaretlenir, kullanicinin kendi notu varsa o oncelikli. */
  function kullanilanHarfler(gecmis) {
    var s = Object.create(null);
    gecmis.forEach(function (g) {
      g.tahmin.split('').forEach(function (h) { s[h] = true; });
    });
    return s;
  }

  function tuslariBoya() {
    var kullanilan = kullanilanHarfler(S.gecmis);
    Array.prototype.forEach.call(document.querySelectorAll('.tus[data-harf]'), function (b) {
      b.classList.remove('not-yok', 'not-belki', 'not-var', 'kullanilmis');
      var d = S.tusNot[b.dataset.harf] || 0;
      if (d) { b.classList.add(TUS_SINIF[d]); }
      else if (kullanilan[b.dataset.harf]) { b.classList.add('kullanilmis'); }
    });
  }

  var bildirimZaman = null, hataZaman = null;
  /* satirBoya: satiri gecici kirmizi yapar. salla: satiri sallar.
   * Bilgi amacli mesajlarda (not temizleme, yeni kelime, sonuc kopyalandi)
   * sallama olmaz - yalnizca gercek hatalarda. */
  function uyar(metin, satirBoya, sure, salla) {
    var b = $('#bildirim');
    b.textContent = metin;
    b.classList.add('gorunur');
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(function () { b.classList.remove('gorunur'); }, sure || 1600);

    if (satirBoya) { hataliSatir = true; ciz(); }
    if (satirBoya || salla) {
      var satir = document.querySelectorAll('.satir')[S.gecmis.length];
      if (satir) {
        satir.classList.remove('sallan');
        void satir.offsetWidth;
        satir.classList.add('sallan');
      }
    }
    if (satirBoya) {
      clearTimeout(hataZaman);
      hataZaman = setTimeout(function () { hataliSatir = false; ciz(); }, 1100);
    }
  }

  /* ---------- klavye ---------- */

  function tus(etiket, sinif, islev, baslik) {
    var b = document.createElement('button');
    b.className = 'tus' + (sinif ? ' ' + sinif : '');
    b.textContent = etiket;
    b.type = 'button';
    if (baslik) { b.title = baslik; }
    b.addEventListener('click', islev);
    return b;
  }

  function harfTusu(h) {
    var b = tus(h, '', function () { harfYaz(h); },
                h + ' · sağ tıkla (veya basılı tut) not al');
    b.dataset.harf = h;
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); tusNotu(h); });
    var zaman = null;
    b.addEventListener('touchstart', function () {
      zaman = setTimeout(function () { tusNotu(h); }, 450);
    }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(function (o) {
      b.addEventListener(o, function () { clearTimeout(zaman); });
    });
    return b;
  }

  function tusNotu(h) {
    S.tusNot[h] = ((S.tusNot[h] || 0) + 1) % 4;   // yok · elendi · belki · var
    kaydet();
    tuslariBoya();
    modYaz();
  }

  function klavyeKur() {
    var k = $('#klavye');
    k.innerHTML = '';
    tr.KLAVYE.forEach(function (satirHarfleri, i) {
      var d = document.createElement('div');
      d.className = 'klavye-satir';
      satirHarfleri.forEach(function (h) { d.appendChild(harfTusu(h)); });
      if (i === 2) { d.appendChild(tus('⌫', 'genis', sil, 'Sil')); }
      k.appendChild(d);
    });

    var son = document.createElement('div');
    son.className = 'klavye-satir';
    son.appendChild(tus('◫', '', notlariTemizle, 'Notları temizle'));
    son.appendChild(tus('boşluk', 'genis', atla, 'Bilinmeyen harfi atla'));
    son.appendChild(tus('✓', 'genis', gonder, 'Gönder'));
    k.appendChild(son);
  }

  function notlariTemizle() {
    S.notlar = {}; S.tusNot = {};
    kaydet();
    ciz();
    uyar('Notlar temizlendi');
  }

  function fizikselKlavye(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }
    if (document.querySelector('dialog[open]')) { return; }
    if (e.key === 'Enter') { e.preventDefault(); return gonder(); }
    if (e.key === 'Backspace') { e.preventDefault(); return sil(); }
    if (e.key === ' ') { e.preventDefault(); return atla(); }
    if (e.key.length !== 1) { return; }
    var h = tr.buyut(e.key);
    if (tr.ALFABE.indexOf(h) !== -1) { e.preventDefault(); harfYaz(h); }
  }

  function notTikla(e) {
    var kutu = e.target.closest('.kutu');
    if (!kutu || kutu.dataset.r === undefined) { return; }
    var r = Number(kutu.dataset.r), c = Number(kutu.dataset.c);
    var harf = S.gecmis[r].tahmin[c];
    if (motor.kesinYokHarfler(S.gecmis)[harf]) { return; }   // kesin kırmızı değiştirilemez
    var anahtar = kutu.dataset.r + ':' + kutu.dataset.c;
    S.notlar[anahtar] = ((S.notlar[anahtar] || 0) + 1) % 4;
    kaydet();
    ciz();
  }

  /* Bir satırın manuel notlarını temizler; o satırda kesin-yok kuralıyla
   * zorla kırmızı olan hücreler bundan etkilenmez. */
  function satirSifirla(r) {
    if (!S.gecmis[r]) { return; }
    var kesinYok = motor.kesinYokHarfler(S.gecmis);
    for (var c = 0; c < uzunluk(); c++) {
      if (kesinYok[S.gecmis[r].tahmin[c]]) { continue; }
      delete S.notlar[r + ':' + c];
    }
    kaydet();
    ciz();
  }

  function tahtaTikla(e) {
    if (S.bitti) { return; }   /* oyun bitince not almanin anlami kalmiyor */
    var sifirlaBtn = e.target.closest('.satir-sifirla');
    if (sifirlaBtn && !sifirlaBtn.disabled) { return satirSifirla(Number(sifirlaBtn.dataset.r)); }
    notTikla(e);
  }

  /* ---------- paylaşım ---------- */

  function paylasMetni() {
    var satirlar = ['Kelime500 · ' + ZORLUKLAR[S.zorluk].ad +
                    (S.mod === 'gunluk' ? ' · ' + S.tarih : ' · serbest'),
                    (S.kazandi ? S.gecmis.length : 'X') + '/' + HAK];
    S.gecmis.forEach(function (g) {
      satirlar.push('🟩' + g.yer + ' 🟨' + g.harf + ' 🟥' + g.yok);
    });
    return satirlar.join('\n');
  }

  function paylas() {
    var metin = paylasMetni();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(metin).then(function () { uyar('Sonuç kopyalandı'); },
                                                function () { uyar(metin); });
    } else { uyar(metin); }
  }

  /* ---------- istatistik penceresi ---------- */

  var sayimZaman = null;

  function istatistikGoster() {
    var ist = oku(istAnahtari(S.mod, S.zorluk), bosIstatistik());
    var yuzde = ist.oynanan ? Math.round(ist.kazanilan / ist.oynanan * 100) : 0;

    $('#ist-baslik').textContent =
      (S.mod === 'gunluk' ? 'Günlük' : 'Serbest') + ' · ' + ZORLUKLAR[S.zorluk].ad;
    $('#ist-ozet').innerHTML =
      kart(ist.oynanan, 'oynanan') + kart(yuzde + '%', 'kazanma') +
      kart(ist.seri, 'seri') + kart(ist.enIyiSeri, 'en iyi');

    var enCok = 1, i;
    for (i = 1; i <= HAK; i++) { enCok = Math.max(enCok, ist.dagilim[i] || 0); }
    var html = '';
    for (i = 1; i <= HAK; i++) {
      var v = ist.dagilim[i] || 0;
      var son = S.bitti && S.kazandi && S.gecmis.length === i;
      html += '<div class="cubuk"><i>' + i + '</i><u class="' + (son ? 'aktif' : '') +
              '" style="width:' + Math.max(8, v / enCok * 100) + '%">' + v + '</u></div>';
    }
    $('#ist-dagilim').innerHTML = html;
    $('#ist-paylas').disabled = !S.bitti;

    geriSayim();
    clearInterval(sayimZaman);
    sayimZaman = setInterval(geriSayim, 1000);
    var pencere = $('#ist-pencere');
    istPencereKonumla(pencere);
    pencere.showModal();
  }

  /* Oyun ekranin ust yarisinda durdugu icin, ekranin tamamina gore ortalanan
   * pencere asagida kaliyordu. Genis ekranlarda pencere "ekranin ustu -
   * klavyenin alti" araliginin ortasina alinir. Dar ekranlarda (telefon)
   * oyun zaten ekrani doldurdugu icin varsayilan ortalama korunur. */
  function istPencereKonumla(pencere) {
    pencere.style.marginTop = '';
    pencere.style.marginBottom = '';
    if (window.innerWidth < 640) { return; }

    var klavye = $('#klavye');
    if (!klavye) { return; }
    var alt = klavye.getBoundingClientRect().bottom;
    if (alt <= 0 || alt >= window.innerHeight) { return; }

    /* Pencere yuksekligi acilmadan bilinmedigi icin gecici olarak olculur. */
    pencere.style.visibility = 'hidden';
    pencere.show();
    var boy = pencere.getBoundingClientRect().height;
    pencere.close();
    pencere.style.visibility = '';

    var ust = Math.round((alt - boy) / 2);
    if (ust < 12) { return; }                 /* sigmiyorsa varsayilana birak */
    pencere.style.marginTop = ust + 'px';
    pencere.style.marginBottom = 'auto';
  }

  function geriSayim() {
    var simdi = new Date();
    var yarin = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + 1);
    var kalan = Math.max(0, Math.floor((yarin - simdi) / 1000));
    var ss = String(Math.floor(kalan / 3600)).padStart(2, '0');
    var dd = String(Math.floor(kalan % 3600 / 60)).padStart(2, '0');
    var sn = String(kalan % 60).padStart(2, '0');
    $('#geri-sayim').textContent = 'Yeni günlük kelimeye ' + ss + ':' + dd + ':' + sn;
  }

  function kart(deger, etiket) {
    return '<div class="ist"><b>' + deger + '</b><span>' + etiket + '</span></div>';
  }

  /* ---------- başlangıç ---------- */

  /* Tema uygulama. yumusak=true ise sayfa capraz-gecisle doner (View
   * Transitions); destegi olmayan tarayicida ani gecer. Sayfa acilirken
   * kayitli tema animasyonsuz uygulanir. */
  var GUNES = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4.6" fill="currentColor"/>' +
    '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<path d="M12 1.9v3M12 19.1v3M1.9 12h3M19.1 12h3' +
    'M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></g></svg>';
  var AY = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path fill="currentColor" d="M21 13.2A9 9 0 1 1 10.8 3a7.2 7.2 0 0 0 10.2 10.2z"/></svg>';

  /* kaydet=true yalnizca kullanici dugmeye bastiginda verilir. Sayfa
   * acilisinda kaydetmiyoruz: yoksa ilk ziyarette cihazdan gelen deger
   * hemen kalici olur ve site cihazi takip etmeyi birakirdi. */
  function tema(deger, yumusak, kaydet) {
    function uygula() {
      document.documentElement.dataset.tema = deger;
      var d = $('#tema');
      if (d) { d.innerHTML = deger === 'acik' ? AY : GUNES; }
    }
    if (yumusak && document.startViewTransition) {
      document.startViewTransition(uygula);
    } else {
      uygula();
    }
    if (kaydet) { yaz('kelime500.tema', deger); }
  }

  function kullaniciSecti() {
    var k = oku('kelime500.tema', null);
    return k === 'acik' || k === 'koyu';
  }

  function cihazTemasi() {
    return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches
      ? 'acik' : 'koyu';
  }

  /* Ilk ziyarette cihazin tercihi, sonrasinda kullanicinin secimi. */
  function baslangicTemasi() {
    return kullaniciSecti() ? oku('kelime500.tema', 'koyu') : cihazTemasi();
  }

  /* Kullanici henuz secim yapmadiysa cihaz temasi degistikce site de uyar. */
  function cihaziIzle() {
    if (!window.matchMedia) { return; }
    var mq = matchMedia('(prefers-color-scheme: light)');
    var dinle = function () { if (!kullaniciSecti()) { tema(cihazTemasi(), true); } };
    if (mq.addEventListener) { mq.addEventListener('change', dinle); }
    else if (mq.addListener) { mq.addListener(dinle); }
  }

  function gunEkle(tarih, gun) {
    var p = tarih.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + gun);
    return [d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')].join('-');
  }

  function tarihGit(gun) {
    var hedef = gunEkle(S.tarih, gun);
    if (hedef > enGecTarih(S.mod) || hedef < enErkenTarih(S.mod)) { return; }
    $('#tarih').value = hedef;
    yaz('kelime500.tarih', hedef);
    yeniOyun(S.mod, S.zorluk, hedef);
  }

  /* Baslik satiri: hangi moddayiz, hangi gunun kelimesi.
   * Gunlukte tek bir bulmaca var (bugun), o yuzden tarih gezinmesi yalnizca arsivde. */
  var ZORLUK_ISARET = { standart: 'S', ileri: 'İ' };

  function digerZorluk() { return S.zorluk === 'standart' ? 'ileri' : 'standart'; }

  /* 2026-08-31 -> 31-08-2026 */
  function tarihYaz(t) {
    var p = String(t).split('-');
    return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : t;
  }

  /* Istatistik penceresi kapatildiktan sonra dogru cevap burada durur. */
  var cevabiGoster = false;

  function modYaz() {
    var arsiv = S.mod === 'arsiv';
    $('#tarih-nav').hidden = !arsiv;
    $('#sonraki').disabled = S.tarih >= enGecTarih(S.mod);
    $('#onceki').disabled = S.tarih <= enErkenTarih(S.mod);

    var etiket = $('#mod-etiket'), kutu = $('#kontroller');
    var bitti = S.bitti && cevabiGoster;
    kutu.classList.toggle('cevap-modu', bitti);
    if (bitti) {
      etiket.innerHTML = 'Gizli kelime: <b>' + S.gizli + '</b>';
    } else {
      var mod = arsiv ? 'Arşiv · ' + tarihYaz(S.tarih)
              : (S.mod === 'serbest' ? 'Serbest Mod' : 'Günlük');
      etiket.textContent = mod + ' · ' + ZORLUKLAR[S.zorluk].ad;
    }

    /* Zorluk dugmesi kapaliyken seviyenin rengini ve harfini tasir. */
    var zd = $('#zorluk-dugme');
    zd.dataset.zorluk = S.zorluk;
    zd.textContent = ZORLUK_ISARET[S.zorluk];
    zd.title = ZORLUKLAR[S.zorluk].ad + ' · ' + ZORLUKLAR[digerZorluk()].ad + ' seviyeye geç';

    menuIsaretle('#ana-menu', '[data-mod]', 'mod', S.mod);

    /* Kelime degistirme yalnizca serbest modda: gunlukte ve arsivde herkes
     * ayni kelimeyi oynadigi icin yenilemek anlamsiz. Ayrac her modda durur -
     * mod secimi ile islemleri ayirir, yalnizca "Yeni kelime"ye ait degil. */
    $('#menu-yeni').hidden = S.mod !== 'serbest';
  }

  function menuIsaretle(menu, secici, alan, deger) {
    Array.prototype.forEach.call($(menu).querySelectorAll(secici), function (b) {
      b.setAttribute('aria-current', b.dataset[alan] === deger ? 'true' : 'false');
    });
  }

  /* ---------- baslik acilir menuleri ---------- */

  function menuKapat() {
    Array.prototype.forEach.call(document.querySelectorAll('.acilir'), function (m) {
      m.hidden = true;
      var d = m.parentNode.querySelector('.simge');
      if (d) { d.setAttribute('aria-expanded', 'false'); }
    });
  }

  function menuAc(id, dugme) {
    var m = $(id), acik = !m.hidden;
    menuKapat();
    if (acik) { return; }
    m.hidden = false;
    dugme.setAttribute('aria-expanded', 'true');
  }

  /* Mod degistirme adres uzerinden yapilir: acilis kodu zaten tarih/zorluk
   * dogrulamasini orada yapiyor, ayni mantigi ikinci kez yazmaya gerek yok. */
  function modaGit(mod) {
    location.href = 'oyna.html?mod=' + mod + '&zorluk=' + S.zorluk;
  }

  function adresOku() {
    var p = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (parca) {
      if (!parca) { return; }
      var ikili = parca.split('=');
      p[decodeURIComponent(ikili[0])] = decodeURIComponent(ikili[1] || '');
    });
    return p;
  }

  function baslat() {
    tema(baslangicTemasi());
    cihaziIzle();
    klavyeKur();

    var p = adresOku();
    var mod = p.mod === 'serbest' ? 'serbest'
            : p.mod === 'arsiv'   ? 'arsiv'
            : 'gunluk';
    var zorluk = ZORLUKLAR[p.zorluk] ? p.zorluk : oku('kelime500.zorluk', 'standart');
    if (!ZORLUKLAR[zorluk]) { zorluk = 'standart'; }

    var tarih = p.tarih && /^\d{4}-\d{2}-\d{2}$/.test(p.tarih) ? p.tarih : enGecTarih(mod);
    if (mod === 'gunluk') { tarih = bugun(); }          // gunlukte tek bulmaca var
    if (mod === 'arsiv' && !arsivVarMi()) { mod = 'gunluk'; tarih = bugun(); }
    tarih = tarihSinirla(tarih, mod);

    var tarihGirdi = $('#tarih');
    tarihGirdi.max = enGecTarih(mod);                    // arsivde bugune donulemez
    tarihGirdi.min = enErkenTarih(mod);                  // yayin tarihinden oncesi yok
    tarihGirdi.value = tarih;
    yaz('kelime500.zorluk', zorluk);

    yeniOyun(mod, zorluk, tarih);

    document.addEventListener('keydown', fizikselKlavye);
    $('#tahta').addEventListener('click', tahtaTikla);

    tarihGirdi.addEventListener('change', function () {
      if (!this.value) { this.value = enGecTarih(S.mod); }
      this.value = tarihSinirla(this.value, S.mod);
      yaz('kelime500.tarih', this.value);
      yeniOyun(S.mod, S.zorluk, this.value);
    });

    $('#onceki').addEventListener('click', function () { tarihGit(-1); });
    $('#sonraki').addEventListener('click', function () { tarihGit(1); });

    $('#ist-paylas').addEventListener('click', paylas);

    /* --- baslik menuleri --- */
    var menuDugme = $('#menu-dugme');
    menuDugme.addEventListener('click', function (e) {
      e.stopPropagation();
      menuAc('#ana-menu', menuDugme);
    });

    /* Tek dokunusta diger seviyeye gecilir. Her seviyenin oyunu ayri
     * anahtarda kayitli oldugu icin geri donuldugunde tahminler durur. */
    $('#zorluk-dugme').addEventListener('click', function (e) {
      e.stopPropagation();
      menuKapat();
      var yeni = digerZorluk();
      yaz('kelime500.zorluk', yeni);
      yeniOyun(S.mod, yeni, S.tarih);
    });

    $('#ana-menu').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) { return; }
      menuKapat();
      if (b.dataset.mod) {
        if (b.dataset.mod !== S.mod) { modaGit(b.dataset.mod); }
        return;
      }
      if (b.id === 'menu-yeni') {
        yeniOyun('serbest', S.zorluk, S.tarih, true);
        uyar('Yeni kelime');
      } else if (b.id === 'menu-istatistik') {
        istatistikGoster();
      } else if (b.id === 'menu-yardim') {
        KB.yardim.ac();
      } else if (b.id === 'menu-tema') {
        tema(document.documentElement.dataset.tema === 'acik' ? 'koyu' : 'acik', true, true);
      }
    });

    /* Disariya tiklayinca ve Esc ile menuler kapanir. */
    document.addEventListener('click', menuKapat);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { menuKapat(); }
    });

    $('#ist-pencere').addEventListener('close', function () { clearInterval(sayimZaman); });
    Array.prototype.forEach.call(document.querySelectorAll('.kapat'), function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });

  }

  document.addEventListener('DOMContentLoaded', baslat);
}(window));
