#!/usr/bin/env python3
"""TDK'de gecip src/sozluk.js'te eksik kalan kelime var mi diye denetler.

LEMUR olayindan sonra eklendi: TDK maddesi "lemur " seklinde sonunda boslukla
kayitliydi, suzgec onu cok kelimeli bir giris sanip elemisti. Bu betik ayni
hatanin sessizce tekrar etmesini engeller.

    python3 tools/denetim.py            # ozet
    python3 tools/denetim.py --ayrinti  # elenen maddeleri sebepleriyle listeler

Eksik kelime bulursa 1 ile cikar, boylece bir kontrol adimi olarak kullanilabilir.
"""
import collections, importlib.util, pathlib, sys

_yol = pathlib.Path(__file__).resolve().parent / 'sozluk_ortak.py'
_spec = importlib.util.spec_from_file_location('sozluk_ortak', _yol)
ortak = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ortak)

ONBELLEK = pathlib.Path(__file__).resolve().parent / '.tdk-onbellek.json'
ayrinti = '--ayrinti' in sys.argv

sozluk = ortak.mevcut_sozluk()
if not sozluk:
    sys.exit('src/sozluk.js bulunamadi; once tools/sozluk-indir.py calistir.')

maddeler = ortak.tdk_maddeleri(onbellek=ONBELLEK)
print('TDK madde sayısı: %d' % len(maddeler))

eksik = collections.defaultdict(set)
elenen = collections.Counter()
elenen_ornek = collections.defaultdict(list)
tdk_kelime = collections.defaultdict(set)   # TEKİL kelimeler; TDK'de aynı kelime
madde_sayisi = collections.Counter()        # birden çok madde olarak geçebilir

for madde in maddeler:
    kelime, sebep = ortak.ayikla(madde)
    if kelime is None:
        elenen[sebep] += 1
        if len(elenen_ornek[sebep]) < 6:
            elenen_ornek[sebep].append(madde.strip())
        continue
    madde_sayisi[len(kelime)] += 1
    tdk_kelime[len(kelime)].add(kelime)
    if kelime not in sozluk.get(len(kelime), set()):
        eksik[len(kelime)].add(kelime)

print()
print('Elenen maddeler (oyuna girmesi beklenmeyenler):')
for sebep, adet in elenen.most_common():
    print('  %-24s %6d   örnek: %s' % (sebep, adet, ', '.join(elenen_ornek[sebep][:3])))

print()
print('Uzunluk bazında (TDK\'de aynı kelime birden çok madde olabilir, tekil sayılır):')
print('  uzunluk   TDK madde   TDK tekil   sözlükte   eksik')
for n in ortak.UZUNLUKLAR:
    print('  %5d   %9d   %9d   %8d   %5d'
          % (n, madde_sayisi[n], len(tdk_kelime[n]), len(sozluk.get(n, ())), len(eksik[n])))

toplam = sum(len(v) for v in eksik.values())
print()
if toplam:
    print('EKSİK %d kelime:' % toplam)
    for n in sorted(eksik):
        print('  %d harf (%d): %s' % (n, len(eksik[n]), ', '.join(sorted(eksik[n]))))
    print()
    print('Düzeltmek için: python3 tools/sozluk-indir.py')
    sys.exit(1)

print('Eksik kelime yok — TDK\'deki bütün tek parça kelimeler sözlükte.')

if ayrinti:
    print()
    print('Elenen madde örnekleri:')
    for sebep in elenen:
        print('  %s:' % sebep)
        for m in elenen_ornek[sebep]:
            print('    %s' % m)
