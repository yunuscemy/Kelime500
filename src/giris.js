/* Giris sayfasi: zorluk secimi, baglantilar ve bugunun durumu. */
(function () {
  'use strict';

  var ZORLUKLAR = ['standart', 'ileri'];
  var ADLAR = { standart: 'Standart', ileri: 'İleri' };
  var HAK = 8;

  var $ = function (s) { return document.querySelector(s); };

  function oku(anahtar, varsayilan) {
    try {
      var ham = localStorage.getItem(anahtar);
      return ham ? JSON.parse(ham) : varsayilan;
    } catch (e) { return varsayilan; }
  }

  function yaz(anahtar, deger) {
    try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch (e) { /* yoksay */ }
  }

  function bugun() {
    var d = new Date();
    return [d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')].join('-');
  }

  function dun() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return [d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0')].join('-');
  }

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

  /* Bugun her zorlukta ne durumdayiz? Oyun sayfasiyla ayni depolama anahtarlari. */
  function gunDurumu(zorluk) {
    var kayit = oku('kelime500.oyun.gunluk.' + zorluk + '.' + bugun(), null);
    if (!kayit) { return { metin: 'oynanmadı', sinif: '' }; }
    if (kayit.bitti) {
      return kayit.kazandi
        ? { metin: kayit.gecmis.length + '/' + HAK, sinif: 'kazandi' }
        : { metin: 'bilinemedi', sinif: 'kaybetti' };
    }
    return { metin: kayit.gecmis.length + '. hak', sinif: 'devam' };
  }

  /* Alev simgesi - istatistik penceresindekiyle ayni cizim (src/app.js). */
  var ALEV =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
    '<path fill="currentColor" d="M13.2 2c.4 3-1.2 4.4-2.6 5.7C9 9.2 7.6 10.6 7.6 13.2' +
    'c0 1.6.7 3 1.8 3.9-.3-1.7.3-3.2 1.6-4.3.3 2 1.3 3 2.5 4 1.3 1 2 2.2 2 3.6 0 .5-.1 1-.3 1.4' +
    '2.6-1.1 4.3-3.7 4.3-6.7 0-2.6-1.1-4.5-2.6-6-.3 1-.9 1.8-1.7 2.3.5-2.4-.3-5.3-2-9.4z"/>' +
    '<path fill="currentColor" opacity=".45" d="M8.3 21.9C6.9 20.9 6 19.3 6 17.5' +
    'c0-1 .3-2 .8-2.8.1 1.6.9 3 2.1 4 .9.7 1.4 1.5 1.4 2.4 0 .3 0 .6-.1.8z"/>' +
    '</svg>';

  function seri(zorluk) {
    var ist = oku('kelime500.ist.gunluk.' + zorluk, null);
    return ist && ist.seri ? ist.seri : 0;
  }

  /* Her seviye kendi satirinda: solda bugunun durumu, sagda serisi. Seri
   * gunluk donusun tek olcusu - kartta gorunmedigi surece kimse bilmiyordu. */
  function durumCiz() {
    var tehlikede = false;
    var html = ZORLUKLAR.map(function (z) {
      var d = gunDurumu(z), n = seri(z);
      if (n > 0 && d.sinif !== 'kazandi') { tehlikede = true; }
      return '<div class="durum-satir">' +
               '<span class="durum-etiket ' + d.sinif + '">' +
                 ADLAR[z] + ' <b>' + d.metin + '</b></span>' +
               '<span class="seri-etiket' + (n ? '' : ' bos') + '">' +
                 (n ? '<span class="alev">' + ALEV + '</span><b>' + n + '</b> günlük seri'
                    : 'günlük seri 😞') +
               '</span>' +
             '</div>';
    }).join('');

    /* Uyari yalnizca kaybedecek serisi olana: sifir seriye "serini koru"
     * demenin anlami yok. */
    if (tehlikede) {
      html += '<p class="seri-uyari">Serini korumak için bugünü oyna!</p>';
    }
    $('#bugun-durum').innerHTML = html;
  }

  /* Oyunun yayina alindigi gun - src/app.js icindeki YAYIN ile ayni olmali.
   * Arsiv bundan oncesine gidemez. */
  var YAYIN = '2026-08-31';

  /* Zorluk artik yalnizca oyun icinde secilir; giris sayfasi kayitli
   * tercihi okuyup baglantilara ekler. */
  function baglantilariKur(zorluk) {
    $('#baglanti-gunluk').href  = 'oyna?mod=gunluk&zorluk=' + zorluk;
    $('#baglanti-serbest').href = 'oyna?mod=serbest&zorluk=' + zorluk;
    /* Yayin gununde henuz arsivlenecek gun yok: kart pasif gosterilir. */
    var arsiv = $('#baglanti-arsiv');
    if (dun() >= YAYIN) {
      arsiv.href = 'oyna?mod=arsiv&zorluk=' + zorluk + '&tarih=' + dun();
      arsiv.removeAttribute('aria-disabled');
      arsiv.textContent = 'Arşive git →';
    } else {
      arsiv.removeAttribute('href');
      arsiv.setAttribute('aria-disabled', 'true');
      arsiv.textContent = 'Yarından itibaren';
    }
  }

  /* Gece yarisina kalan sure: gunluk kelime o an yenilenir.
   * Oyun sayfasindaki istatistik penceresinde de ayni bilgi var. */
  function geriSayim() {
    var simdi = new Date();
    var yarin = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + 1);
    var kalan = Math.max(0, Math.floor((yarin - simdi) / 1000));
    var ss = String(Math.floor(kalan / 3600)).padStart(2, '0');
    var dd = String(Math.floor(kalan % 3600 / 60)).padStart(2, '0');
    var sn = String(kalan % 60).padStart(2, '0');
    $('#sayac').textContent = 'Yeni günlük kelimeye ' + ss + ':' + dd + ':' + sn;
  }

  function baslat() {
    tema(baslangicTemasi());
    cihaziIzle();

    var zorluk = oku('kelime500.zorluk', 'standart');
    if (ZORLUKLAR.indexOf(zorluk) === -1) { zorluk = 'standart'; }
    baglantilariKur(zorluk);
    durumCiz();
    geriSayim();
    setInterval(geriSayim, 1000);

    /* Kurallar giris sayfasinin uzerinde acilir. Onceden oyun sayfasina
     * gidip pencereyi orada aciyordu; kapatinca oyun ekrani bir an gorunup
     * geri donuyordu. */
    $('#yardim-ac').addEventListener('click', function () { KB.yardim.ac(); });

    $('#tema').addEventListener('click', function () {
      tema(document.documentElement.dataset.tema === 'acik' ? 'koyu' : 'acik', true, true);
    });
  }

  document.addEventListener('DOMContentLoaded', baslat);
}());
