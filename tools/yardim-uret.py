#!/usr/bin/env python3
"""src/yardim.js dosyasini nasil-oynanir.html'den uretir.

Kural metninin tek kaynagi nasil-oynanir.html icindeki #kurallar bolumudur.
Oyun icindeki "Nasil oynanir" penceresi ayni metni kullanir; iki yerde ayri
metin tutulmasin diye pencere buradan uretilir.

Metni degistirdikten sonra:
    python3 tools/yardim-uret.py
"""
import io
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAYNAK = os.path.join(KOK, 'nasil-oynanir.html')
HEDEF = os.path.join(KOK, 'src', 'yardim.js')

BASLIK = (
    "'<div class=\"pencere-baslik\">' +\n"
    "    '  <h2>KELİME500 nasıl oynanır?</h2>' +\n"
    "    '  <button class=\"simge kapat\" type=\"button\" title=\"Kapat\">✕</button>' +\n"
    "    '</div>'"
)

KALIP = '''/* "Nasil oynanir" penceresi.
 *
 * BU DOSYA URETILMISTIR - elle duzenleme.
 * Kural metninin kaynagi nasil-oynanir.html icindeki #kurallar bolumudur.
 * Metni orada degistir, sonra: python3 tools/yardim-uret.py
 *
 * Pencere ilk acilista sayfaya eklenir, sonrasinda yeniden kullanilir. */
(function (global) {
  'use strict';

  var BASLIK =
    %(baslik)s;

  var GOVDE = [
%(govde)s
  ].join('\\n');

  var pencere = null;

  function kur() {
    if (pencere) { return pencere; }
    pencere = document.createElement('dialog');
    pencere.id = 'yardim-pencere';
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

  /* Giris sayfasinda pencerenin ust kenari "Nasıl oynanır" kartinin ust
   * kenariyla hizalanir. Asagida yeterli yer kalmiyorsa (dar/kisa ekran)
   * varsayilan ortalanmis konum korunur. */
  function hizala(p) {
    var kart = document.getElementById('nasil-kart');
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
'''


def kurallari_oku():
    s = io.open(KAYNAK, encoding='utf-8').read()
    m = re.search(r'<div id="kurallar">(.*?)\n\s*</div>\s*<!-- KURALLAR BITIS -->',
                  s, flags=re.S)
    if not m:
        sys.exit('nasil-oynanir.html icinde #kurallar bolumu bulunamadi')
    satirlar = [l.strip() for l in m.group(1).strip('\n').split('\n')]
    return [l for l in satirlar if l]


def js_dizisi(satirlar):
    out = []
    for l in satirlar:
        kacisli = l.replace('\\', '\\\\').replace("'", "\\'")
        out.append("    '" + kacisli + "'")
    return ',\n'.join(out)


def main():
    satirlar = kurallari_oku()
    io.open(HEDEF, 'w', encoding='utf-8').write(
        KALIP % {'baslik': BASLIK, 'govde': js_dizisi(satirlar)})
    print('src/yardim.js uretildi: %d satir kural metni' % len(satirlar))


if __name__ == '__main__':
    main()
