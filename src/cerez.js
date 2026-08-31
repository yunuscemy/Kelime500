/* Cerez bildirimi ve reklam yukleme kapisi.
 *
 * ONEMLI: Avrupa (EEA/UK) trafigi icin Google, sertifikali bir CMP
 * (Consent Management Platform) zorunlu tutuyor - elle yazilmis bir bildirim
 * yeterli sayilmiyor. AdSense'in kendi ucretsiz araci var:
 *   AdSense > Gizlilik ve mesajlasma > GDPR mesaji
 * Orasi acilirsa bu bildirim Avrupa ziyaretcileri icin devre disi birakilmali,
 * yoksa iki bildirim ust uste cikar. Turkiye trafigi icin bu bildirim yeterli.
 *
 * Reklam kodu KB.reklam.yukle() icine konur; boylece reddedildiginde
 * kisisellestirilmis reklam cerezleri hic yuklenmez. */
(function (global) {
  'use strict';

  var ANAHTAR = 'kelime500.cerez';   /* 'kabul' | 'ret' */

  function oku() {
    try { return JSON.parse(localStorage.getItem(ANAHTAR)); } catch (e) { return null; }
  }
  function yaz(deger) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(deger)); } catch (e) { /* yoksay */ }
  }

  /* --- reklam yukleme kapisi ---
   * Reklam kodu buraya gelecek. kisisel=false ise reklamlar
   * kisisellestirilmemis olarak yuklenmeli (AdSense: requestNonPersonalizedAds). */
  var yuklendi = false;
  function reklamlariYukle(kisisel) {
    if (yuklendi) { return; }
    yuklendi = true;
    /* TODO: AdSense kodu buraya. Ornek:
     *   window.adsbygoogle = window.adsbygoogle || [];
     *   if (!kisisel) { adsbygoogle.requestNonPersonalizedAds = 1; }
     *   var s = document.createElement('script');
     *   s.async = true;
     *   s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX';
     *   s.crossOrigin = 'anonymous';
     *   document.head.appendChild(s);
     */
    void kisisel;
  }

  function bildirimiKaldir() {
    var b = document.getElementById('cerez-bildirimi');
    if (b) { b.remove(); }
  }

  function karar(deger) {
    yaz(deger);
    bildirimiKaldir();
    reklamlariYukle(deger === 'kabul');
  }

  function bildirimGoster() {
    var b = document.createElement('div');
    b.id = 'cerez-bildirimi';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Çerez bildirimi');
    b.innerHTML =
      '<p>Bu sitede reklam gösterebilmek için çerez kullanılıyor. Oyun ilerlemen ' +
      'yalnızca cihazında saklanır. <a href="gizlilik.html">Ayrıntılar</a></p>' +
      '<div class="cerez-dugmeler">' +
      '  <button type="button" class="tus" data-karar="ret">Reddet</button>' +
      '  <button type="button" class="tus vurgulu" data-karar="kabul">Kabul et</button>' +
      '</div>';
    b.addEventListener('click', function (e) {
      var d = e.target.closest('[data-karar]');
      if (d) { karar(d.dataset.karar); }
    });
    document.body.appendChild(b);
  }

  function baslat() {
    var secim = oku();
    if (secim === 'kabul' || secim === 'ret') {
      reklamlariYukle(secim === 'kabul');
    } else {
      bildirimGoster();
    }
  }

  global.KB = global.KB || {};
  global.KB.cerez = { sifirla: function () { try { localStorage.removeItem(ANAHTAR); } catch (e) {} } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }
}(window));
