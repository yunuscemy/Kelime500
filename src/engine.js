/* Oyun mantığı - arayüzden bağımsız, saf fonksiyonlar. */
(function (global) {
  'use strict';

  var tr = global.KB.tr;

  /* Bir tahminin gizli kelimeye göre puanı.
   * yer  : hem harfi hem yeri doğru olan harf sayısı
   * harf : kelimede geçen ama yeri yanlış olan harf sayısı (çokluk kümesi mantığı)
   * yok  : kelimede hiç bulunmayan harf sayısı
   * Üçü toplanınca kelime uzunluğunu verir. Hangi harflerin hangi kutuya
   * girdiği söylenmez - oyunun bütün mesele bu. */
  function puanla(tahmin, gizli) {
    var yer = 0, kalanGizli = Object.create(null), kalanTahmin = [];

    for (var i = 0; i < gizli.length; i++) {
      if (tahmin[i] === gizli[i]) {
        yer++;
      } else {
        kalanGizli[gizli[i]] = (kalanGizli[gizli[i]] || 0) + 1;
        kalanTahmin.push(tahmin[i]);
      }
    }

    var harf = 0;
    for (var j = 0; j < kalanTahmin.length; j++) {
      var h = kalanTahmin[j];
      if (kalanGizli[h] > 0) { kalanGizli[h]--; harf++; }
    }

    return { yer: yer, harf: harf, yok: gizli.length - yer - harf };
  }

  /* Aday kelime, o ana kadarki bütün geri bildirimlerle uyumlu mu? */
  function tutarli(aday, gecmis) {
    for (var i = 0; i < gecmis.length; i++) {
      var s = puanla(gecmis[i].tahmin, aday);
      if (s.yer !== gecmis[i].yer || s.harf !== gecmis[i].harf) { return false; }
    }
    return true;
  }

  /* Geçmişle uyumlu kelimeler - ipucu ve "kaç kelime kaldı" göstergesi için. */
  function adaylar(sozluk, gecmis, sinir) {
    var out = [];
    for (var i = 0; i < sozluk.length; i++) {
      if (tutarli(sozluk[i], gecmis)) {
        out.push(sozluk[i]);
        if (sinir && out.length >= sinir) { break; }
      }
    }
    return out;
  }

  /* Tarih + zorluk icin sabit sayi ureten hash (FNV-1a + son karistirma).
   * Math.imul sart: h * 16777619 JS'in guvenli tamsayi sinirini asiyor,
   * kayan nokta aritmetigi dusuk bitleri atiyordu. Bu yuzden eski surumde
   * secilen havuz indeksleri hep 4'un kati cikiyor, havuzun dortte biri hic
   * kullanilmiyordu. Sondaki karistirma dusuk bitlerin de degismesini saglar. */
  function tohum(metin) {
    var h = 2166136261, i;
    for (i = 0; i < metin.length; i++) {
      h ^= metin.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 16; h = Math.imul(h, 2246822507);
    h ^= h >>> 13; h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /* Tohumdan deterministik sayi dizisi ureten jenerator (mulberry32). */
  function uretec(baslangic) {
    var a = baslangic >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Havuzun deterministik karilmis sirasi (Fisher-Yates). Ayni anahtar
   * her cihazda ayni sirayi verir. */
  function permutasyon(n, anahtar) {
    var rnd = uretec(tohum(anahtar)), dizi = [], i, j, g;
    for (i = 0; i < n; i++) { dizi[i] = i; }
    for (i = n - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      g = dizi[i]; dizi[i] = dizi[j]; dizi[j] = g;
    }
    return dizi;
  }

  var BASLANGIC = '2026-01-01';   /* gun sayacinin sifir noktasi */

  function gunNumarasi(tarih) {
    var a = tarih.split('-'), b = BASLANGIC.split('-');
    return Math.round((Date.UTC(+a[0], +a[1] - 1, +a[2]) -
                       Date.UTC(+b[0], +b[1] - 1, +b[2])) / 86400000);
  }

  /* --- gunun kelimeleri ---
   *
   * Iki kural birden saglanir:
   *   1) Ayni gun Standart ve Ileri asla ayni kelimeyi vermez.
   *   2) Bir seviyede havuzun tamami birer kez cikmadan hicbiri tekrar etmez.
   *
   * Yontem: her havuz bir kez karilir, gunler bu sabit sirada ilerler (2. kural).
   * Cakisma oldugunda siradaki kelimeye ATLANMAZ - atlamak diziyi kaydirip
   * 2. kurali bozuyordu. Bunun yerine ayni dongu icinde iki gunun kelimesi
   * TAKAS edilir; takas her kelimenin dongude bir kez cikmasini bozmaz.
   * Sonuc deterministiktir: ayni gun her cihazda ayni kelime. */

  var STANDART_ANAHTAR = 'standart|kelime500';
  var ILERI_ANAHTAR = 'ileri|kelime500';
  var sıraOnbellek = {};

  function dongudeSira(gun, n) { return gun - Math.floor(gun / n) * n; }

  function standartKelime(havuzlar, gun) {
    var n = havuzlar.standart.length;
    return havuzlar.standart[permutasyon(n, STANDART_ANAHTAR)[dongudeSira(gun, n)]];
  }

  /* Ileri havuzunun bir dongudeki sirasi, cakismalar takasla giderilmis hali. */
  function ileriSirasi(havuzlar, tur) {
    var anahtar = tur + ':' + havuzlar.ileri.length + ':' + havuzlar.standart.length;
    if (sıraOnbellek[anahtar]) { return sıraOnbellek[anahtar]; }

    var n = havuzlar.ileri.length;
    var sira = permutasyon(n, ILERI_ANAHTAR).slice();
    var kelime = function (i) { return havuzlar.ileri[sira[i]]; };

    for (var i = 0; i < n; i++) {
      var gun = tur * n + i;
      if (kelime(i) !== standartKelime(havuzlar, gun)) { continue; }
      /* Takas edilecek gunu ara: takastan sonra iki gun de temiz kalmali. */
      for (var d = 1; d < n; d++) {
        var j = (i + d) % n, gunJ = tur * n + j;
        if (kelime(j) !== standartKelime(havuzlar, gun) &&
            kelime(i) !== standartKelime(havuzlar, gunJ)) {
          var g = sira[i]; sira[i] = sira[j]; sira[j] = g;
          break;
        }
      }
    }
    sıraOnbellek[anahtar] = sira;
    return sira;
  }

  /* Gunun kelimesi. havuzlar: { standart: [...], ileri: [...] } */
  function gunlukKelime(havuzlar, tarih, zorlukAdi) {
    var gun = gunNumarasi(tarih);
    if (zorlukAdi === 'standart') {
      return havuzlar.standart.length ? standartKelime(havuzlar, gun) : null;
    }
    var n = havuzlar.ileri.length;
    if (!n) { return null; }
    var tur = Math.floor(gun / n);
    return havuzlar.ileri[ileriSirasi(havuzlar, tur)[dongudeSira(gun, n)]];
  }

  function rastgeleKelime(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function tekrarsiz(kelime) {
    var g = Object.create(null);
    for (var i = 0; i < kelime.length; i++) {
      if (g[kelime[i]]) { return false; }
      g[kelime[i]] = true;
    }
    return true;
  }

  /* Kelime, verilen nadir harflerin hiçbirini içermiyor mu? */
  function nadirsiz(kelime, nadirHarfler) {
    for (var i = 0; i < kelime.length; i++) {
      if (nadirHarfler.indexOf(kelime[i]) !== -1) { return false; }
    }
    return true;
  }

  /* Bir tahminde yer=0 ve harf=0 ise, o tahmindeki HER harf gizli kelimede
   * kesinlikle yoktur - bu bir tahmin değil, puanlama mantığının garantisidir.
   * Geçmişteki bütün böyle tahminlerin harflerini birleştirip kesin-yok
   * kümesini döndürür; notları otomatik kırmızıya boyamak için kullanılır. */
  function kesinYokHarfler(gecmis) {
    var s = Object.create(null);
    gecmis.forEach(function (g) {
      if (g.yer === 0 && g.harf === 0) {
        g.tahmin.split('').forEach(function (h) { s[h] = true; });
      }
    });
    return s;
  }

  /* Bir tahmindeki HER harfin gizli kelimeye göre gerçek rengi.
   * Dönen dizi NOT_SINIF indeksleriyle aynıdır: 1 kırmızı, 2 sarı, 3 yeşil.
   * Oyun boyunca bu bilgi oyuncudan saklanır; yalnızca oyun kazanıldığında
   * perde açılırken kullanılır. Çokluk kümesi mantığı puanla() ile aynıdır:
   * önce yerinde olanlar ayrılır, kalan harfler sırayla eşleştirilir. */
  function harfRenkleri(tahmin, gizli) {
    var n = tahmin.length, renk = new Array(n), kalan = Object.create(null), i;

    for (i = 0; i < n; i++) {
      if (tahmin[i] === gizli[i]) { renk[i] = 3; }
      else { kalan[gizli[i]] = (kalan[gizli[i]] || 0) + 1; }
    }
    for (i = 0; i < n; i++) {
      if (renk[i]) { continue; }
      if (kalan[tahmin[i]] > 0) { kalan[tahmin[i]]--; renk[i] = 2; }
      else { renk[i] = 1; }
    }
    return renk;
  }

  global.KB = global.KB || {};
  global.KB.motor = {
    puanla: puanla,
    tutarli: tutarli,
    adaylar: adaylar,
    tohum: tohum,
    gunlukKelime: gunlukKelime,
    rastgeleKelime: rastgeleKelime,
    tekrarsiz: tekrarsiz,
    nadirsiz: nadirsiz,
    kesinYokHarfler: kesinYokHarfler,
    harfRenkleri: harfRenkleri
  };
}(window));
