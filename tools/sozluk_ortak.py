#!/usr/bin/env python3
"""Sozluk betiklerinin ortak parcalari: normalizasyon, suzgecler, indirme.

Hem tools/sozluk-indir.py hem tools/denetim.py bunu kullanir; boylece iki betik
kelimeleri her zaman ayni kurallarla degerlendirir.
"""
import json, pathlib, re, urllib.request

KOK = pathlib.Path(__file__).resolve().parent.parent
UZUNLUKLAR = (4, 5, 6)

ALF = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'
BUYUK = {'i': 'İ', 'ı': 'I'}
SAPKA = {'â': 'a', 'î': 'i', 'û': 'u', 'Â': 'a', 'Î': 'i', 'Û': 'u'}

# Bosluk, kisa cizgi, kesme isareti vb. iceren maddeler (deyim, ek, cok kelimeli
# giris, ozel ad) oyuna girmez; yalnizca tek parca kelimeler alinir.
COK_PARCALI = re.compile(r"[\s\-'’(),./0-9]")

TDK = 'https://eski.sozluk.gov.tr/autocomplete.json'

EK_KAYNAKLAR = [
    'https://raw.githubusercontent.com/CanNuhlar/Turkce-Kelime-Listesi/master/turkce_kelime_listesi.txt',
    'https://raw.githubusercontent.com/mertemin/turkish-word-list/master/words.txt',
]


def duzelt(madde):
    """Maddeyi oyunun yazdigi bicime cevirir: sapkasiz, Turkce kurallarina gore buyuk."""
    s = ''.join(SAPKA.get(c, c) for c in madde.strip())
    return ''.join(BUYUK.get(c, c) for c in s).upper()


def ayikla(madde):
    """(kelime, sebep) doner. Kelime None ise madde elenmistir, sebep nedenini soyler.

    Kirpma her zaman suzgecten ONCE yapilir: TDK maddelerinin bir kismi sonunda
    bosluk tasir ("lemur "), kirpmadan bakilirsa cok kelimeli sanilip elenirler.
    """
    ham = (madde or '').strip()
    if not ham:
        return None, 'bos'
    if COK_PARCALI.search(ham):
        return None, 'tek parça değil'
    kelime = duzelt(ham)
    if not all(c in ALF for c in kelime):
        return None, 'harf dışı işaret / yabancı harf'
    if len(kelime) not in UZUNLUKLAR:
        return None, 'uzunluk dışı'
    return kelime, None


def indir(url, zaman_asimi=300):
    istek = urllib.request.Request(url, headers={'User-Agent': 'kelimebul-sozluk/1.0'})
    with urllib.request.urlopen(istek, timeout=zaman_asimi) as yanit:
        return yanit.read().decode('utf-8', 'replace')


def tdk_maddeleri(onbellek=None):
    """TDK madde basliklarini dondurur. onbellek verilirse oradan okur/oraya yazar."""
    if onbellek and pathlib.Path(onbellek).exists():
        ham = pathlib.Path(onbellek).read_text(encoding='utf-8')
    else:
        ham = indir(TDK)
        if onbellek:
            pathlib.Path(onbellek).write_text(ham, encoding='utf-8')
    return [kayit.get('madde', '') for kayit in json.loads(ham)]


def mevcut_sozluk():
    """src/sozluk.js icindeki kelimeleri {uzunluk: set} olarak okur."""
    dosya = KOK / 'src/sozluk.js'
    if not dosya.exists():
        return {}
    metin = dosya.read_text(encoding='utf-8')
    return {int(n): set(govde.split())
            for n, govde in re.findall(r'(\d+): `\n(.*?)`', metin, re.S)}
