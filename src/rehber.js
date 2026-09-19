/* İlk giriş rehberi: oyunu dört kısa adımda anlatır.
 *
 * Cihazda hiç oyun kaydı yoksa (yeni oyuncu) oyun sayfası açılınca bir kez
 * gösterilir. Kapatılınca kelime500.rehber işaretlenir ve bir daha açılmaz.
 * Önceden oynamış biri (kelime500.oyun.* ya da kelime500.ist.* kaydı olan)
 * rehberi hiç görmez. */
(function (global) {
  'use strict';

  var ANAHTAR = 'kelime500.rehber';

  /* Örnek: gizli kelime KALEM, tahmin KELAM. K, L, M doğru yerde; E ve A
   * var ama yerleri yanlış. Kurallar sayfasındaki örnekle aynı. */
  var ORNEK = 'KELAM';
  var DOGRU = [3, 2, 3, 2, 3];   // 1 kırmızı, 2 sarı, 3 yeşil
  var NOT_SINIF = ['', 'not-kirmizi', 'not-sari', 'not-yesil'];

  function satir(notlar, tiklanir) {
    var h = '<div class="rehber-satir">';
    for (var i = 0; i < ORNEK.length; i++) {
      h += '<span class="rehber-kutu ' + NOT_SINIF[notlar ? notlar[i] : 0] + '"' +
           (tiklanir ? ' data-i="' + i + '" role="button" tabindex="0"' : '') + '>' +
           ORNEK[i] + '</span>';
    }
    return h + '<span class="rehber-rozetler">' +
      '<span class="rozet duz yer">3</span>' +
      '<span class="rozet duz harf">2</span>' +
      '<span class="rozet duz yok">0</span></span></div>';
  }

  var ADIMLAR = [
    {
      baslik: 'Gizli kelimeyi bul',
      govde:
        '<div class="rehber-satir rehber-gizli">' +
          '<span class="rehber-kutu">?</span><span class="rehber-kutu">?</span>' +
          '<span class="rehber-kutu">?</span><span class="rehber-kutu">?</span>' +
          '<span class="rehber-kutu">?</span></div>' +
        '<p>Her gün <b>5 harfli</b> yeni bir Türkçe kelime var; herkes için aynı.</p>' +
        '<p>Bulmak için <b>8 tahmin</b> hakkın var.</p>'
    },
    {
      baslik: 'Sayılar ipucu verir',
      govde:
        satir(null, false) +
        '<p>Her tahminin yanında üç sayı çıkar:</p>' +
        '<div class="ornek"><span class="rozet duz yer">3</span><p>harf <b>doğru yerde</b></p></div>' +
        '<div class="ornek"><span class="rozet duz harf">2</span><p>harf <b>var ama yeri yanlış</b></p></div>' +
        '<div class="ornek"><span class="rozet duz yok">0</span><p>harf <b>kelimede yok</b></p></div>' +
        '<p>Ama <b>hangi harfler</b> olduğunu söylemiyoruz. Asıl oyun bunu bulmak!</p>'
    },
    {
      baslik: 'Harflere not al',
      govde:
        '<p>Tahmin ettiğin harflere <b>dokunarak</b> renk ver, aklındakini tahtaya yaz: ' +
        'kırmızı → sarı → yeşil → boş.</p>' +
        '<p><b>Dene:</b> gizli kelime <b>KALEM</b> olsaydı, bu tahmindeki harfleri nasıl boyardın?</p>' +
        '<div class="rehber-dene"></div>' +
        '<p class="rehber-sonuc" aria-live="polite"></p>'
    },
    {
      baslik: 'Takılırsan',
      govde:
        '<div class="ornek"><span class="rehber-j">J</span>' +
        '<p>Birkaç tahminden sonra klavyedeki <b>joker</b> açılır: bir harfin kelimede ' +
        'olup olmadığını ya da bir kutunun gerçek rengini gösterir.</p></div>' +
        '<div class="ornek"><span class="rehber-seviye">S</span>' +
        '<p><b>Standart</b> seviyede gizli kelimede aynı harf iki kez geçmez. ' +
        '<b>İleri</b> seviyede böyle bir kural yok.</p></div>' +
        '<p>Tüm kurallar menüdeki <b>Nasıl oynanır</b> sayfasında.</p>'
    }
  ];

  var pencere = null, adim = 0, notlar = [0, 0, 0, 0, 0];

  function isaretle() {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(true)); } catch (e) { /* yoksay */ }
  }

  function yeniOyuncuMu() {
    try {
      if (localStorage.getItem(ANAHTAR)) { return false; }
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf('kelime500.oyun.') === 0 || k.indexOf('kelime500.ist.') === 0) {
          return false;
        }
      }
      return true;
    } catch (e) { return false; }   // depolama yoksa her açılışta çıkmasın
  }

  function denemeyiCiz() {
    var yer = pencere.querySelector('.rehber-dene');
    if (!yer) { return; }
    yer.innerHTML = satir(notlar, true);
    var tamam = notlar.every(function (n, i) { return n === DOGRU[i]; });
    pencere.querySelector('.rehber-sonuc').innerHTML = tamam
      ? '<b>Tam isabet!</b> K, L, M doğru yerde; E ve A kelimede var ama yerleri yanlış.'
      : 'İpucu: 3 yeşil, 2 sarı.';
  }

  function ciz() {
    var a = ADIMLAR[adim], son = adim === ADIMLAR.length - 1, noktalar = '';
    for (var i = 0; i < ADIMLAR.length; i++) {
      noktalar += '<span class="rehber-nokta' + (i === adim ? ' etkin' : '') + '"></span>';
    }
    pencere.innerHTML =
      '<div class="rehber-ust"><span class="rehber-adim">' + (adim + 1) + ' / ' +
        ADIMLAR.length + '</span>' +
        (son ? '' : '<button class="rehber-atla" type="button" data-git="kapat">Atla</button>') +
      '</div>' +
      '<h2>' + a.baslik + '</h2>' +
      '<div class="rehber-govde">' + a.govde + '</div>' +
      '<div class="rehber-alt">' +
        '<button class="tus rehber-geri" type="button" data-git="geri"' +
          (adim === 0 ? ' disabled' : '') + '>Geri</button>' +
        '<div class="rehber-noktalar">' + noktalar + '</div>' +
        '<button class="tus rehber-ileri" type="button" data-git="' + (son ? 'kapat' : 'ileri') + '">' +
          (son ? 'Oynamaya başla' : 'İleri') + '</button>' +
      '</div>';
    denemeyiCiz();
  }

  function kur() {
    if (pencere) { return pencere; }
    pencere = document.createElement('dialog');
    pencere.id = 'rehber-pencere';
    pencere.setAttribute('aria-label', 'Kelime500 rehberi');
    document.body.appendChild(pencere);
    pencere.addEventListener('click', function (e) {
      var kutu = e.target.closest('.rehber-kutu[data-i]');
      if (kutu) {
        var i = Number(kutu.dataset.i);
        notlar[i] = (notlar[i] + 1) % 4;
        denemeyiCiz();
        return;
      }
      var d = e.target.closest('[data-git]');
      if (!d) { return; }
      if (d.dataset.git === 'kapat') { pencere.close(); return; }
      adim += d.dataset.git === 'ileri' ? 1 : -1;
      ciz();
    });
    pencere.addEventListener('keydown', function (e) {
      var kutu = e.target.closest && e.target.closest('.rehber-kutu[data-i]');
      if (kutu && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kutu.click(); }
    });
    /* Esc dahil her kapanış rehberi bitmiş sayar. */
    pencere.addEventListener('close', isaretle);
    return pencere;
  }

  function ac() {
    kur();
    adim = 0;
    notlar = [0, 0, 0, 0, 0];
    ciz();
    pencere.showModal();
    pencere.querySelector('.rehber-ileri').focus();
  }

  global.KB = global.KB || {};
  global.KB.rehber = { ac: ac };

  document.addEventListener('DOMContentLoaded', function () {
    if (yeniOyuncuMu()) { ac(); }
  });
}(window));
