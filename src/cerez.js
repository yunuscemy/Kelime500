/* Cerez bildirimi ve reklam yukleme kapisi.
 *
 * ONEMLI: Avrupa (EEA/UK) trafigi icin Google, sertifikali bir CMP
 * (Consent Management Platform) zorunlu tutuyor - elle yazilmis bir bildirim
 * yeterli sayilmiyor. AdSense'in kendi ucretsiz araci var:
 *   AdSense > Gizlilik ve mesajlasma > GDPR mesaji
 * Orasi acilirsa bu bildirim Avrupa ziyaretcileri icin devre disi birakilmali,
 * yoksa iki bildirim ust uste cikar. Turkiye trafigi icin bu bildirim yeterli.
 *
 * AdSense kodunun kendisi her sayfanin <head> kismindadir; burasi yalnizca
 * bildirimi gosterir ve reddedilirse kisisellestirmeyi kapatir. */
(function (global) {
  'use strict';

  var ANAHTAR = 'kelime500.cerez';   /* 'kabul' | 'ret' */

  function oku() {
    try { return JSON.parse(localStorage.getItem(ANAHTAR)); } catch (e) { return null; }
  }
  function yaz(deger) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(deger)); } catch (e) { /* yoksay */ }
  }

  /* --- reklam kisisellestirmesi ---
   * AdSense kodu her sayfanin <head> kisminda duruyor: Google'in dogrulamasi
   * ve incelemesi orada olmasini istiyor, cerez bildirimini de beklemiyor.
   * Burada yalnizca kisisellestirme kapatiliyor - ziyaretci "Reddet" derse
   * reklam yine cikar ama kisisel veriye dayanmaz. Sayfa ilk acilirken ayni
   * bayragi <head> icindeki kucuk betik kayitli secime bakarak koyuyor;
   * burasi karar oturum icinde degisirse devreye giriyor. */
  function reklamlariYukle(kisisel) {
    window.adsbygoogle = window.adsbygoogle || [];
    if (!kisisel) { window.adsbygoogle.requestNonPersonalizedAds = 1; }
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
      'yalnızca cihazında saklanır. <a href="gizlilik">Ayrıntılar</a></p>' +
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

  /* --- yan reklam bantlarinin dikey hizasi ---
   * Bantlar sayfadaki ilk icerik blokunun ust hizasina oturur: giris
   * sayfasinda "Nasıl oynanır" karti, oyun sayfasinda mod etiketi satiri.
   * Sabit bir piksel degeri yazmiyoruz - baslik yuksekligi tasarimla
   * degisiyor, olculerek bulunuyor. */
  function yanBantlariHizala() {
    var capa = document.getElementById('nasil-kart') ||
               document.getElementById('kontroller');
    if (!capa) { return; }
    var ust = Math.round(capa.getBoundingClientRect().top + window.pageYOffset);
    document.documentElement.style.setProperty('--reklam-ust', ust + 'px');
  }

  function baslat() {
    yanBantlariHizala();
    window.addEventListener('resize', yanBantlariHizala);

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
