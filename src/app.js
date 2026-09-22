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
  /* Jokerler: kelime basina iki tane, ikisi de yalnizca SON tahmine uygulanir.
   * harf: secilen harfin kelimede olup olmadigini soyler (gucsuz).
   * kutu: secilen kutunun gercek rengini acar (guclu).
   * Esik: jokerin acilmasi icin yapilmis olmasi gereken tahmin sayisi;
   * Ileri'de her sey bir tur sonra. */
  var JOKER_ESIK = { standart: { harf: 2, kutu: 3 }, ileri: { harf: 3, kutu: 4 } };
  var RENK_ACIKLAMA = ['', 'kırmızı · gizli kelimede yok', 'sarı · var ama yeri yanlış',
                       'yeşil · harf doğru yerde'];
  /* J tusunun simgesi: kalin bir J, icinde capraz renkli seritler, koyu
   * kontur. Harf klavyedeki J tusuyla karismasin diye yazi degil cizim.
   * Seritlerin renkleri JOKER_RENKLER'de. */
  var JOKER_RENKLER = ['#e3342f', '#f39237', '#f6d93a', '#3fa66a', '#2f5fd0', '#7a3fb0'];
  var JOKER_J = 'M13.5 2H19.5V14.5C19.5 18.9 16.4 22 12 22C7.6 22 4.5 18.9 4.5 14.5V13H9.5V14.5' +
                'C9.5 16.2 10.6 17.3 11.5 17.3C12.4 17.3 13.5 16.2 13.5 14.5Z';
  var JOKER_SIMGE =
    '<svg class="joker-simge" viewBox="0 0 24 24" aria-hidden="true">' +
      '<defs><clipPath id="joker-j-kesit"><path d="' + JOKER_J + '"/></clipPath></defs>' +
      '<g clip-path="url(#joker-j-kesit)"><g transform="rotate(35 12.5 12)">' +
        JOKER_RENKLER.map(function (r, i) {
          /* Seritler harfin capraz genisligine (donmus eksende ~6.5-21.9)
           * yayiliyor ki altisi da harfin uzerine dussun. */
          return '<rect x="' + (6.5 + i * 2.57).toFixed(2) + '" y="-6" width="2.65" height="36" fill="' + r + '"/>';
        }).join('') +
      '</g></g>' +
      '<path d="' + JOKER_J + '" fill="none" stroke="#17181c" stroke-width="1.3" stroke-linejoin="round"/>' +
    '</svg>';
  global.KB.jokerSimge = JOKER_SIMGE;   // rehber de ayni simgeyi gosteriyor

  var JOKER_YANIP_SURE = 3000;      // ms, bir yanip sonme dongusu (CSS ile ayni)
  var JOKER_HATIRLATMA = 60000;     // ms, tahminsiz gecen sure sonunda hatirlatma
  var jokerYanipZaman = null, jokerHatirlatma = null;
  var jokerYanipGosterildi = false; // ilk acilistaki iki yanip sonme yapildi mi

  var jokerSecim = null;   // secim surerken 'harf' ya da 'kutu'
  var jokerOnay = null;    // kutuda "emin misin?" sorulan joker
  var jokerBasladi = 0;    // secimin basladigi an (parlamanin zamanlamasi icin)
  /* Secim onaylaninca satir once bu kadar eski haliyle durur (saniye); sonra
   * parlaklik ayni surede sifirdan tama cikar (CSS: --joker-gel, ayni deger). */
  var JOKER_BEKLE = 0.75;
  var JOKER_SONUC_SURE = 3000;   // ms: joker cevabinin ekranda kalma suresi

  /* Tahtadaki notlarin klavyedeki yansimasi (NOT_SINIF ile ayni sira). */
  var TAHTA_TUS_SINIF = ['', 'tahta-kirmizi', 'tahta-sari', 'tahta-yesil'];

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
      S.joker = S.joker || {};   // jokerlerden once kaydedilmis oyunlarda yok
    } else {
      S = {
        gizli: mod === 'gunluk' ? gununKelimesi(sozluk.cozum, tarih, zorluk)
                                : motor.rastgeleKelime(havuz),
        gecmis: [], notlar: {}, tusNot: {}, bitti: false, kazandi: false,
        kayitli: false, acikla: false, joker: {}
      };
    }

    S.mod = mod; S.zorluk = zorluk; S.tarih = tarih;
    S.girdi = []; S.imlec = 0;
    jokerSecim = null; jokerOnay = null;
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
      acikla: S.acikla, joker: S.joker
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
    else { kaydet(); ciz(); jokerAcildiMi(); jokerHatirlatmaKur(); }
  }

  function bitir(kazandi) {
    jokerSecim = null;
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
      istatistikGoster(kazandi);
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
    /* Tahta her cizimde yeniden kuruluyor; secim surerken parlama bastan
     * baslamasin diye gecikme, secimin basindan gecen sureye gore veriliyor
     * (eksi olursa animasyon kaldigi yerden devam eder). */
    tahta.style.setProperty('--joker-gecikme',
      (JOKER_BEKLE - (jokerSecim ? (Date.now() - jokerBasladi) / 1000 : 0)) + 's');
    tahta.classList.toggle('oyun-bitti', !!S.bitti);
    var kesinYok = kesinYok_(), kesinRenk = kesinRenkler(), ko = kirmiziOlamaz();
    var cevrilecek = [];

    /* Perde açıldıysa her tahmindeki harflerin gerçek renkleri hesaplanır. */
    var gercekRenkler = S.acikla
      ? S.gecmis.map(function (g) { return motor.harfRenkleri(g.tahmin, S.gizli); })
      : null;

    for (var r = 0; r < HAK; r++) {
      var gonderildi = r < S.gecmis.length;
      var aktif = !S.bitti && r === S.gecmis.length;

      var jokerSatiri = !!jokerSecim && r === S.gecmis.length - 1;
      var satir = document.createElement('div');
      satir.className = 'satir' + (gonderildi ? ' gonderildi' : '') +
                        (jokerSatiri ? ' joker-satir' : '') +
                        (aktif && hataliSatir ? ' hatali' : '') +
                        (aktif && !hataliSatir && gecersizGirdi() ? ' gecersiz' : '');

      var sifirla = document.createElement('button');
      sifirla.type = 'button';
      sifirla.className = 'satir-sifirla';
      if (gonderildi && !S.bitti) {
        sifirla.innerHTML = '<i class="ikon ikon-supurge" aria-hidden="true"></i>';
        sifirla.title = 'Bu satırın notlarını temizle';
        sifirla.setAttribute('aria-label', sifirla.title);
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
            var onSinif = kesinYok[harf] ? 'not-kirmizi' : (NOT_SINIF[notDegeri(r, c, ko)] || '');
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
            var jk = jokerKutu(r, c), kr = kesinRenk[r + ':' + c];
            if (jokerSatiri) {
              kutu.classList.add(kesinYok[harf] || kr ? 'joker-kapali' : 'joker-secilebilir');
            }
            if (jk) {
              /* Kutu jokeriyle acildi: gercek renk, degistirilemez. */
              kutu.classList.add(NOT_SINIF[jk], 'joker-acik');
              kutu.title = 'Kutu jokeri: ' + RENK_ACIKLAMA[jk];
            } else if (kesinYok[harf]) {
              kutu.classList.add('not-kirmizi');
              kutu.title = 'Kesin: bu harf kelimede yok';
            } else if (kr) {
              /* Kutu jokerinin actigi harften cikan kesin bilgi. */
              kutu.classList.add(NOT_SINIF[kr]);
              kutu.title = 'Kesin: ' + RENK_ACIKLAMA[kr];
            } else {
              var not = notDegeri(r, c, ko);
              if (not) { kutu.classList.add(NOT_SINIF[not]); }
              if (ko[r + ':' + c]) {
                /* Cerceve sadece harf jokerinin sordugu satirda; diger
                 * satirlarda kural (kirmizi yok) gecerli ama isaret yok. */
                if (r === jokerHarfSatiri()) { kutu.classList.add('joker-iz'); }
                kutu.title = 'Kesin: harf kelimede var · sarı ya da yeşil';
              } else {
                kutu.title = 'Not almak için tıkla';
              }
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

  /* Kesin olarak kelimede olmayan harfler: tahminlerden cikan (motor) ve
   * harf jokerinin "yok" dedigi harf. Ikisi de tartisilmaz bilgi. */
  function kesinYok_() {
    var k = motor.kesinYokHarfler(S.gecmis);
    var j = S.joker || {};
    if (j.harf && !j.harf.var) { k[j.harf.harf] = true; }

    /* Kutu jokeri kirmizi acti ve harf o tahminde bir kez geciyorsa, harf
     * kelimede hic yok (kelimede olsaydi tek kopyasi yesil ya da sari
     * olurdu). Tekrar eden kopyanin kirmizisi (Ileri'de AA) boyle degil. */
    var jr = j.kutu, gr;
    if (jr && jr.renk === 1 && (gr = S.gecmis[jr.r])) {
      var x = gr.tahmin[jr.c], adet = 0;
      for (var i = 0; i < gr.tahmin.length; i++) { if (gr.tahmin[i] === x) { adet++; } }
      if (adet === 1) { k[x] = true; }
    }

    /* Jokerin kesinlestirdigi harf, bir satirin yesil+sari sayisini tek basina
     * karsiliyorsa (satirda yalnizca bir renkli harf var ve o bu), satirdaki
     * diger harfler kelimede yoktur. Kutu jokeri: acilan kutu yesil ve satir
     * 1/0/x, ya da sari ve satir 0/1/x. Harf jokeri: harf "var" ve satirin
     * yesil+sarisi 1. Acilan harfin tekrari (Ileri'de AA gibi) fazladan kopya
     * olarak kirmizi gorunse de kelimede var - o haric tutulur. */
    function satiriKapat(r, bilinen) {
      var g = S.gecmis[r];
      for (var c = 0; c < g.tahmin.length; c++) {
        if (g.tahmin[c] !== bilinen) { k[g.tahmin[c]] = true; }
      }
    }
    var jk = j.kutu, g;
    if (jk && (g = S.gecmis[jk.r])) {
      if ((jk.renk === 3 && g.yer === 1 && g.harf === 0) ||
          (jk.renk === 2 && g.yer === 0 && g.harf === 1)) {
        satiriKapat(jk.r, g.tahmin[jk.c]);
      }
    }
    if (j.harf && j.harf.var && j.tur) {
      /* Harf jokeri, kullanildigi turdaki son tahmine (tur - 1) uygulanmisti.
       * Iki joker de kullanildiysa j.tur sonuncuyu gosterir; harf jokerinin
       * kendi satiri j.harf.r'de saklanir (eski kayitlarda yoksa tur - 1). */
      var hr = j.harf.r !== undefined ? j.harf.r : j.tur - 1;
      if ((g = S.gecmis[hr]) && g.yer + g.harf === 1) { satiriKapat(hr, j.harf.harf); }
    }
    return k;
  }

  /* Kutu jokerinin actigi harften, DIGER tahminlerdeki ayni harfin kesin
   * rengi. Donen: { 'r:c': renk }.
   * - Yesil (harf p konumunda): baska bir tahminde ayni harf p konumundaysa
   *   kesin yesil. Baska konumdaysa kesin sari - yalnizca Standart'ta; gizli
   *   kelimede harf tekrari olmadigi icin harf baska yerde olamaz. Ileri'de
   *   harf kelimede iki kez gecebilir, orada bir sey soylenmez.
   * - Sari (harf var ama q konumunda degil): baska bir tahminde ayni harf q
   *   konumundaysa ve o tahminde harf bir kez geciyorsa kesin sari.
   * Jokerin kendi satirina dokunulmaz (Ileri'de tekrar eden kopya fazlalik
   * olarak kirmizi olabilir). */
  /* Rengi kesin bilinen kutular: { r, c, renk, harf }.
   * 1) Kutu jokerinin actigi kutu - rengi dogrudan gosterildi.
   * 2) Harf jokeri "var" dediyse, o satirin sayilari rengi tek basina
   *    belirleyebilir: satirda hic sari yoksa harf yesildir, hic yesil
   *    yoksa saridir. (Ornek: 2 yesil + 3 kirmizi olan satirda kelimede
   *    oldugu bilinen harf yesillerden biri olmak zorunda.) Harf satirda
   *    birden fazla geciyorsa hangi kopya oldugu belli olmaz, atlanir. */
  function kesinKutular() {
    var liste = [], j = S.joker || {}, g;
    if (j.kutu && (g = S.gecmis[j.kutu.r])) {
      liste.push({ r: j.kutu.r, c: j.kutu.c, renk: j.kutu.renk, harf: g.tahmin[j.kutu.c],
                   joker: true });
    }
    if (j.harf && j.harf.var && j.tur) {
      var hr = j.harf.r !== undefined ? j.harf.r : j.tur - 1;
      if ((g = S.gecmis[hr])) {
        var x = j.harf.harf, yer = -1, adet = 0, i;
        for (i = 0; i < g.tahmin.length; i++) {
          if (g.tahmin[i] === x) { adet++; yer = i; }
        }
        var renk = g.harf === 0 ? 3 : (g.yer === 0 ? 2 : 0);
        if (adet === 1 && renk) { liste.push({ r: hr, c: yer, renk: renk, harf: x }); }
      }
    }
    return liste;
  }

  /* Kesin kutulardan cikan, DIGER tahminlerdeki ayni harfin kesin rengi.
   * Donen: { 'r:c': renk }.
   * - Yesil (harf p konumunda): baska bir tahminde ayni harf p konumundaysa
   *   kesin yesil. Baska konumdaysa kesin sari - yalnizca Standart'ta; gizli
   *   kelimede harf tekrari olmadigi icin harf baska yerde olamaz. Ileri'de
   *   harf kelimede iki kez gecebilir, orada bir sey soylenmez.
   * - Sari (harf var ama q konumunda degil): baska bir tahminde ayni harf q
   *   konumundaysa ve o tahminde harf bir kez geciyorsa kesin sari.
   * Kutu jokerinin kendi kutusu listeye girmez (zaten joker rengiyle cizilir);
   * satirdan cikarilan kutu ise kesin renkle boyanir. */
  function kesinRenkler() {
    var sonuc = {}, tekrarsiz = ZORLUKLAR[S.zorluk].tekrarsiz;
    function koy(a, renk) { if (!sonuc[a] || renk > sonuc[a]) { sonuc[a] = renk; } }
    kesinKutular().forEach(function (kb) {
      if (kb.renk === 1) { return; }
      if (!kb.joker) { koy(kb.r + ':' + kb.c, kb.renk); }
      S.gecmis.forEach(function (g, r) {
        if (r === kb.r) { return; }
        var adet = 0, c;
        for (c = 0; c < g.tahmin.length; c++) { if (g.tahmin[c] === kb.harf) { adet++; } }
        for (c = 0; c < g.tahmin.length; c++) {
          if (g.tahmin[c] !== kb.harf) { continue; }
          if (kb.renk === 3) {
            if (c === kb.c) { koy(r + ':' + c, 3); }
            else if (tekrarsiz) { koy(r + ':' + c, 2); }
          } else if (c === kb.c && adet === 1) {
            koy(r + ':' + c, 2);
          }
        }
      });
    });
    return sonuc;
  }

  /* Jokerden harfin kelimede OLDUGU biliniyor ama kutunun rengi kesin
   * degilse (sari mi yesil mi belli degil): bu kutularda kirmizi secilemez,
   * not sadece bos -> sari -> yesil doner. Kaynaklar: kutu jokeri sari/yesil,
   * harf jokeri "var". Harf o tahminde bir kez geciyorsa gecerli; tekrar eden
   * kopya (Ileri'de) fazlalik olarak kirmizi olabilir. Kesin renkli kutular
   * (kesinRenkler) ve jokerin kendi kutusu burada yer almaz. */
  function kirmiziOlamaz() {
    var sonuc = {}, j = S.joker || {}, harfler = {}, kr = kesinRenkler(), g0;
    if (j.kutu && j.kutu.renk > 1 && (g0 = S.gecmis[j.kutu.r])) { harfler[g0.tahmin[j.kutu.c]] = true; }
    if (j.harf && j.harf.var) { harfler[j.harf.harf] = true; }
    S.gecmis.forEach(function (g, r) {
      for (var c = 0; c < g.tahmin.length; c++) {
        var x = g.tahmin[c], a = r + ':' + c;
        if (!harfler[x] || kr[a] || jokerKutu(r, c)) { continue; }
        if (g.tahmin.split(x).length === 2) { sonuc[a] = true; }
      }
    });
    return sonuc;
  }

  /* Harf jokerinin kullanildigi satir, yoksa -1. */
  function jokerHarfSatiri() {
    var j = S.joker || {};
    if (!j.harf) { return -1; }
    return j.harf.r != null ? j.harf.r : j.tur - 1;
  }

  /* Kullanicinin notu; kirmizi olamayan kutuda eski kirmizi not yok sayilir. */
  function notDegeri(r, c, ko) {
    var not = S.notlar[r + ':' + c] || 0;
    return not === 1 && ko[r + ':' + c] ? 0 : not;
  }

  /* Kutu jokeriyle acilmis kutunun rengi (1-3), yoksa 0. */
  function jokerKutu(r, c) {
    var k = S.joker && S.joker.kutu;
    return k && k.r === r && k.c === c ? k.renk : 0;
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

  /* Tahtadaki notlarin harf bazinda ozeti: bir harfe birden fazla kutuda not
   * verildiyse en guclusu alinir - yesil (3) > sari (2) > kirmizi (1).
   * Harf bir yerde yesilse kelimede vardir; baska bir kutudaki kirmizi bunu
   * degistirmez. */
  function tahtaNotlari() {
    var s = Object.create(null), ko = kirmiziOlamaz();
    Object.keys(S.notlar).forEach(function (a) {
      var not = S.notlar[a], p = a.split(':'), g = S.gecmis[Number(p[0])];
      if (not === 1 && ko[a]) { return; }
      if (!not || !g) { return; }
      var h = g.tahmin[Number(p[1])];
      if (!s[h] || not > s[h]) { s[h] = not; }
    });
    var k = S.joker && S.joker.kutu;
    if (k && S.gecmis[k.r]) {
      var jh = S.gecmis[k.r].tahmin[k.c];
      if (!s[jh] || k.renk > s[jh]) { s[jh] = k.renk; }
    }
    var kr = kesinRenkler();
    Object.keys(kr).forEach(function (a) {
      var p = a.split(':'), h = S.gecmis[Number(p[0])].tahmin[Number(p[1])];
      if (!s[h] || kr[a] > s[h]) { s[h] = kr[a]; }
    });
    return s;
  }

  /* Klavye tahtayi canli olarak yansitir. Oncelik:
   * 1) kesin yok (tahtadaki gibi sabit kirmizi, degistirilemez)
   * 2) tahtada harfe verilen not
   * 3) klavyede tusa verilen kendi not (sag tik / basili tut)
   * 4) daha once denenmis harf: soluk */
  function tuslariBoya() {
    jokerTusGuncelle();
    var kullanilan = kullanilanHarfler(S.gecmis);
    var kesinYok = kesinYok_();
    var tahta = tahtaNotlari();
    Array.prototype.forEach.call(document.querySelectorAll('.tus[data-harf]'), function (b) {
      var h = b.dataset.harf;
      b.classList.remove('not-yok', 'not-belki', 'not-var', 'kullanilmis',
                         'tahta-kirmizi', 'tahta-sari', 'tahta-yesil');
      var d = S.tusNot[h] || 0;
      if (kesinYok[h]) { b.classList.add('tahta-kirmizi'); }
      else if (tahta[h]) { b.classList.add(TAHTA_TUS_SINIF[tahta[h]]); }
      else if (d) { b.classList.add(TUS_SINIF[d]); }
      else if (kullanilan[h]) { b.classList.add('kullanilmis'); }
    });
  }

  var bildirimZaman = null, hataZaman = null;
  /* satirBoya: satiri gecici kirmizi yapar. salla: satiri sallar.
   * Bilgi amacli mesajlarda (not temizleme, yeni kelime, sonuc kopyalandi)
   * sallama olmaz - yalnizca gercek hatalarda. */
  /* Bildirim kutusu, baslik kutusu ile tahtanin arasindaki bosluga oturur:
   * tek satirlik kutu bu bosluga dikey ortalanir, iki satirlik kutu ayni ust
   * noktadan asagi dogru uzar. Yer olculerek verilir - ekran boyuna, mod
   * satirinin icerigine ve arsivdeki tarih satirina gore degisiyor. */
  function bildirimYerlestir(b) {
    var c = getComputedStyle(b);
    var tekSatir = parseFloat(c.paddingTop) + parseFloat(c.paddingBottom) +
                   parseFloat(c.fontSize) * 1.25;

    /* Acik bir pencere varsa bildirim onun ustune tasinir: pencere tarayicinin
     * "ust katman"inda durdugu icin disarida kalan bildirim arkada kaliyordu. */
    var acik = document.querySelector('dialog[open]');
    if (acik) {
      if (b.parentNode !== acik) { acik.appendChild(b); }
      var r = acik.getBoundingClientRect();
      b.style.top = Math.round((r.top + r.bottom) / 2 - tekSatir / 2) + 'px';
      return;
    }
    if (b.parentNode !== document.body) { document.body.appendChild(b); }

    var basvuru = document.querySelector('header'), tahta = $('#tahta');
    if (!basvuru || !tahta) { return; }
    var ust = basvuru.getBoundingClientRect().bottom;
    var alt = tahta.getBoundingClientRect().top;
    b.style.top = Math.round((ust + alt) / 2 - tekSatir / 2) + 'px';
  }

  function uyar(metin, satirBoya, sure, salla) {
    var b = $('#bildirim');
    b.textContent = metin;
    bildirimYerlestir(b);
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
    /* Ekran klavyesi odagi tutmasin: tiklanan tus odakta kalirsa, ardindan
     * fiziksel klavyeyle yazinca tarayici onun etrafina odak cercevesi
     * ciziyordu (J tusunun yanip sonen cercevesinin disinda sabit bir kutu). */
    b.addEventListener('click', function () { b.blur(); });
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
    /* Rengi tahtadan gelen tusa elle not verilmez: kesin yok harfler
     * tahtadaki gibi sabit, notlu harfler de tahtayi yansitir. */
    if (kesinYok_()[h] || tahtaNotlari()[h]) { return; }
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

    /* Son satir: joker, temizle, bosluk, gonder. Genislikleri ustteki satirin
     * tuslariyla hizali (Z+C, V+B, N+M+O, C+sil) - bkz. .tus.alt-* sinifi.
     * Temizleme tusu satir notlarini temizleyen dugmeyle ayni simgeyi
     * (supurge) kullanir. */
    var son = document.createElement('div');
    son.className = 'klavye-satir';
    /* J tusu ve joker kutusu bir sarmalin icinde: kutu, seviye kutusu gibi
     * dugmenin hemen ustunde acilir. Satirdaki genislik payini sarmal tasir. */
    var jokerSarmal = document.createElement('div');
    jokerSarmal.className = 'joker-sarmal alt-2';
    var jokerTus = tus('J', 'joker-tus', function (e) {
      e.stopPropagation();
      jokerTusu(jokerTus);
    }, 'Joker');
    jokerTus.id = 'joker-tus';
    jokerTus.innerHTML = JOKER_SIMGE;
    jokerTus.setAttribute('aria-label', 'Joker');
    jokerTus.setAttribute('aria-haspopup', 'true');
    jokerTus.setAttribute('aria-expanded', 'false');
    jokerSarmal.appendChild(jokerTus);
    var temizle = tus('', 'alt-2', notlariTemizle, 'Notları temizle');
    temizle.innerHTML = '<i class="ikon ikon-supurge" aria-hidden="true"></i>';
    temizle.setAttribute('aria-label', 'Notları temizle');
    var gonderTusu = tus('', 'alt-25', gonder, 'Gönder');
    gonderTusu.innerHTML = '<i class="ikon ikon-gonder" aria-hidden="true"></i>';
    gonderTusu.setAttribute('aria-label', 'Gönder');
    son.appendChild(jokerSarmal);
    son.appendChild(temizle);
    son.appendChild(tus('Boşluk', 'alt-3', atla, 'Bilinmeyen harfi atla'));
    son.appendChild(gonderTusu);
    k.appendChild(son);

    /* Joker kutusu: J tusunun ustunde acilir. */
    var menu = document.createElement('div');
    menu.className = 'acilir joker-menu';
    menu.id = 'joker-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.addEventListener('click', function (e) {
      e.stopPropagation();   // kutunun icine tiklamak kutuyu kapatmasin
      var b = e.target.closest('button');
      if (!b || b.disabled) { return; }
      if (b.dataset.joker) { jokerOnay = b.dataset.joker; jokerMenuCiz(); return; }
      if (b.dataset.onay === 'evet') { return jokerBaslat(jokerOnay); }
      if (b.dataset.onay === 'hayir') { jokerOnay = null; jokerMenuCiz(); }
    });
    jokerSarmal.appendChild(menu);
  }

  /* ---------- jokerler ---------- */

  /* Son tahminde jokerin secebilecegi kutu var mi: kesin kirmizi harfler
   * secilemez, zaten bilinen bir seye joker harcanmasin. */
  function jokerSecilebilirVar() {
    var r = S.gecmis.length - 1, son = S.gecmis[r], ky = kesinYok_(), kr = kesinRenkler();
    if (!son) { return false; }
    for (var c = 0; c < uzunluk(); c++) {
      if (!ky[son.tahmin[c]] && !kr[r + ':' + c]) { return true; }
    }
    return false;
  }

  /* 'hazir' | 'kilitli' (esige gelinmedi) | 'bos' (son tahminde secilecek
   * kutu yok) | 'kullanildi' | 'bitti' */
  function jokerDurum(tur) {
    if (S.bitti) { return 'bitti'; }
    if (S.joker[tur]) { return 'kullanildi'; }
    if (S.gecmis.length < JOKER_ESIK[S.zorluk][tur]) { return 'kilitli'; }
    if (S.joker.tur === S.gecmis.length) { return 'bu-tur'; }   // her tahminde tek joker
    return jokerSecilebilirVar() ? 'hazir' : 'bos';
  }

  function jokerDurumYazi(tur) {
    var d = jokerDurum(tur), j = S.joker[tur];
    if (d === 'hazir') { return 'Kullanılabilir'; }
    if (d === 'kilitli') { return JOKER_ESIK[S.zorluk][tur] + '. tahminden sonra açılır'; }
    if (d === 'bos') { return 'Son tahminde seçilebilecek harf yok'; }
    if (d === 'bu-tur') { return 'Bu tahminde bir joker kullandın · sonraki tahminde'; }
    if (d === 'kullanildi') {
      return tur === 'harf' ? 'Kullanıldı · ' + j.harf + (j.var ? ' kelimede var' : ' kelimede yok')
                            : 'Kullanıldı · ' + (j.c + 1) + '. kutu ' + RENK_ACIKLAMA[j.renk].split(' ·')[0];
    }
    return 'Oyun bitti';
  }

  function jokerMenuCiz() {
    var turler = [
      { tur: 'harf', ad: 'Harf jokeri', ne: 'Son tahmindeki bir harf kelimede var mı?' },
      { tur: 'kutu', ad: 'Kutu jokeri', ne: 'Son tahmindeki bir kutunun gerçek rengi' }
    ];
    $('#joker-menu').innerHTML = turler.map(function (t) {
      var hazir = jokerDurum(t.tur) === 'hazir';
      /* Onay: secilen jokerin yerinde "emin misin?" ve iki dugme. */
      if (hazir && jokerOnay === t.tur) {
        return '<div class="joker-onay" role="group">' +
                 '<span class="joker-ad">' + t.ad + '</span>' +
                 '<span class="joker-ne">Kullanmak istediğine emin misin?</span>' +
                 '<span class="joker-onay-dugmeler">' +
                   '<button type="button" class="tus" data-onay="hayir">Hayır</button>' +
                   '<button type="button" class="tus evet" data-onay="evet">Kullan</button>' +
                 '</span>' +
               '</div>';
      }
      return '<button type="button" role="menuitem" data-joker="' + t.tur + '"' +
             (hazir ? '' : ' disabled') + '>' +
               '<span class="joker-ad">' + t.ad + '</span>' +
               '<span class="joker-ne">' + t.ne + '</span>' +
               '<span class="joker-durum' + (hazir ? ' hazir' : '') + '">' +
                 jokerDurumYazi(t.tur) + '</span>' +
             '</button>';
    }).join('');
  }

  /* J tusu: secim surerken iptal eder, yoksa joker kutusunu acar/kapatir. */
  function jokerTusu(dugme) {
    if (jokerSecim) { return jokerIptal(); }
    jokerOnay = null;
    jokerMenuCiz();
    menuAc('#joker-menu', dugme);
  }

  /* Onaydan sonra: kutu kapanir, satir bir sure eski haliyle durur, sonra
   * parlamaya baslar (CSS; gecikme --joker-gecikme ile). */
  function jokerBaslat(tur) {
    jokerOnay = null;
    menuKapat();
    if (jokerDurum(tur) !== 'hazir') { return; }
    jokerSecim = tur;
    jokerBasladi = Date.now();
    ciz();
  }

  function jokerIptal() {
    if (!jokerSecim) { return; }
    jokerSecim = null;
    ciz();
    uyar('Joker iptal edildi');
  }

  /* Secim surerken tahtaya dokunuldu. Secilebilir olmayan yere dokunmak
   * secimi bozmaz; oyuncu dogru kutuyu bulana kadar bekler. */
  function jokerSec(e) {
    var kutu = e.target.closest('.kutu.joker-secilebilir');
    if (!kutu) { return; }
    var r = Number(kutu.dataset.r), c = Number(kutu.dataset.c);
    var tahmin = S.gecmis[r].tahmin, harf = tahmin[c], tur = jokerSecim;
    jokerSecim = null;
    if (tur === 'harf') {
      var var_ = S.gizli.indexOf(harf) !== -1;
      S.joker.harf = { harf: harf, var: var_, r: r };
      S.joker.tur = S.gecmis.length;
      uyar(harf + (var_ ? ' kelimede var' : ' kelimede yok'), false, JOKER_SONUC_SURE);
    } else {
      var renk = motor.harfRenkleri(tahmin, S.gizli)[c];
      S.joker.kutu = { r: r, c: c, renk: renk };
      S.joker.tur = S.gecmis.length;
      uyar((c + 1) + '. kutu ' + RENK_ACIKLAMA[renk], false, JOKER_SONUC_SURE);
    }
    kaydet();
    ciz();
    jokerHatirlatmaKur();
  }

  /* Bir tahminden sonra esige gelen joker varsa oyuncuya haber verilir.
   * Ilk joker acildiginda tus iki kez yanip soner, sonra sabit parlak kalir -
   * surekli yanip sonmesi dikkat dagitiyordu. Ikinci joker acilinca tekrar
   * yanmaz, tus zaten parlak. */
  function jokerAcildiMi() {
    ['harf', 'kutu'].forEach(function (tur) {
      if (!S.joker[tur] && S.gecmis.length === JOKER_ESIK[S.zorluk][tur]) {
        uyar((tur === 'harf' ? 'Harf' : 'Kutu') + ' jokeri açıldı!', false, 2400);
        if (!jokerYanipGosterildi) { jokerYanipGosterildi = true; jokerYanip(2); }
      }
    });
  }

  /* Tusu n kez yakip sondurur, sonra sabit parlak birakir. */
  function jokerYanip(kere) {
    var b = $('#joker-tus');
    if (!b || !b.classList.contains('joker-hazir')) { return; }
    b.classList.remove('joker-yanip');
    void b.offsetWidth;                       // animasyon bastan baslasin
    b.style.setProperty('--yanip', kere);
    b.style.setProperty('--yanip-altin', kere + 0.5);   // en parlak anda dursun
    b.classList.add('joker-yanip');
    clearTimeout(jokerYanipZaman);
    jokerYanipZaman = setTimeout(function () {
      b.classList.remove('joker-yanip');
    }, (kere + 0.5) * JOKER_YANIP_SURE + 60);
  }

  /* Oyuncu bir dakikadır yeni tahmin yapmadiysa joker bir kez hatirlatilir.
   * Her tahminden ve joker kullanimindan sonra bastan kurulur. */
  function jokerHatirlatmaKur() {
    clearTimeout(jokerHatirlatma);
    if (S.bitti) { return; }
    jokerHatirlatma = setTimeout(function () {
      jokerYanip(1);
      jokerHatirlatmaKur();
    }, JOKER_HATIRLATMA);
  }

  /* J tusu, kullanilabilir joker varken belirgin, yokken soluk. */
  function jokerTusGuncelle() {
    var b = $('#joker-tus');
    if (!b) { return; }
    var hazir = ['harf', 'kutu'].some(function (t) { return jokerDurum(t) === 'hazir'; });
    b.classList.toggle('joker-hazir', hazir && !jokerSecim);
    b.classList.toggle('joker-secimde', !!jokerSecim);
    /* Kullanilabilir joker yokken (henuz acilmadi, bu tahminde kullanildi,
     * hepsi bitti) tus soluk. */
    b.classList.toggle('joker-pasif', !hazir && !jokerSecim);
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
    if (jokerKutu(r, c) || kesinRenkler()[r + ':' + c]) { return; }   // kesin renk degistirilemez
    var harf = S.gecmis[r].tahmin[c];
    if (kesinYok_()[harf]) { return; }   // kesin kırmızı değiştirilemez
    var anahtar = kutu.dataset.r + ':' + kutu.dataset.c;
    /* Not yalnizca tiklanan kutuya islenir. Ayni harf bir tahminde sari,
     * baska bir tahminde (farkli konumda) yesil olabilir; hepsini birlikte
     * boyamak oyuncunun senaryo denemesini engelliyordu. Jokerden gelen
     * kesin renkler bunun disinda, onlar butun tahminlere isleniyor. */
    var ko = kirmiziOlamaz();
    var simdiki = S.notlar[anahtar] || 0;
    if (simdiki === 1 && ko[anahtar]) { simdiki = 0; }
    /* Harf kelimede var: bos -> sari -> yesil -> bos, kirmizi atlanir. */
    S.notlar[anahtar] = ko[anahtar] ? [2, 2, 3, 0][simdiki] : (simdiki + 1) % 4;
    kaydet();
    ciz();
  }

  /* Bir satırın manuel notlarını temizler; o satırda kesin-yok kuralıyla
   * zorla kırmızı olan hücreler bundan etkilenmez. */
  function satirSifirla(r) {
    if (!S.gecmis[r]) { return; }
    var kesinYok = kesinYok_();
    for (var c = 0; c < uzunluk(); c++) {
      if (kesinYok[S.gecmis[r].tahmin[c]]) { continue; }
      delete S.notlar[r + ':' + c];
    }
    kaydet();
    ciz();
  }

  function tahtaTikla(e) {
    if (jokerSecim) { return jokerSec(e); }
    if (S.bitti) { return; }   /* oyun bitince not almanin anlami kalmiyor */
    var sifirlaBtn = e.target.closest('.satir-sifirla');
    if (sifirlaBtn && !sifirlaBtn.disabled) { return satirSifirla(Number(sifirlaBtn.dataset.r)); }
    notTikla(e);
  }

  /* ---------- paylaşım ---------- */

  var ADRES = 'kelime500.com';

  /* Paylasilan metin. Gunluk oyunda tarih yazilmaz - mesaji alan kisi zaten
   * bugune dair oldugunu anlar. Serbest modda ise gun kavrami yok, o yuzden
   * ayrica belirtilir; yoksa karsi taraf gunluk kelime sanir.
   * Adres son satirda: mesaji alan kisinin nereye gidecegini bilmesi
   * paylasimin butun amaci. */
  function paylasMetni() {
    var basi = 'Kelime500 · ' + (S.mod === 'serbest' ? 'Serbest Mod · ' : '') +
               'Seviye: ' + ZORLUKLAR[S.zorluk].ad;
    var sonuc = S.kazandi ? S.gecmis.length + '. tahminde bildim!'
                          : S.gecmis.length + ' tahminde bulamadım 😔';
    var satirlar = [basi, sonuc, ''];
    S.gecmis.forEach(function (g, i) {
      satirlar.push((i + 1) + ': 🟩' + g.yer + ' 🟨' + g.harf + ' 🟥' + g.yok);
    });
    satirlar.push('', ADRES);
    return satirlar.join('\n');
  }

  /* Eski yontem: gizli bir alana yazip kopyalatmak. navigator.clipboard
   * yalnizca HTTPS'te calisiyor; yerel agda (http://192.168...) ve eski
   * tarayicilarda tek secenek bu. */
  function eskiUsulKopyala(metin) {
    var alan = document.createElement('textarea');
    alan.value = metin;
    alan.setAttribute('readonly', '');
    alan.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(alan);
    alan.select();
    alan.setSelectionRange(0, metin.length);
    var oldu = false;
    try { oldu = document.execCommand('copy'); } catch (e) { oldu = false; }
    document.body.removeChild(alan);
    return oldu;
  }

  function panoyaKopyala(metin) {
    function yedek() {
      /* Hicbiri olmuyorsa kisa bir uyari: metnin tamamini bildirime basmak
       * (eski davranis) okunmaz bir kutu cikariyordu. */
      uyar(eskiUsulKopyala(metin) ? 'Sonuç kopyalandı' : 'Kopyalanamadı');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(metin).then(function () { uyar('Sonuç kopyalandı'); },
                                                yedek);
    } else { yedek(); }
  }

  /* Telefonlarda isletim sisteminin kendi paylasim menusu acilir; WhatsApp
   * tek dokunusla cikar, kullanici oyundan hic cikmaz. Masaustu tarayicilarin
   * cogu navigator.share desteklemiyor - orada eski davranis surer. */
  function paylas() {
    var metin = paylasMetni();
    if (navigator.share) {
      navigator.share({ text: metin }).catch(function (e) {
        /* Kullanici menuyu kapattiysa sessiz kal; gercek hatada kopyalamaya dus. */
        if (!e || e.name !== 'AbortError') { panoyaKopyala(metin); }
      });
      return;
    }
    panoyaKopyala(metin);
  }

  /* ---------- istatistik penceresi ---------- */

  var sayimZaman = null, seriZaman = null;
  var istZorluk = null;   // pencerede gosterilen seviye (oyunun seviyesi degil)
  var seriArtisi = false; // pencere oyun kazanildiktan sonra mi aciliyor

  var ALEV =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
    '<path fill="currentColor" d="M13.2 2c.4 3-1.2 4.4-2.6 5.7C9 9.2 7.6 10.6 7.6 13.2' +
    'c0 1.6.7 3 1.8 3.9-.3-1.7.3-3.2 1.6-4.3.3 2 1.3 3 2.5 4 1.3 1 2 2.2 2 3.6 0 .5-.1 1-.3 1.4' +
    '2.6-1.1 4.3-3.7 4.3-6.7 0-2.6-1.1-4.5-2.6-6-.3 1-.9 1.8-1.7 2.3.5-2.4-.3-5.3-2-9.4z"/>' +
    '<path fill="currentColor" opacity=".45" d="M8.3 21.9C6.9 20.9 6 19.3 6 17.5' +
    'c0-1 .3-2 .8-2.8.1 1.6.9 3 2.1 4 .9.7 1.4 1.5 1.4 2.4 0 .3 0 .6-.1.8z"/>' +
    '</svg>';

  /* Durum satiri her zaman gorunur - seviye degistirince pencerenin boyu
   * oynamasin diye. Gosterilen seviyenin O GUNKU oyununu anlatir: bitmisse
   * sonucu ve gizli kelimeyi, bitmemisse oynamaya cagirir. Bitmemis oyunun
   * kelimesi elbette yazilmaz. */
  function istSonucYaz(zorluk) {
    var el = $('#ist-sonuc');
    var kendi = zorluk === S.zorluk;
    var o = kendi ? S : oku(oyunAnahtari(S.mod, zorluk, S.tarih), null);

    if (!o || !o.bitti) {
      el.className = 'ist-durum';
      el.innerHTML = o && o.gecmis && o.gecmis.length
        ? 'Bu oyunu henüz bitirmedin.'
        : (S.mod === 'gunluk' ? 'Bugün oynamadın. Denemek ister misin?'
                              : 'Bu oyunu henüz oynamadın.');
      return;
    }

    var j = o.joker || {};
    var joker = (j.harf ? 1 : 0) + (j.kutu ? 1 : 0);
    var rozet = joker ? '<span class="ist-joker">' + joker + ' joker</span>' : '';
    el.className = 'ist-durum ' + (o.kazandi ? 'kazandi' : 'kaybetti');
    el.innerHTML = (o.kazandi ? o.gecmis.length + '. tahminde bildin' : 'Bilemedin') +
      ' · Gizli kelime: <b>' + o.gizli + '</b>' + rozet;
  }

  /* Seri satiri. artis=true ise (oyun kazanilarak bittiginde) sayi once eski
   * haliyle durur: ustunde +1 belirir, alev yanar, sonra yeni sayi gelir.
   * Gunluk donusu en cok bu sayi tetikliyor; artisin gorunmesi onemli. */
  function istSeriYaz(ist, artis) {
    var onceki = artis ? Math.max(0, ist.seri - 1) : ist.seri;
    $('#ist-seri').innerHTML =
      '<span class="alev">' + ALEV + '</span>' +
      '<span class="ist-seri-sayi"><b>' + onceki + '</b><span>günlük seri</span>' +
        (artis ? '<i class="ist-arti">+1</i>' : '') + '</span>' +
      '<span class="ist-seri-eniyi">En iyi seri<b>' + ist.enIyiSeri + '</b></span>';
    if (!artis) { return; }

    var kutu = $('#ist-seri'), sayi = kutu.querySelector('.ist-seri-sayi b');
    clearTimeout(seriZaman);
    seriZaman = setTimeout(function () {
      kutu.classList.add('arti-gel');
      seriZaman = setTimeout(function () {
        kutu.classList.add('alev-yan');
        sayi.textContent = ist.seri;
        sayi.classList.add('degisti');
        seriZaman = setTimeout(function () {
          kutu.classList.remove('arti-gel', 'alev-yan');
          sayi.classList.remove('degisti');
        }, 900);
      }, 850);
    }, 250);
  }

  function istatistikCiz() {
    var kendi = istZorluk === S.zorluk;
    var ist = oku(istAnahtari(S.mod, istZorluk), bosIstatistik());
    var yuzde = ist.oynanan ? Math.round(ist.kazanilan / ist.oynanan * 100) : 0;

    istSonucYaz(istZorluk);
    menuIsaretle('#ist-sekme', '[data-zorluk]', 'zorluk', istZorluk);
    /* Mod adi baslikta durur: pencerede ayri bir satira gerek kalmasin. */
    $('#ist-mod').textContent = S.mod === 'gunluk' ? 'Günlük kelime'
                              : S.mod === 'arsiv'  ? 'Arşiv' : 'Serbest Mod';

    istSeriYaz(ist, seriArtisi && kendi);
    $('#ist-ozet').innerHTML =
      kart(ist.oynanan, 'kez oynadın') + kart(ist.kazanilan, 'kazandın') +
      kart(yuzde + '%', 'kazanma');

    /* Sutunlar: yatay eksen kacinci tahminde bilindigi, dikey eksen kac kez.
     * Bos sutun da yerinde durur, eksen sabit kalsin. */
    var enCok = 1, i;
    for (i = 1; i <= HAK; i++) { enCok = Math.max(enCok, ist.dagilim[i] || 0); }
    var html = '';
    for (i = 1; i <= HAK; i++) {
      var v = ist.dagilim[i] || 0;
      var son = kendi && S.bitti && S.kazandi && S.gecmis.length === i;
      html += '<div class="sutun' + (son ? ' aktif' : '') + (v ? '' : ' bos') + '">' +
                '<span class="sutun-cubuk" style="height:' +
                  (v ? Math.round(v / enCok * 100) : 0) + '%">' +
                  '<i>' + v + '</i></span>' +
                '<span class="sutun-ad">' + i + '</span>' +
              '</div>';
    }
    $('#ist-dagilim').innerHTML = html;
    $('#ist-paylas').disabled = !S.bitti || !kendi;
  }

  function istatistikGoster(kazanarakBitti) {
    seriArtisi = !!kazanarakBitti && !hareketAzalt_();
    istZorluk = S.zorluk;
    istatistikCiz();

    geriSayim();
    clearInterval(sayimZaman);
    sayimZaman = setInterval(geriSayim, 1000);
    var pencere = $('#ist-pencere');
    istPencereKonumla(pencere);
    pencere.showModal();
    /* Odak kapatma tusuna dusup cevresinde cerceve birakmasin. */
    pencere.focus();
  }

  /* Pencere oyun ekraninin uzerine oturur: ust kenari mod satiri ile tahta
   * arasindaki boslugun ortasinda, alt kenari klavye ile sayfanin altindaki
   * baglantilarin arasinda. Boylece icerige yer kalir (ilerideki reklam
   * yuvasi dahil) ama "Nasıl Oynanır" ve gizlilik baglantilari kapanmaz.
   * Olculer tutmazsa (cok kisa ekran) tarayicinin ortalamasi korunur. */
  function istPencereKonumla(pencere) {
    pencere.style.marginTop = '';
    pencere.style.marginBottom = '';
    pencere.style.height = '';

    var basi = document.querySelector('header'), klavye = $('#klavye');
    var baglanti = document.querySelector('.alt-baglanti');
    if (!basi || !klavye) { return; }

    /* Baslik kutusunun govdesi ::before ile 6px disariya tasiyor; teget
     * durmasin diye ustune biraz daha bosluk birakilir. */
    var ust = basi.getBoundingClientRect().bottom + 14;
    var kAlt = klavye.getBoundingClientRect().bottom;
    var alt = baglanti ? (kAlt + baglanti.getBoundingClientRect().top) / 2 : kAlt + 12;
    alt = Math.min(alt, window.innerHeight - 8);
    if (ust < 8 || alt - ust < 320) { return; }   /* sigmiyorsa varsayilana birak */

    pencere.style.marginTop = Math.round(ust) + 'px';
    pencere.style.marginBottom = 'auto';
    pencere.style.height = Math.round(alt - ust) + 'px';
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

  function hareketAzalt_() {
    return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  /* Seviye dugmesindeki yazinin basi. "Mod" degil: oyunda mod Gunluk/Serbest
   * demek; kurallar sayfasi ve paylasim metni de "seviye" diyor. */
  var ZORLUK_ONEK = 'Seviye: ';


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

    /* Zorluk dugmesi seviyenin rengini ve harfini tasir; basinca iki
     * seviyeyi aciklamalariyla gosteren kutu acilir. */
    var zd = $('#zorluk-dugme');
    /* Iki seviyenin yazisi dugmede ust uste durur, yalnizca gecerli olan
     * gorunur (CSS). Dugme boylece uzun olanin genisliginde sabit kalir;
     * seviye degisince boyu oynamaz. Bir kez kurulur. */
    if (!zd.firstChild) {
      Object.keys(ZORLUKLAR).forEach(function (z) {
        var y = document.createElement('span'), harf = document.createElement('b');
        y.dataset.z = z;
        harf.textContent = ZORLUK_ISARET[z];   /* "Seviye: " normal, harf kalin */
        y.append(ZORLUK_ONEK, harf);
        zd.appendChild(y);
      });
    }
    zd.dataset.zorluk = S.zorluk;
    zd.setAttribute('aria-label', ZORLUK_ONEK + ZORLUKLAR[S.zorluk].ad);
    zd.title = 'Seviye: ' + ZORLUKLAR[S.zorluk].ad;

    menuIsaretle('#ana-menu', '[data-mod]', 'mod', S.mod);
    menuIsaretle('#zorluk-menu', '[data-zorluk]', 'zorluk', S.zorluk);

    /* Kelime degistirme yalnizca serbest modda: gunlukte ve arsivde herkes
     * ayni kelimeyi oynadigi icin yenilemek anlamsiz. Dugme dururken satir
     * sola dayali kalir - dogru cevap yazisi dugmeye yapismasin. */
    var serbest = S.mod === 'serbest';
    $('#yeni-kelime').hidden = !serbest;
    kutu.classList.toggle('sag-dugme', serbest);
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
      var d = m.parentNode.querySelector('.simge, .joker-tus');
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
    location.href = 'oyna?mod=' + mod + '&zorluk=' + S.zorluk;
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

    /* Dugme yaptigi isi soylesin: telefonda isletim sisteminin paylasim
     * menusu aciliyor, desteklemeyen masaustu tarayicilarda panoya kopyaliyor.
     * HTML'deki varsayilan "Sonucu kopyala" - yedek davranisin karsiligi. */
    var paylasDugme = $('#ist-paylas');
    if (navigator.share) { paylasDugme.textContent = 'Sonucu paylaş'; }
    paylasDugme.addEventListener('click', paylas);

    /* --- baslik menuleri --- */
    var menuDugme = $('#menu-dugme');
    menuDugme.addEventListener('click', function (e) {
      e.stopPropagation();
      menuAc('#ana-menu', menuDugme);
    });

    /* Seviye dugmesi iki seviyeyi aciklamalariyla gosteren kutuyu acar;
     * satira dokununca o seviyeye gecilir. Her seviyenin oyunu ayri anahtarda
     * kayitli oldugu icin geri donuldugunde tahminler durur. */
    var zorlukDugme = $('#zorluk-dugme');
    zorlukDugme.addEventListener('click', function (e) {
      e.stopPropagation();
      menuAc('#zorluk-menu', zorlukDugme);
    });
    $('#yeni-kelime').addEventListener('click', function () {
      yeniOyun('serbest', S.zorluk, S.tarih, true);
      uyar('Yeni kelime');
    });

    $('#ist-sekme').addEventListener('click', function (e) {
      var b = e.target.closest('[data-zorluk]');
      if (!b || b.dataset.zorluk === istZorluk) { return; }
      istZorluk = b.dataset.zorluk;
      seriArtisi = false;
      istatistikCiz();
    });

    $('#ist-dugme').addEventListener('click', function (e) {
      e.stopPropagation();
      menuKapat();
      istatistikGoster();
    });

    $('#zorluk-menu').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-zorluk]');
      if (!b) { return; }
      menuKapat();
      if (b.dataset.zorluk === S.zorluk) { return; }
      yaz('kelime500.zorluk', b.dataset.zorluk);
      yeniOyun(S.mod, b.dataset.zorluk, S.tarih);
    });

    $('#ana-menu').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) { return; }
      menuKapat();
      if (b.dataset.mod) {
        if (b.dataset.mod !== S.mod) { modaGit(b.dataset.mod); }
        return;
      }
      if (b.id === 'menu-anasayfa') {
        location.href = '/';
      } else if (b.id === 'menu-tema') {
        tema(document.documentElement.dataset.tema === 'acik' ? 'koyu' : 'acik', true, true);
      }
    });

    /* Disariya tiklayinca ve Esc ile menuler kapanir. */
    document.addEventListener('click', menuKapat);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { menuKapat(); jokerIptal(); }
    });

    $('#ist-pencere').addEventListener('close', function () { clearInterval(sayimZaman); });
    /* Pencerenin disina (karartilmis zemine) tiklamak da kapatir. */
    $('#ist-pencere').addEventListener('click', function (e) {
      if (e.target === this) { this.close(); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.kapat'), function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });

  }

  document.addEventListener('DOMContentLoaded', baslat);
}(window));
