#!/usr/bin/env python3
"""Cevap havuzunu (src/words.js) ve sozluk boyutlarini kelime-listesi.md olarak yazar."""
import re, pathlib

KOK = pathlib.Path(__file__).resolve().parent.parent
ALF = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'
SIRA = {c: i for i, c in enumerate(ALF)}
BUYUK = {'i': 'İ', 'ı': 'I'}

def buyut(w):
    return ''.join(BUYUK.get(c, c) for c in w).upper()

def anahtar(w):
    return [SIRA[c] for c in w]

sozluk = {}
sozluk_js = KOK / 'src/sozluk.js'
if sozluk_js.exists():
    metin = sozluk_js.read_text(encoding='utf-8')
    for n, govde in re.findall(r'(\d+): `\n(.*?)`', metin, re.S):
        sozluk[int(n)] = len(govde.split())

kaynak = (KOK / 'src/words.js').read_text(encoding='utf-8')
govde = kaynak[kaynak.index('var HAM'):kaynak.index('function bosluklaAyir')]
blok = re.search(r'\n\s+5: \{(.*?)\n    \}', govde, re.S).group(1)
alan = dict(re.findall(r'(cozum|ekstra): `([^`]*)`', blok, re.S))

cevaplar, hepsi, gorulen = set(), [], set()
for tur in ('cozum', 'ekstra'):
    for ham in alan[tur].split():
        w = buyut(ham)
        if len(w) != 5 or any(c not in ALF for c in w):
            raise SystemExit('gecersiz kelime: ' + ham)
        if tur == 'cozum':
            cevaplar.add(w)
        if w not in gorulen:
            gorulen.add(w)
            hepsi.append(w)
hepsi.sort(key=anahtar)

tekrarsiz  = lambda w: len(set(w)) == len(w)
standart   = [w for w in cevaplar if tekrarsiz(w)]

satir = [
    '# Kelime listesi (5 harf)', '',
    'Oyunun **cevap havuzu** asagida tam olarak listelenmistir: gizli kelime yalnizca',
    'bu kelimelerden secilir. **Tahmin** olarak ise cok daha genis bir sozluk kabul',
    'edilir (`src/sozluk.js`), bu yuzden listede gormedigin bir kelimeyi de deneyebilirsin.',
    '', '| | adet |', '| --- | --- |',
    f'| Tahmin olarak kabul edilen kelimeler | {sozluk.get(5, 0) or len(hepsi)} |',
    f'| **Cevap havuzu** (asagidaki liste) | {len(cevaplar)} |',
    f'| — **Standart** seviyede cikabilenler (ayni harf iki kez gecmez) | {len(standart)} |',
    f'| — **Ileri** (hepsi) | {len(cevaplar)} |',
    '',
    'Bu dosya `python3 tools/liste-cikar.py` ile uretilir.', '',
    '## Cevap havuzu', '',
]

hepsi = sorted(cevaplar, key=anahtar)
harf, grup = None, []
for w in hepsi:
    if w[0] != harf:
        if grup:
            satir += [' · '.join(grup), '']
        harf, grup = w[0], []
        satir += [f'### {harf}', '']
    grup.append(w)
if grup:
    satir += [' · '.join(grup), '']

(KOK / 'kelime-listesi.md').write_text('\n'.join(satir), encoding='utf-8')
print(f'kelime-listesi.md: {len(cevaplar)} cevap '
      f'(Standart {len(standart)}), '
      f'sozlukte {sozluk.get(5, 0)} kabul edilen tahmin')
