/* "Nasil oynanir" penceresi. Giris sayfasi ve oyun sayfasi ayni pencereyi
 * kullanir; metin tek yerde dursun diye markup burada tutuluyor.
 * Pencere ilk acilista sayfaya eklenir, sonrasinda yeniden kullanilir. */
(function (global) {
  'use strict';

  var ICERIK = [
    '<button class="simge kapat" type="button" title="Kapat">✕</button>',
    '<h2>KELİME500 nasıl oynanır?</h2>',

    '<p>Gizli Türkçe kelimeyi <b>8 veya daha az</b> sayıda tahminde bulmaya çalışıyorsun.',
    '   Her tahminden sonra tahmin kelimesinin yanında 3 farklı sayı göreceksin:</p>',

    '<div class="ornek"><span class="rozet duz yer">3</span>',
    '  <p>tane harf gizli kelimede <b>var ve yerleri doğru</b>.</p></div>',
    '<div class="ornek"><span class="rozet duz harf">2</span>',
    '  <p>tane harf gizli kelimede <b>var ama yerleri doğru değil</b>.</p></div>',
    '<div class="ornek"><span class="rozet duz yok">0</span>',
    '  <p>tane harf gizli kelimede <b>yok</b>.</p></div>',

    '<p>Yeşil, sarı ve kırmızı kutucuklardaki rakamların toplamı, her zaman kelime',
    '   uzunluğu olan <b>5</b>’e eşit olacak. Tahmin sonuçlarının <b>hangi</b> harfler',
    '   için olduğunu söylemiyoruz, asıl iş bunu bulmak! Örneğin yukarıdaki sayılar',
    '   gizli kelime <b>KALEM</b> iken <b>KELAM</b> tahmininin sonucu; K, L ve M yeşil,',
    '   A ve E’nin yerleri farklı.</p>',

    '<ul>',
    '  <li>Tahmin ettiğin kelimelerin içindeki harflere <b>tıklayarak</b>, harflere ait',
    '      tahminleri not alabilirsin. Harflerin renkleri üzerlerine tıkladıkça sırasıyla',
    '      değişir: kırmızı → sarı → yeşil → boş. Bu sayede tahminlerin için farklı',
    '      senaryolar deneyebilirsin. Bir tahmininin içindeki harflerin hiçbiri gizli',
    '      kelimede yoksa, o harfler otomatik olarak tüm tahminlerde kırmızıya boyanır ve',
    '      bu değiştirilemez — çünkü bu artık bir tahmin değil, kesin bilgidir.</li>',
    '  <li>Eğer bir satırdaki tahminlerini sıfırlamak istersen, satırın solundaki',
    '      <b>↺</b> tuşuna basabilirsin.</li>',
    '  <li>Daha önceki tahminlerinde kullandığın harfler <b>gri</b> görünür ki onları daha',
    '      önce denediğini anlamak daha kolay olsun.</li>',
    '  <li>Yeni bir tahminde bulunurken, <b>Boşluk</b> tuşunu bilmediğin harfin yerine',
    '      <b>·</b> koymak için kullanabilirsin. Böylece taslak oluşturabilirsin.</li>',
    '  <li><b>◫</b> bütün notlarını temizler.</li>',
    '  <li>Sözlükte olmayan bir kelime yazdığında tüm harfler <b>kırmızı ve üstü çizili</b>',
    '      olarak görünür.</li>',
    '  <li><b>Günlük kelime</b> her seviye için günde bir yeni kelime bulundurur ve tüm',
    '      oyuncular için aynıdır. Kaçırdığın günler <b>Arşiv</b>’de durur.</li>',
    '  <li><b>Standart</b> ve <b>İleri</b> olmak üzere 2 farklı seviye var. Standart’ta',
    '      gizli kelime içinde aynı harf iki kez geçmez ve tahmin ederken aynı harfi iki',
    '      kez bulunduran kelimeleri kullanamazsın. İleri için herhangi bir kural yok.</li>',
    '</ul>'
  ].join('\n');

  var pencere = null;

  function kur() {
    if (pencere) { return pencere; }
    pencere = document.createElement('dialog');
    pencere.id = 'yardim-pencere';
    pencere.innerHTML = ICERIK;
    document.body.appendChild(pencere);
    pencere.querySelector('.kapat').addEventListener('click', function () {
      pencere.close();
    });
    return pencere;
  }

  /* Giris sayfasinda pencerenin ust kenari "Günlük kelime" kartinin ust
   * kenariyla hizalanir. Asagida yeterli yer kalmiyorsa (dar/kisa ekran)
   * varsayilan ortalanmis konum korunur. */
  function hizala(p) {
    var kart = document.getElementById('gunluk-kart');
    p.style.marginTop = '';
    p.style.maxHeight = '';
    if (!kart) { return; }
    var ust = Math.round(kart.getBoundingClientRect().top);
    if (ust < 40 || window.innerHeight - ust < 420) { return; }
    p.style.marginTop = ust + 'px';
    p.style.maxHeight = (window.innerHeight - ust - 24) + 'px';
  }

  global.KB = global.KB || {};
  global.KB.yardim = {
    ac: function () {
      var p = kur();
      hizala(p);
      p.showModal();
    }
  };
}(window));
