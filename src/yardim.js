/* "Nasil oynanir" penceresi.
 *
 * BU DOSYA URETILMISTIR - elle duzenleme.
 * Kural metninin kaynagi nasil-oynanir.html icindeki #kurallar bolumudur.
 * Metni orada degistir, sonra: python3 tools/yardim-uret.py
 *
 * Pencere ilk acilista sayfaya eklenir, sonrasinda yeniden kullanilir. */
(function (global) {
  'use strict';

  var BASLIK =
    '<div class="pencere-baslik">' +
    '  <h2>KELİME500 nasıl oynanır?</h2>' +
    '  <button class="simge kapat" type="button" title="Kapat">✕</button>' +
    '</div>';

  var GOVDE = [
    '<p>Gizli Türkçe kelimeyi <b>8 veya daha az</b> tahminde bulmaya çalışıyorsun.',
    'Kelime <b>5 harfli</b> ve her gün yeni; aynı gün oynayan herkes aynı kelimeyi',
    'oynuyor.</p>',
    '<h3>Sayılar ne anlatıyor</h3>',
    '<p>Her tahminden sonra kelimenin yanında üç sayı çıkar:</p>',
    '<div class="ornek"><span class="rozet duz yer">3</span>',
    '<p>harf gizli kelimede <b>var ve yeri doğru</b>.</p></div>',
    '<div class="ornek"><span class="rozet duz harf">2</span>',
    '<p>harf gizli kelimede <b>var ama yeri yanlış</b>.</p></div>',
    '<div class="ornek"><span class="rozet duz yok">0</span>',
    '<p>harf gizli kelimede <b>yok</b>.</p></div>',
    '<p>Üç sayının toplamı her zaman <b>5</b>&#39;tir. Sayıların <b>hangi</b> harfler için',
    'olduğunu söylemiyoruz; asıl iş bunu bulmak. Yukarıdaki örnek, gizli kelime',
    '<b>KALEM</b> iken <b>KELAM</b> tahmininin sonucu: K, L ve M doğru yerde, A ile',
    'E kelimede var ama yerleri farklı.</p>',
    '<h3>Not al</h3>',
    '<p>Tahmin ettiğin harflere <b>dokunarak</b> renk verirsin: kırmızı → sarı → yeşil →',
    'boş. Bu renkler senin notların, oyunun cevabı değil; farklı senaryoları tahtada',
    'deneyebilirsin. Verdiğin renk yalnızca dokunduğun kutuya işlenir, çünkü aynı',
    'harf bir tahminde sarı, başka bir tahminde yeşil olabilir.</p>',
    '<ul>',
    '<li>Notların <b>klavyeye de yansır</b>: bir harfi sarı yaptığında klavyedeki tuş',
    'da soluk sarı olur.</li>',
    '<li>Bir tahminin harflerinin hiçbiri kelimede yoksa (kırmızı sayı 5 ise) o harfler',
    'bütün tahminlerde otomatik kırmızıya boyanır ve <b>değiştirilemez</b> — bu',
    'artık tahmin değil, kesin bilgidir.</li>',
    '<li>Satırın solundaki <i class="ikon ikon-supurge" role="img" aria-label="süpürge"></i>',
    'tuşu o satırın notlarını, klavyedeki aynı tuş bütün notları temizler.</li>',
    '<li>Daha önce denediğin harfler klavyede <b>gri</b> görünür.</li>',
    '<li>Tahmin yazarken <b>Boşluk</b> tuşu, bilmediğin harfin yerine <b>·</b> koyar;',
    'böylece taslak kurabilirsin.</li>',
    '<li>Sözlükte olmayan bir kelime yazarsan harfler <b>kırmızı ve üstü çizili</b>',
    'görünür, tahmin gönderilmez.</li>',
    '</ul>',
    '<h3>Jokerler</h3>',
    '<p>Klavyenin sol altındaki <b>J</b> tuşu birkaç tahminden sonra parlar. İki joker',
    'var ve ikisi de <b>son tahminin</b> üzerinde çalışır:</p>',
    '<ul>',
    '<li><b>Harf jokeri:</b> seçtiğin harfin gizli kelimede olup olmadığını söyler.</li>',
    '<li><b>Kutu jokeri:</b> seçtiğin kutunun gerçek rengini gösterir.</li>',
    '</ul>',
    '<p>Harf jokeri 2., kutu jokeri 3. tahminden sonra açılır; İleri seviyede birer tur',
    'daha geç. Her ikisi de <b>kelime başına bir kez</b> kullanılır ve bir turda',
    'yalnızca bir joker kullanabilirsin.</p>',
    '<p>Joker sana sadece o kutuyu açmaz: oyun bu bilgiden <b>çıkarabildiği her şeyi</b>',
    'bütün tahminlere işler. Bir harfin kelimede olmadığı kesinleşirse o harf her',
    'yerde kırmızı olur; bir kutunun yeşil olduğu kesinleşirse aynı harf aynı yerde',
    'geçen diğer tahminlerde de yeşil olur. Kesinleşen kutular kilitlenir, rengi',
    'değiştiremezsin. Bir harfin kelimede olduğu biliniyor ama rengi belli değilse o',
    'kutu çerçeveyle işaretlenir ve orada kırmızı seçilemez.</p>',
    '<p>Joker kullanmak kazanmanı engellemez, serini bozmaz; yalnızca paylaştığın',
    'sonuçta ve istatistiklerinde görünür.</p>',
    '<h3>Seviyeler</h3>',
    '<p><b>Standart</b> seviyede gizli kelimede aynı harf iki kez geçmez; aynı kural',
    'tahminlerini de bağlar, harf tekrarlı kelime yazamazsın. <b>İleri</b> seviyede',
    'böyle bir kural yoktur. İki seviyenin kelimeleri ve istatistikleri ayrıdır;',
    'seviyeyi başlıktaki <b>Seviye</b> düğmesinden değiştirirsin.</p>',
    '<h3>Modlar ve seri</h3>',
    '<ul>',
    '<li><b>Günlük kelime:</b> her seviye için günde bir kelime, herkeste aynı.</li>',
    '<li><b>Serbest Mod:</b> arka arkaya istediğin kadar oyna. Sağ üstteki',
    '<b>Yeni kelime</b> düğmesi yeni bir kelime verir.</li>',
    '<li><b>Arşiv:</b> kaçırdığın günleri oynarsın.</li>',
    '<li><b>Seri:</b> günlük kelimeyi üst üste kaç gün bildiğini gösterir. Bir günü',
    'kaçırırsan ya da bilemezsen sıfırlanır. Serbest Mod ve Arşiv seriyi',
    'etkilemez.</li>',
    '</ul>',
    '<p>İstatistiklerin, serilerin ve yarım kalan oyunların yalnızca kendi tarayıcında',
    'saklanır; hesap açman gerekmez.</p>'
  ].join('\n');

  var pencere = null;

  function kur() {
    if (pencere) { return pencere; }
    pencere = document.createElement('dialog');
    pencere.id = 'yardim-pencere';
    pencere.tabIndex = -1;   /* odak kapatma tusunda kalip cerceve birakmasin */
    pencere.innerHTML = BASLIK + '<div class="pencere-govde">' + GOVDE + '</div>';
    document.body.appendChild(pencere);
    /* Kapatma tek bir dugmeye bagli kalmasin: olay pencereye baglanir
     * (icerik yeniden olussa bile calisir) ve pencerenin disina, yani
     * karartilmis zemine tiklamak da kapatir. Esc zaten yerlesik. */
    pencere.addEventListener('click', function (e) {
      if (e.target.closest('.kapat')) { pencere.close(); return; }
      if (e.target === pencere) { pencere.close(); }
    });
    return pencere;
  }

  /* Pencerenin ust kenari, sayfadaki ilk icerik blokunun ust kenariyla
   * hizalanir: giris sayfasinda "Nasıl oynanır" karti, oyun sayfasinda
   * mod etiketi satiri - ikisi de logonun hemen altindaki ilk oge.
   * Asagida yeterli yer kalmiyorsa (dar/kisa ekran) varsayilan ortalanmis
   * konum korunur, yoksa pencere ekrandan tasardi. */
  function hizala(p) {
    var kart = document.getElementById('nasil-kart') ||
               document.getElementById('kontroller');
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
      p.focus();
    }
  };
}(window));
