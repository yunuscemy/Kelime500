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

  function tema(deger) {
    document.documentElement.dataset.tema = deger;
    yaz('kelimebul.tema', deger);
    $('#tema').textContent = deger === 'acik' ? '☾' : '☀';
  }

  /* Bugun her zorlukta ne durumdayiz? Oyun sayfasiyla ayni depolama anahtarlari. */
  function gunDurumu(zorluk) {
    var kayit = oku('kelimebul.oyun.gunluk.' + zorluk + '.' + bugun(), null);
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

  function secimCiz(zorluk) {
    Array.prototype.forEach.call(document.querySelectorAll('#zorluk-secici button'), function (b) {
      b.setAttribute('aria-selected', b.dataset.zorluk === zorluk);
    });
    $('#baglanti-gunluk').href  = 'oyna.html?mod=gunluk&zorluk=' + zorluk;
    $('#baglanti-serbest').href = 'oyna.html?mod=serbest&zorluk=' + zorluk;
    $('#baglanti-arsiv').href   = 'oyna.html?mod=arsiv&zorluk=' + zorluk + '&tarih=' + dun();
  }

  function baslat() {
    tema(oku('kelimebul.tema', 'koyu'));

    var zorluk = oku('kelimebul.zorluk', 'standart');
    if (ZORLUKLAR.indexOf(zorluk) === -1) { zorluk = 'standart'; }
    secimCiz(zorluk);
    durumCiz();

    $('#zorluk-secici').addEventListener('click', function (e) {
      var d = e.target.closest('button');
      if (!d) { return; }
      yaz('kelimebul.zorluk', d.dataset.zorluk);
      secimCiz(d.dataset.zorluk);
    });

    $('#tema').addEventListener('click', function () {
      tema(document.documentElement.dataset.tema === 'acik' ? 'koyu' : 'acik');
    });
  }

  document.addEventListener('DOMContentLoaded', baslat);
}());
