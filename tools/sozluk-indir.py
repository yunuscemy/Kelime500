#!/usr/bin/env python3
"""Turkce kelime listelerini indirip src/sozluk.js dosyasini uretir.

Birincil kaynak TDK Guncel Turkce Sozluk'un madde basligi listesidir. Ustune,
TDK maddelerinden turetilmis herkese acik iki liste eklenir; boylece birinde
eksik kalan kelime digerinden gelir. Yalnizca madde basliklari kullanilir -
sozluk tanimlari indirilmez ve depoda tutulmaz.

Kelimeleri hangi kurallarla ayikladigi tools/sozluk_ortak.py icindedir;
tools/denetim.py ayni kurallarla sonucu denetler.
"""
import importlib.util, pathlib, sys

_yol = pathlib.Path(__file__).resolve().parent / 'sozluk_ortak.py'
_spec = importlib.util.spec_from_file_location('sozluk_ortak', _yol)
ortak = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ortak)

ONBELLEK = pathlib.Path(__file__).resolve().parent / '.tdk-onbellek.json'

kelimeler = {n: set() for n in ortak.UZUNLUKLAR}


def ekle(maddeler, kaynak_adi):
    onceki = sum(len(v) for v in kelimeler.values())
    for madde in maddeler:
        kelime, _ = ortak.ayikla(madde)
        if kelime:
            kelimeler[len(kelime)].add(kelime)
    print('  %s: +%d yeni' % (kaynak_adi, sum(len(v) for v in kelimeler.values()) - onceki))


print('indiriliyor (TDK):', ortak.TDK)
ekle(ortak.tdk_maddeleri(onbellek=ONBELLEK), 'TDK')

for url in ortak.EK_KAYNAKLAR:
    print('indiriliyor:', url)
    ekle(ortak.indir(url).splitlines(), url.rsplit('/', 3)[1])

if not kelimeler[5]:
    sys.exit('5 harfli kelime bulunamadi, kaynaklari kontrol et')

parcalar = []
for n in ortak.UZUNLUKLAR:
    liste = sorted(kelimeler[n])
    satirlar = ['    ' + ' '.join(liste[i:i + 12]) for i in range(0, len(liste), 12)]
    parcalar.append('  %d: `\n%s`' % (n, '\n'.join(satirlar)))
    print('%d harf: %d kelime' % (n, len(liste)))

icerik = '''/* Turkce kelime sozlugu - TAHMIN olarak kabul edilen kelimeler.
 * tools/sozluk-indir.py tarafindan uretildi, elle duzenleme.
 * Gizli kelime bu listeden secilmez; cevap havuzu src/words.js icindedir. */
(function (global) {
  'use strict';
  global.KB = global.KB || {};
  global.KB.sozlukHam = {
%s
  };
}(window));
''' % (',\n'.join(parcalar))

(ortak.KOK / 'src/sozluk.js').write_text(icerik, encoding='utf-8')
print('src/sozluk.js yazildi')
