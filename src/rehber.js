/* İlk giriş rehberi: oyunu dört kısa adımda anlatır.
 *
 * Cihazda hiç oyun kaydı yoksa (yeni oyuncu) oyun sayfası açıldıktan yarım
 * saniye sonra bir kez gösterilir. Kapatılınca kelime500.rehber işaretlenir
 * ve bir daha açılmaz. Önceden oynamış biri (kelime500.oyun.* ya da
 * kelime500.ist.* kaydı olan) rehberi görmez; /oyna?rehber ile elle açılır.
 *
 * Pencerenin boyu adımlar arasında değişmez: üst kenarı tahtanın ilk
 * satırının ortasında, alt kenarı klavyenin altında. Düğmeler hep aynı
 * yerde, yalnızca içerik değişir. */
(function (global) {
  'use strict';

  var ANAHTAR = 'kelime500.rehber';
  var ACILIS_BEKLE = 500;    // ms, oyun sayfası göründükten sonra
  var YAZ_BEKLE = 500;       // ms, 2. adımda yazmaya başlamadan önce
  var HARF_ARA = 170;        // ms, harfler arası
  var GONDER_BEKLE = 350;    // ms, son harften "Enter"a
  var KART_GECIKME = 140;    // ms, rozetler arası (app.js ile aynı)

  /* Örnek: gizli kelime KALEM, tahmin SELAM. L ve M doğru yerde; E ve A var
   * ama yerleri yanlış; S kelimede yok. */
  var ORNEK = 'SELAM';
  var SONUC = { yer: 2, harf: 2, yok: 1 };
  var DOGRU = [1, 2, 3, 2, 3];   // 1 kırmızı, 2 sarı, 3 yeşil
  var NOT_SINIF = ['', 'not-kirmizi', 'not-sari', 'not-yesil'];

  /* Tahmin satırı. yazili: kaç harf yazılmış; tiklanir: not alınabilir mi;
   * gonderildi: rozetler dönmüş mü. */
  function satir(o) {
    var h = '<div class="rehber-satir">';
    for (var i = 0; i < ORNEK.length; i++) {
      var yazili = i < o.yazili;
      h += '<span class="rehber-kutu' + (yazili ? ' dolu ' : ' ') +
           NOT_SINIF[o.notlar ? o.notlar[i] : 0] + '"' +
           (o.tiklanir ? ' data-i="' + i + '" role="button" tabindex="0"' : '') + '>' +
           (yazili ? ORNEK[i] : '') + '</span>';
    }
    h += '<span class="rozetler rehber-rozetler' + (o.gonderildi ? '' : ' bos') + '">';
    ['yer', 'harf', 'yok'].forEach(function (tur) {
      h += '<span class="rozet ' + tur + (o.gonderildi ? ' cevrik' : '') + '">' +
           '<span class="rozet-ic"><span class="rozet-yuz on"></span>' +
           '<span class="rozet-yuz arka">' + SONUC[tur] + '</span></span></span>';
    });
    return h + '</span></div>';
  }

  var ADIMLAR = [
    function () {
      return '<p class="rehber-karsilama">İlk kez mi buradasın? Öyleyse oyunun nasıl ' +
               'oynandığına beraber bakalım.</p>' +
        '<h2>Gizli kelimeyi bul</h2>' +
        '<div class="rehber-icerik">' +
          '<div class="rehber-satir rehber-gizli">' +
            '<span class="rehber-kutu">?</span><span class="rehber-kutu">?</span>' +
            '<span class="rehber-kutu">?</span><span class="rehber-kutu">?</span>' +
            '<span class="rehber-kutu">?</span></div>' +
          '<p>Her gün <b>5 harfli</b> yeni bir Türkçe kelime var; herkes için aynı.</p>' +
          '<p>Bulmak için <b>8 tahmin</b> hakkın var.</p>' +
        '</div>';
    },
    function () {
      return '<h2>Renkli sayıları ipucu olarak kullan!</h2>' +
        '<div class="rehber-icerik">' +
          '<div class="rehber-canli">' + satir({ yazili: 0 }) + '</div>' +
          '<p>Her tahminin yanında üç sayı çıkar:</p>' +
          '<div class="ornek"><span class="rozet duz yer">2</span><p>harf <b>doğru yerde</b></p></div>' +
          '<div class="ornek"><span class="rozet duz harf">2</span><p>harf <b>var ama yeri yanlış</b></p></div>' +
          '<div class="ornek"><span class="rozet duz yok">1</span><p>harf <b>gizli kelimede yok</b></p></div>' +
          '<p>Ama <b>hangi harfler</b> olduğunu söylemiyoruz. Asıl amaç bunu bulmak!</p>' +
        '</div>';
    },
    function () {
      return '<h2>Harflerle not al</h2>' +
        '<div class="rehber-icerik">' +
          '<p>Tahmin ettiğin harflere <b>dokunarak</b> renklerini değiştir, aklındakini ' +
            'tahtaya yaz: kırmızı → sarı → yeşil → boş.</p>' +
          '<p><b>Dene:</b> gizli kelime <b>KALEM</b> olsaydı, bu tahmindeki harfleri nasıl ' +
            'renklendirirdin?</p>' +
          '<div class="rehber-dene"></div>' +
          '<p class="rehber-sonuc" aria-live="polite"></p>' +
        '</div>';
    },
    function () {
      return '<h2>Takılırsan</h2>' +
        '<div class="rehber-icerik">' +
          '<div class="ornek"><span class="rehber-j">' + ((global.KB && global.KB.jokerSimge) || 'J') + '</span>' +
            '<p>Birkaç tahminden sonra klavyedeki <b>joker</b> açılır: bir harfin kelimede ' +
            'olup olmadığını ya da bir kutunun gerçek rengini gösterir.</p></div>' +
          '<div class="ornek"><span class="seviye-isaret standart">S</span>' +
            '<p><b>Standart</b> seviyede gizli kelimede aynı harf iki kez geçmez.</p></div>' +
          '<div class="ornek"><span class="seviye-isaret ileri">İ</span>' +
            '<p><b>İleri</b> seviyede böyle bir kural yok, her şey serbest.</p></div>' +
          '<p>Tüm kuralları menüdeki <b>Nasıl Oynanır</b> sayfasında bulabilirsin.</p>' +
        '</div>';
    }
  ];

  var pencere = null, adim = 0, notlar = [0, 0, 0, 0, 0], zamanlar = [];

  function hareketAzalt() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

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

  function zamanla(f, ms) { zamanlar.push(setTimeout(f, ms)); }
  function zamanlariSil() { zamanlar.forEach(clearTimeout); zamanlar = []; }

  /* 2. adım: satır boş gelir, harfler tek tek yazılır, "Enter"dan sonra
   * rozetler oyundaki gibi sırayla dönüp sayıları gösterir. */
  function canliOynat() {
    var yer = pencere.querySelector('.rehber-canli');
    if (!yer) { return; }
    if (hareketAzalt()) { yer.innerHTML = satir({ yazili: 5, gonderildi: true }); return; }
    var t = YAZ_BEKLE;
    for (var i = 1; i <= ORNEK.length; i++) {
      (function (n) {
        zamanla(function () { yer.innerHTML = satir({ yazili: n }); }, t);
      }(i));
      t += HARF_ARA;
    }
    zamanla(function () {
      var r = yer.querySelector('.rehber-rozetler');
      r.classList.remove('bos');
      Array.prototype.forEach.call(r.querySelectorAll('.rozet'), function (k, i) {
        k.firstElementChild.style.transitionDelay = (i * KART_GECIKME) + 'ms';
        k.classList.add('cevrik');
      });
    }, t - HARF_ARA + GONDER_BEKLE);
  }

  function denemeyiCiz() {
    var yer = pencere.querySelector('.rehber-dene');
    if (!yer) { return; }
    yer.innerHTML = satir({ yazili: 5, gonderildi: true, tiklanir: true, notlar: notlar });
    var tamam = notlar.every(function (n, i) { return n === DOGRU[i]; });
    pencere.querySelector('.rehber-sonuc').innerHTML = tamam
      ? '<b>Tam isabet!</b> L ve M doğru yerde; E ve A kelimede var ama yerleri yanlış; ' +
        'S kelimede yok.'
      : '';
  }

  function ciz() {
    zamanlariSil();
    var son = adim === ADIMLAR.length - 1, noktalar = '';
    for (var i = 0; i < ADIMLAR.length; i++) {
      noktalar += '<span class="rehber-nokta' + (i === adim ? ' etkin' : '') + '"></span>';
    }
    pencere.querySelector('.rehber-adim').textContent = (adim + 1) + ' / ' + ADIMLAR.length;
    pencere.querySelector('.rehber-atla').style.visibility = son ? 'hidden' : '';
    pencere.querySelector('.rehber-govde').innerHTML = ADIMLAR[adim]();
    pencere.querySelector('.rehber-geri').style.visibility = adim === 0 ? 'hidden' : '';
    pencere.querySelector('.rehber-noktalar').innerHTML = noktalar;
    var ileri = pencere.querySelector('.rehber-ileri');
    ileri.dataset.git = son ? 'kapat' : 'ileri';
    ileri.textContent = son ? 'Oynamaya başla' : 'İleri';
    denemeyiCiz();
    canliOynat();
  }

  /* Üst kenar ilk tahmin satırının ortasında, alt kenar klavyenin altında.
   * Yer yetmezse (kısa ekran) tarayıcının ortaladığı sabit boy kalır. */
  function yerlestir() {
    if (!pencere) { return; }
    var s = document.querySelector('#tahta .satir'), k = document.getElementById('klavye');
    pencere.style.marginTop = '';
    pencere.style.height = '';
    if (!s || !k) { return; }
    var sr = s.getBoundingClientRect(), kr = k.getBoundingClientRect();
    var ust = Math.round(sr.top + sr.height / 2), alt = Math.round(kr.bottom);
    if (alt - ust < 440 || alt > global.innerHeight) { return; }
    pencere.style.marginTop = ust + 'px';
    pencere.style.height = (alt - ust) + 'px';
  }

  function kur() {
    if (pencere) { return pencere; }
    pencere = document.createElement('dialog');
    pencere.id = 'rehber-pencere';
    pencere.tabIndex = -1;
    pencere.setAttribute('aria-label', 'Kelime500 rehberi');
    pencere.innerHTML =
      '<div class="rehber-ust"><span class="rehber-adim"></span>' +
        '<button class="rehber-atla" type="button" data-git="kapat">Atla</button></div>' +
      '<div class="rehber-govde"></div>' +
      '<div class="rehber-alt">' +
        '<button class="tus rehber-geri" type="button" data-git="geri">Geri</button>' +
        '<div class="rehber-noktalar"></div>' +
        '<button class="tus rehber-ileri" type="button" data-git="ileri">İleri</button>' +
      '</div>';
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
      d.blur();   // odak cercevesi kalmasin
      git(d.dataset.git);
    });
    pencere.addEventListener('keydown', function (e) {
      var kutu = e.target.closest && e.target.closest('.rehber-kutu[data-i]');
      if (kutu && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kutu.click(); return; }
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === pencere)) {
        e.preventDefault(); git(adim === ADIMLAR.length - 1 ? 'kapat' : 'ileri');
      }
      if (e.key === 'ArrowLeft' && adim > 0) { e.preventDefault(); git('geri'); }
    });
    /* Esc dahil her kapanış rehberi bitmiş sayar. */
    pencere.addEventListener('close', function () { zamanlariSil(); isaretle(); });
    global.addEventListener('resize', yerlestir);
    return pencere;
  }

  function git(yon) {
    if (yon === 'kapat') { pencere.close(); return; }
    adim += yon === 'ileri' ? 1 : -1;
    ciz();
  }

  function ac() {
    kur();
    adim = 0;
    notlar = [0, 0, 0, 0, 0];
    ciz();
    yerlestir();
    pencere.classList.remove('donerek');
    void pencere.offsetWidth;   // animasyon her açılışta yeniden başlasın
    pencere.classList.add('donerek');
    pencere.showModal();
    pencere.focus();   // ilk düğmeye değil pencereye: düğmede çerçeve çıkmasın
  }

  global.KB = global.KB || {};
  global.KB.rehber = { ac: ac };

  /* Kontrol app.js'ten ÖNCE yapılır (bu betik önce yükleniyor): app.js oyun
   * kaydını açılışta yazabilir, o zaman yeni oyuncu eski sanılırdı. */
  document.addEventListener('DOMContentLoaded', function () {
    if (yeniOyuncuMu() || /[?&]rehber\b/.test(location.search)) {
      setTimeout(ac, ACILIS_BEKLE);
    }
  });
}(window));
