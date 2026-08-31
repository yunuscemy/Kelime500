/* Giris sayfasi: zorluk secimi, baglantilar ve bugunun durumu. */
(function () {
  'use strict';

  var ZORLUKLAR = ['standart', 'standarta', 'ileri'];
  var ADLAR = { standart: 'Standart', standarta: 'Standart+', ileri: 'İleri' };
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

  function durumCiz() {
    $('#bugun-durum').innerHTML = ZORLUKLAR.map(function (z) {
      var d = gunDurumu(z);
      return '<span class="durum-etiket ' + d.sinif + '">' +
             ADLAR[z] + ' <b>' + d.metin + '</b></span>';
    }).join('');
  }

  /* Zorluk artik yalnizca oyun icinde secilir; giris sayfasi kayitli
   * tercihi okuyup baglantilara ekler. */
  function baglantilariKur(zorluk) {
    $('#baglanti-gunluk').href  = 'oyna.html?mod=gunluk&zorluk=' + zorluk;
    $('#baglanti-serbest').href = 'oyna.html?mod=serbest&zorluk=' + zorluk;
    $('#baglanti-arsiv').href   = 'oyna.html?mod=arsiv&zorluk=' + zorluk + '&tarih=' + dun();
  }

  function baslat() {
    tema(baslangicTemasi());
    cihaziIzle();

    var zorluk = oku('kelime500.zorluk', 'standart');
    if (ZORLUKLAR.indexOf(zorluk) === -1) { zorluk = 'standart'; }
    baglantilariKur(zorluk);
    durumCiz();

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
