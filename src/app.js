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
  var NADIR = 'JFVĞ';           // Türkçenin en seyrek harfleri

  var ZORLUKLAR = {
    standart:  { ad: 'Standart',  tekrarsiz: true,  nadirYok: true  },
    standarta: { ad: 'Standart+', tekrarsiz: true,  nadirYok: false },
    ileri:     { ad: 'İleri',     tekrarsiz: false, nadirYok: false }
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
  var ACILIS_GECIKME = 55;   // ms, perde acilisinda harfler arasi fark (cok kart var)
  var KART_SURE = 460;       // ms, tek bir kartin donus suresi (CSS ile ayni)
  var ACILIS_BEKLEME = 3000; // ms, kazandiktan sonra perdenin acilmasina kalan sure

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
  function enGecTarih(mod) { return mod === 'arsiv' ? dun() : bugun(); }

  /* ---------- oyun kurulumu ---------- */

  /* Zorlugun kurallarina gore gizli kelime havuzu. */
  function havuzKur(cozum, zorluk) {
    var z = ZORLUKLAR[zorluk];
    var h = cozum.filter(function (k) {
      if (z.tekrarsiz && !motor.tekrarsiz(k)) { return false; }
      if (z.nadirYok && !motor.nadirsiz(k, NADIR)) { return false; }
      return true;
    });
    return h.length ? h : cozum.slice();
  }

  /* Ayni gun her zorluk icin AYRI bir kelime yayimlanir. Havuzlar ic ice
   * oldugu icin (standart subset standart+ subset ileri) bagimsiz secim bazi
   * gunler ayni kelimeyi veriyordu. Zorluklar sabit bir sirayla secilir ve her
   * biri kendinden oncekilerin aldigi kelimeyi atlar. Sira sabit oldugu icin
   * sonuc herkeste ayni kalir. */
  var ZORLUK_SIRA = ['standart', 'standarta', 'ileri'];

  function gununKelimesi(cozum, tarih, zorluk) {
    var alinan = [];
    for (var i = 0; i < ZORLUK_SIRA.length; i++) {
      var z = ZORLUK_SIRA[i];
      var k = motor.gunlukKelime(havuzKur(cozum, z), tarih, z, alinan);
      if (z === zorluk) { return k; }
      alinan.push(k);
    }
    /* bilinmeyen zorluk: eskisi gibi tek basina sec */
    return motor.gunlukKelime(havuzKur(cozum, zorluk), tarih, zorluk, []);
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
        gecmis: [], notlar: {}, tusNot: {}, bitti: false, kazandi: false, ipucu: 0,
        kayitli: false, acikla: false
      };
    }

    S.mod = mod; S.zorluk = zorluk; S.tarih = tarih;
    S.girdi = []; S.imlec = 0;
    hataliSatir = false;
    cevrilecekSatir = -1;
    aciklaAnim = false;
    ciz();
  }

  function kaydet() {
    yaz(oyunAnahtari(S.mod, S.zorluk, S.tarih), {
      gizli: S.gizli, gecmis: S.gecmis, notlar: S.notlar, tusNot: S.tusNot,
      bitti: S.bitti, kazandi: S.kazandi, ipucu: S.ipucu, kayitli: S.kayitli,
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
    if (t === null) { return uyar('Kelimeyi tamamla', false); }
    if (sozluk.gecerli.indexOf(t) === -1) { return uyar('Kelime listede yok', true); }
    if (S.gecmis.some(function (g) { return g.tahmin === t; })) { return uyar('Bunu zaten denedin', true); }

    /* Harf tekrarı kısıtı yalnızca gizli kelime havuzunu belirler; tahmin olarak
     * tekrarlı harfli bir kelime her seviyede girilebilir. Seyrek harf (J, F, V, Ğ)
     * kısıtı ise Standart'ta tahminleri de bağlamaya devam eder. */
    var z = ZORLUKLAR[S.zorluk];
    if (z.nadirYok && !motor.nadirsiz(t, NADIR)) {
      return uyar(z.ad + ' seviyesinde J, F, V, Ğ harfleri yok', true);
    }

    var p = motor.puanla(t, S.gizli);
    S.gecmis.push({ tahmin: t, yer: p.yer, harf: p.harf, yok: p.yok });
    S.girdi = []; S.imlec = 0;
    cevrilecekSatir = S.gecmis.length - 1;      // yeni satırın rozetleri dönsün

    if (p.yer === n) { bitir(true); }
    else if (S.gecmis.length >= HAK) { bitir(false); }
    else { kaydet(); ciz(); }
  }

  /* Rozetlerin dönüşü bittikten sonraki ana kadar geçen süre. */
  function rozetSuresi() { return 2 * KART_GECIKME + KART_SURE; }

  function bitir(kazandi) {
    S.bitti = true;
    S.kazandi = kazandi;
    kaydet();
    if (!S.kayitli) {
      istatistikGuncelle(kazandi, S.gecmis.length);
      S.kayitli = true;
    }
    ciz();

    if (kazandi) {
      /* Önce doğru cevap duyurulur, sonra perde açılır: bütün tahminlerdeki
       * harfler gerçek renklerine döner. İstatistik penceresi en sona kalır. */
      uyar('Doğru! ' + S.gizli + ' · ' + S.gecmis.length + '/' + HAK, false, ACILIS_BEKLEME);
      setTimeout(function () {
        perdeyiAc();
        var acilisSuresi = (uzunluk() * S.gecmis.length - 1) * ACILIS_GECIKME + KART_SURE;
        setTimeout(istatistikGoster, acilisSuresi + 500);
      }, ACILIS_BEKLEME);
    } else {
      uyar('Kelime: ' + S.gizli);
      setTimeout(istatistikGoster, rozetSuresi() + 900);
    }
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

  /* ---------- ipucu ---------- */

  function olasiCevaplar() { return motor.adaylar(havuz, S.gecmis, 0); }

  function ipucuVer() {
    if (S.bitti) { return; }
    if (!S.gecmis.length) {
      return uyar('İpucu için önce bir tahmin yapmalısın');
    }

    var adaylar = olasiCevaplar();
    if (!adaylar.length) { return uyar('Uygun kelime bulunamadı'); }

    var onay = window.confirm(
      'İpucu, o ana kadarki sayılarla uyumlu bir kelimeyi satıra yazar.\n\n' +
      'Karşılığında bu oyun kayıp sayılır ve serin sıfırlanır.\n\n' +
      'Devam edilsin mi?');
    if (!onay) { return; }

    /* Ipucu bedelini hemen ode: oyun kayip yazilir, seri sifirlanir.
     * Oyunun geri kalani oynanmaya devam edebilir ama istatistik bir daha islenmez. */
    if (!S.kayitli) {
      istatistikGuncelle(false, 0);
      S.kayitli = true;
    }

    var secim = adaylar[Math.floor(Math.random() * adaylar.length)];
    S.girdi = secim.split('');
    S.imlec = secim.length;
    S.ipucu++;
    hataliSatir = false;
    kaydet();
    ciz();
    uyar('Sayılarla uyumlu bir kelime yazıldı · oyun kayıp sayıldı');
  }

  /* ---------- çizim ---------- */

  function ciz() {
    var n = uzunluk(), tahta = $('#tahta');
    tahta.innerHTML = '';
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
      if (gonderildi) {
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
            if (aciklaAnim) { cevrilecek.push({ el: kutu, sira: r * n + c }); }
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
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cevrilecek.forEach(function (o) {
            var ic = o.el.firstElementChild;
            if (ic) { ic.style.transitionDelay = (o.sira * gecikme) + 'ms'; }
            o.el.classList.add('cevrik');
          });
        });
      });
    }
    cevrilecekSatir = -1;
    aciklaAnim = false;

    $('#hak').innerHTML = S.bitti
      ? (S.kazandi ? 'Kazandın · <b>' + S.gecmis.length + '/' + HAK + '</b>'
                   : 'Bitti · cevap <b>' + S.gizli + '</b>')
      : 'Kalan hak <b>' + (HAK - S.gecmis.length) + '</b>' +
        (S.ipucu ? ' · ipuçlu' : '');

    $('#olasi').textContent = (S.gecmis.length && !S.bitti)
      ? 'Olası cevap: ' + olasiCevaplar().length : '';

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
  function uyar(metin, satirBoya, sure) {
    var b = $('#bildirim');
    b.textContent = metin;
    b.classList.add('gorunur');
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(function () { b.classList.remove('gorunur'); }, sure || 1600);

    if (satirBoya) { hataliSatir = true; ciz(); }
    var satir = document.querySelectorAll('.satir')[S.gecmis.length];
    if (satir) {
      satir.classList.remove('sallan');
      void satir.offsetWidth;
      satir.classList.add('sallan');
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
    son.appendChild(tus('💡', '', ipucuVer, 'İpucu'));
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
    uyar('Satır notları sıfırlandı');
  }

  function tahtaTikla(e) {
    var sifirlaBtn = e.target.closest('.satir-sifirla');
    if (sifirlaBtn && !sifirlaBtn.disabled) { return satirSifirla(Number(sifirlaBtn.dataset.r)); }
    notTikla(e);
  }

  /* ---------- paylaşım ---------- */

  function paylasMetni() {
    var satirlar = ['Kelime500 · ' + ZORLUKLAR[S.zorluk].ad +
                    (S.mod === 'gunluk' ? ' · ' + S.tarih : ' · serbest'),
                    (S.kazandi ? S.gecmis.length : 'X') + '/' + HAK + (S.ipucu ? ' (ipuçlu)' : '')];
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
    $('#ist-pencere').showModal();
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

  /* Tema uygulama. yumusak=true ise renkler kademeli doner (dugmeye basilinca);
   * sayfa acilirken kayitli tema animasyonsuz uygulanir, yoksa her aciliste
   * goze carpan bir gecis olurdu. Anahtar adi 'kelime500.tema' olarak kaliyor:
   * degistirilirse oyuncularin kayitli tercihi sifirlanir. */
  var TEMA_SURE = 320;   /* ms - assets/styles.css --tema-sure ile ayni */
  var temaZaman = null;

  function tema(deger, yumusak) {
    var kok = document.documentElement;
    if (yumusak) {
      kok.classList.add('tema-gecis');
      clearTimeout(temaZaman);
      temaZaman = setTimeout(function () {
        kok.classList.remove('tema-gecis');
      }, TEMA_SURE + 60);
    }
    kok.dataset.tema = deger;
    yaz('kelime500.tema', deger);
    $('#tema').textContent = deger === 'acik' ? '☾' : '☀';
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
    if (hedef > enGecTarih(S.mod)) { return; }
    $('#tarih').value = hedef;
    yaz('kelime500.tarih', hedef);
    yeniOyun(S.mod, S.zorluk, hedef);
  }

  /* Baslik satiri: hangi moddayiz, hangi gunun kelimesi.
   * Gunlukte tek bir bulmaca var (bugun), o yuzden tarih gezinmesi yalnizca arsivde. */
  function modYaz() {
    var arsiv = S.mod === 'arsiv';
    $('#tarih-nav').hidden = !arsiv;
    $('#yeni').hidden = S.mod !== 'serbest';
    $('#sonraki').disabled = S.tarih >= dun();
    $('#mod-etiket').textContent = arsiv ? 'Arşiv · ' + S.tarih
      : (S.mod === 'serbest' ? 'Serbest · sınırsız' : 'Günlük');
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
    tema(oku('kelime500.tema', 'koyu'));
    klavyeKur();

    var p = adresOku();
    var mod = p.mod === 'serbest' ? 'serbest'
            : p.mod === 'arsiv'   ? 'arsiv'
            : 'gunluk';
    var zorluk = ZORLUKLAR[p.zorluk] ? p.zorluk : oku('kelime500.zorluk', 'standart');
    if (!ZORLUKLAR[zorluk]) { zorluk = 'standart'; }

    var tarih = p.tarih && /^\d{4}-\d{2}-\d{2}$/.test(p.tarih) ? p.tarih : enGecTarih(mod);
    if (mod === 'gunluk') { tarih = bugun(); }          // gunlukte tek bulmaca var
    if (tarih > enGecTarih(mod)) { tarih = enGecTarih(mod); }

    var tarihGirdi = $('#tarih');
    tarihGirdi.max = enGecTarih(mod);                    // arsivde bugune donulemez
    tarihGirdi.value = tarih;
    $('#zorluk').value = zorluk;
    yaz('kelime500.zorluk', zorluk);

    yeniOyun(mod, zorluk, tarih);

    document.addEventListener('keydown', fizikselKlavye);
    $('#tahta').addEventListener('click', tahtaTikla);

    $('#zorluk').addEventListener('change', function () {
      yaz('kelime500.zorluk', this.value);
      yeniOyun(S.mod, this.value, $('#tarih').value);
    });

    tarihGirdi.addEventListener('change', function () {
      var enGec = enGecTarih(S.mod);
      if (!this.value || this.value > enGec) { this.value = enGec; }
      yaz('kelime500.tarih', this.value);
      yeniOyun(S.mod, S.zorluk, this.value);
    });

    $('#onceki').addEventListener('click', function () { tarihGit(-1); });
    $('#sonraki').addEventListener('click', function () { tarihGit(1); });

    $('#yeni').addEventListener('click', function () {
      yeniOyun('serbest', S.zorluk, S.tarih, true);
      uyar('Yeni kelime');
    });

    $('#yardim').addEventListener('click', function () { $('#yardim-pencere').showModal(); });
    $('#istatistik').addEventListener('click', istatistikGoster);
    $('#ist-paylas').addEventListener('click', paylas);
    $('#tema').addEventListener('click', function () {
      tema(document.documentElement.dataset.tema === 'acik' ? 'koyu' : 'acik', true);
    });

    $('#ist-pencere').addEventListener('close', function () { clearInterval(sayimZaman); });
    Array.prototype.forEach.call(document.querySelectorAll('.kapat'), function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });

    if (p.yardim) {
      /* Giristeki "Kurallari oku" karti buraya getirdi: pencere kapaninca
       * oyunda birakmak yerine ana sayfaya geri don. */
      var yardimPenceresi = $('#yardim-pencere');
      yardimPenceresi.addEventListener('close', function geriDon() {
        yardimPenceresi.removeEventListener('close', geriDon);
        location.href = 'index.html';
      });
      yardimPenceresi.showModal();
    }
  }

  document.addEventListener('DOMContentLoaded', baslat);
}(window));
