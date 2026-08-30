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

  /* Tarih + zorluk için sabit sayı üreten hash (FNV-1a). Aynı gün herkeste aynı kelime. */
  function tohum(metin) {
    var h = 2166136261;
    for (var i = 0; i < metin.length; i++) {
      h ^= metin.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function gunlukKelime(liste, tarih, zorlukAdi) {
    return liste[tohum(tarih + '|' + zorlukAdi + '|kelimebul') % liste.length];
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
