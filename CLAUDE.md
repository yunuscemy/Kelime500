# Kelime500 — Claude için proje kuralları

Projenin ne olduğu ve nasıl çalıştırılacağı `README.md` içinde. Bu dosya
sadece **yanlışlıkla kırılabilecek şeyleri** anlatır. Değişiklik yapmadan
önce oku.

Site canlıda: <https://kelime500.com> — Cloudflare Pages, `main` dalını
otomatik yayınlıyor.

---

## 1. En kritik kural: kelime listesine dokunma

Günlük kelime hiçbir yerde saklanmaz; her cihazda **tarihten hesaplanır**.
Hesap, kelime havuzunun **içeriğine ve sırasına** bağlı:

```js
permutasyon(n, anahtar)   // n = havuzdaki kelime sayısı
```

Bu yüzden `src/words.js` içindeki `cozum` listesine **tek kelime eklemek,
silmek, hatta sırayı değiştirmek** geçmiş günler dahil bütün cevapları
kaydırır.

Ölçüldü (2026-09-04): listenin **sonuna** tek kelime eklemek 500 günün
**500'ünü** birden değiştirdi. Örnekler:

| Tarih | Önce | Sonra |
|---|---|---|
| 31 Ağustos (yayın günü) | AMPUL | KENAR |
| 3 Eylül | NÖBET | KİMSE |
| 4 Eylül | KABUS | NİYET |

Bu **sessiz** bir kırılmadır: hata vermez, test kırılmaz, site çalışmaya
devam eder. Sadece arşivdeki cevaplar değişir ve oyuncular fark eder.

Liste büyütülecekse önce tasarım konuşulmalı — mevcut döngü dondurulup yeni
kelimeler ayrı bir tura eklenmeli. Kelime eklemek asla "küçük bir düzeltme"
değildir.

### Dokunulmazlar

| Ne | Nerede |
|---|---|
| `cozum` listesi — içerik **ve** sıra | `src/words.js` |
| `BASLANGIC = '2026-01-01'` | `src/engine.js` |
| `STANDART_ANAHTAR`, `ILERI_ANAHTAR` | `src/engine.js` |
| `tohum()`, `uretec()`, `permutasyon()` | `src/engine.js` |
| `havuzKur()` süzme kuralı | `src/app.js` |

Havuzlar: `cozum` 500 kelime, tahmin sözlüğü (`gecerli`) 5748.
Standart havuzu 288 — harf tekrarı olmayanlar. Bu keyfi bir kısıtlama değil,
**seviyenin tanımı**: Standart'ın kuralı "gizli kelimede harf tekrarı yok" ve
oyuncu çıkarım yaparken buna güveniyor. Döngüler: Standart 288 gün, İleri 500.

---

## 2. Push öncesi zorunlu kontrol

`src/words.js`, `src/sozluk.js` veya `src/engine.js` değiştiyse **push'tan
önce** bütünlük kontrolünü çalıştır:

```
python3 tools/sunucu.py
# sonra tarayıcıda: http://localhost:8765/test/kontrol
```

Canlıdaki hali: <https://kelime500.com/test/kontrol>

11 kontrol yapar: kelime listelerinin imzası (içerik + sıra), 15 referans
günün kelimesi, Standart havuzunda harf tekrarı olmadığı, 2000 gün boyunca
iki seviyenin çakışmadığı, her havuzun kendi döngüsünde tamamen tükendiği.

**Kırmızı varsa gönderme.** Değişikliği geri al.

Referanslar kelimeleri açık metin tutmaz — sayfa siteyle birlikte
yayınlandığı için özet (hash) halinde saklanır. Beklenen değerleri
değiştirmek gerekiyorsa bu bilinçli bir karardır, sessizce yapılmaz.

---

## 3. Oyuncu verisi — anahtar adlarını değiştirme

İstatistikler, seriler ve yarım kalan oyunlar kullanıcının tarayıcısında
`localStorage` içinde:

```
kelime500.oyun.gunluk.<zorluk>.<tarih>
kelime500.oyun.serbest.<zorluk>
kelime500.ist.<mod>.<zorluk>
kelime500.tema · kelime500.zorluk · kelime500.tarih · kelime500.cerez
```

Bu adlardan birini değiştirmek **herkesin istatistiğini sessizce siler**.
Hata vermez, veri geri gelmez. Deploy bu verilere dokunmaz.

---

## 4. Çalışma düzeni

Depoda birden fazla kişi çalışıyor ve **her push doğrudan canlıya çıkıyor.**

Push'tan önce her seferinde:

```
git fetch origin
git log --oneline HEAD..origin/main    # uzakta yeni bir şey var mı
git pull --rebase                      # varsa önce onu al
```

`pull.rebase` ve `push.default simple` yerel olarak ayarlı. Çakışma çıkarsa
kendi kararınla birini seçme — kullanıcıya ne olduğunu anlat, birlikte
çözün. Birleştirdikten sonra, karşı taraf motora dokunduysa 2. bölümdeki
kontrolü tekrar çalıştır.

Riskli veya geniş bir değişiklikse push'tan önce kullanıcıya haber ver.
Kullanıcı "bugün push yapma" diyebilir (tanıtım yayındayken böyle oldu).
Geri alma: Cloudflare panelinden önceki dağıtıma dönülebiliyor.

---

## 5. Üretilen dosyalar — elle düzenleme

| Dosya | Kaynağı | Üreten |
|---|---|---|
| `src/yardim.js` | `nasil-oynanir.html` içindeki `#kurallar` | `python3 tools/yardim-uret.py` |
| `kelime-listesi.md` | `src/words.js` | `python3 tools/liste-cikar.py` |

Kural metnini değiştirmek gerekiyorsa `nasil-oynanir.html` içinde değiştir,
sonra betiği çalıştır. İki yeri elle senkron tutmaya çalışma.

---

## 6. Sürüm damgası

Tarayıcı önbelleğini kırmak için bütün varlıklar `?v=NN` ile yükleniyor
(şu an `v=43`, dört HTML dosyasında toplam 29 yerde). `assets/` veya `src/`
altında bir dosya değiştiysen **hepsini birden** artır, yoksa kullanıcılar
eski dosyayla yeni dosyayı karışık görür.

---

## 7. Reklam yuvaları — yeniden tasarlama

Beş reklam yuvası kodlanmış durumda ama gizli. Açmak için
`assets/styles.css` sonundaki `REKLAMLAR HENUZ YAYINDA DEGIL` bloğunu sil
(satır ~745). Ölçüler ve konumlar yukarıda tanımlı, kendiliğinden yerine
oturur.

Yerleşim kullanıcıyla uzun bir tartışmayla oturdu; sıfırdan tasarlama.
Reklam kodu `src/cerez.js` içindeki `reklamlariYukle(kisisel)` fonksiyonuna
gelecek — çerez reddedilirse kişiselleştirilmemiş reklam yüklenmeli.

---

## 8. Yazım

Her şey Türkçe: arayüz metinleri, kod yorumları, commit mesajları.

Yorumlar Türkçe karakterli yazılır (`/* Oyun mantığı - arayüzden bağımsız,
saf fonksiyonlar. */`). Depoda ASCII'ye kaçan yorum blokları da var ama
baskın düzen bu; düzenlediğin dosyadaki üsluba uy.

Değişken ve fonksiyon adları Türkçe kelimelerden, ASCII harflerle:
`havuzKur`, `gunlukKelime`, `tarihSinirla`, `zorluk`. İngilizce'ye kaçma.

Commit mesajları Türkçe. Ne değiştiğini değil **neden** değiştiğini anlat —
diff zaten ne değiştiğini gösteriyor.
