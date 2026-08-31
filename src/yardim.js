/* Nasil oynanir penceresi. Giris sayfasi ve oyun sayfasi ayni pencereyi
 * kullanir; metin tek yerde dursun diye markup burada tutuluyor.
 * Pencere ilk acilista sayfaya eklenir, sonra tekrar kullanilir. */
(function (global) {
  'use strict';

  var ICERIK = [
    '  <button class="simge kapat" type="button">✕</button>',
    '  <h2>Nasıl oynanır?</h2>',
    '  <p>Gizli Türkçe kelimeyi <b>8 hakta</b> bulmaya çalışıyorsun. Her tahminden sonra üç sayı görürsün:</p>',
    '  <div class="ornek">',
    '    <span class="rozet duz yer">3</span><p>harf doğru <b>ve yeri doğru</b></p>',
    '  </div>',
    '  <div class="ornek">',
    '    <span class="rozet duz harf">2</span><p>harf kelimede <b>var ama yeri yanlış</b></p>',
    '  </div>',
    '  <div class="ornek">',
    '    <span class="rozet duz yok">0</span><p>harf kelimede <b>hiç yok</b></p>',
    '  </div>',
    '  <p>Üçünün toplamı her zaman kelime uzunluğudur. <b>Hangi</b> harfler olduğu söylenmez — asıl iş',
    '     bunu çıkarmak. Yukarıdaki sayılar, gizli kelime <b>KALEM</b> iken <b>KELAM</b> tahmininin',
    '     sonucudur: K, L ve M yerli yerinde; A ile E kelimede var ama yerleri karışmış.</p>',
    '  <ul>',
    '    <li>Gönderilmiş tahminlerdeki harflere <b>tıklayarak</b> not al: sırayla kırmızı → sarı →',
    '        yeşil → boş. Klavye tuşuna <b>sağ tıkla</b> (dokunmatikte basılı tut) elediğin harfleri',
    '        işaretle. Notlar yalnızca senin için; oyuna etkisi yok. Bir tahminin üç sayısı da <b>0</b>',
    '        çıkarsa (hiçbir harfi kelimede yoksa), o harfler her yerde otomatik kırmızıya boyanır ve',
    '        bu değiştirilemez — çünkü bu artık bir tahmin değil, kesin bilgidir.</li>',
    '    <li>Satırın solundaki <b>↺</b> düğmesi o satırın notlarını sıfırlar (otomatik kırmızı olan',
    '        hücreler hariç). Klavyede daha önce denediğin harfler de kendiliğinden gri',
    '        görünür.</li>',
    '    <li><b>Boşluk</b> tuşu bilinmeyen harfin yerini <b>·</b> ile boş bırakır; satırı böyle taslak',
    '        kurabilirsin (göndermek için hepsini doldurman gerekir).</li>',
    '    <li><b>💡</b> düğmesi, o ana kadarki bütün sayılarla uyumlu bir kelimeyi satıra yazar.',
    '        En az bir tahmin yapmış olman gerekir ve bedeli vardır: onayladığında oyun',
    '        <b>kayıp sayılır</b>, serin sıfırlanır.</li>',
    '    <li><b>◫</b> bütün notları temizler.</li>',
    '    <li>Sözlükte olmayan bir kelime yazdığında satır <b>kırmızı ve üstü çizili</b> görünür —',
    '        Enter\'a basmana gerek yok, hemen anlarsın. Böyle bir tahmin hak yakmaz.</li>',
    '    <li>Günlük kelime her gece yenilenir ve herkeste aynıdır. Kaçırdığın günler',
    '        <b>Arşiv</b>\'de durur; arşiv yalnızca düne kadar gider, bugünün kelimesi',
    '        Günlük\'te oynanır.</li>',
    '    <li>Kelime her seviyede <b>5 harflidir</b>; değişen şey gizli kelimenin kuralları:',
    '      <b>Standart</b> — aynı harf iki kez geçmez, seyrek harfler (J, F, V, Ğ) çıkmaz;',
    '      <b>Standart+</b> — aynı harf iki kez geçmez;',
    '      <b>İleri</b> — her şey serbest. Seyrek harf kısıtı <b>tahminlerini de bağlar</b>:',
    '      Standart\'ta J, F, V, Ğ içeren bir kelime tahmin olarak girilemez. Harf tekrarı',
    '      kısıtı yalnızca gizli kelime seçimini etkiler; tahmin olarak tekrarlı harfli bir',
    '      kelime her seviyede girilebilir.</li>',
    '  </ul>'
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

  global.KB = global.KB || {};
  global.KB.yardim = { ac: function () { kur().showModal(); } };
}(window));
