/* Türkçe harf yardımcıları: i/ı ayrımı doğru çalışsın diye her yerde bunlar kullanılır. */
(function (global) {
  'use strict';

  var ALFABE = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

  var BUYUK = { 'i': 'İ', 'ı': 'I' };
  var KUCUK = { 'İ': 'i', 'I': 'ı' };

  function buyut(s) {
    return String(s).replace(/[iı]/g, function (c) { return BUYUK[c]; }).toUpperCase();
  }

  function kucult(s) {
    return String(s).replace(/[İI]/g, function (c) { return KUCUK[c]; }).toLowerCase();
  }

  function gecerliHarfler(buyukKelime) {
    for (var i = 0; i < buyukKelime.length; i++) {
      if (ALFABE.indexOf(buyukKelime[i]) === -1) { return false; }
    }
    return buyukKelime.length > 0;
  }

  /* Türkçe Q klavye düzeni, W/X/Q çıkarılmış hâli. */
  var KLAVYE = [
    'E R T Y U I O P Ğ Ü'.split(' '),
    'A S D F G H J K L Ş İ'.split(' '),
    'Z C V B N M Ö Ç'.split(' ')
  ];

  global.KB = global.KB || {};
  global.KB.tr = {
    ALFABE: ALFABE,
    KLAVYE: KLAVYE,
    buyut: buyut,
    kucult: kucult,
    gecerliHarfler: gecerliHarfler
  };
}(window));
