# Kelime500

Türkçe kelime çıkarım oyunu. Gizli kelimeyi 8 hakta bulmaya çalışırsın; her tahminden
sonra üç sayı görürsün: **kaç harf doğru yerde** (yeşil), **kaç harf kelimede var ama yeri
yanlış** (sarı), **kaç harf kelimede hiç yok** (kırmızı). Üçünün toplamı hep kelime
uzunluğudur. Wordle'dan farkı bu: renkler harflerin üstünde değil, sadece sayı olarak
verilir — hangi harfin hangisi olduğunu sen çıkaracaksın. (Klasik "Bulls & Cows / Jotto"
mantığı.)

## Çalıştırma

Derleme adımı yok, bağımlılık yok. `index.html` (giriş sayfası) tarayıcıda açılır:

    open index.html

İstersen basit bir sunucuyla da servis edilir: `python3 -m http.server`.

## Özellikler

- **Giriş sayfası** (`index.html`): zorluk seçimi, günlük / serbest / arşiv kartları ve
  bugün her zorlukta hangi durumda olduğunu gösteren rozetler.
- **Günlük**: kelime `tarih + zorluk` çiftinden türetilir, yani **her gün iki seviye için
  iki ayrı kelime** yayımlanır ve herkeste aynıdır. İki kural birlikte
  sağlanır: (1) aynı gün Standart ve İleri asla aynı kelimeyi vermez,
  (2) bir seviyede havuzun tamamı birer kez çıkmadan hiçbiri tekrar etmez —
  Standart 288 gün, İleri 500 gün. Kelime rastgele seçilmez: her havuz bir kez
  karılır ve günler bu sabit sırada ilerler. Çakışma olduğunda sıradaki
  kelimeye atlanmaz (atlamak diziyi kaydırıp ikinci kuralı bozuyordu); aynı
  döngü içinde iki günün kelimesi takas edilir.
- **Yayın tarihi**: `src/app.js` ve `src/giris.js` içindeki `YAYIN` sabiti oyunun
  yayına alındığı günü tutar. Arşiv bu tarihten öncesine gidemez — ikisi de
  aynı değeri taşımalı.
- **Arşiv**: kaçırılan günler oynanabilir; `‹ ›` düğmeleri ve tarih seçiciyle günler
  arasında gezinilir. Arşiv **yalnızca düne kadar** gider — bugünün kelimesi Günlük'e
  aittir, arşivden oraya dönülmez. Günlükte tek bir bulmaca olduğu için orada tarih
  gezinmesi hiç görünmez.
  Arşivde oynanan gün, o günün günlük bulmacasının aynısıdır: kelime de kayıtlı
  ilerleme de ortaktır, ama istatistikleri günlük serisini bozmasın diye ayrı tutulur.
- **Serbest**: sınırsız rastgele kelime, istatistikleri günlükten ayrı tutulur.
- Kelime her seviyede **5 harflidir**; zorluk gizli kelimenin kurallarını değiştirir:
  **Standart** (aynı harf iki kez geçmez), **İleri** (kural yok). Standart'ın harf
  tekrarı kısıtı **tahminleri de bağlar**: o seviyede aynı harfi iki kez içeren bir
  kelime tahmin olarak girilemez.
- **Not alma**: gönderilmiş tahminlerdeki harflere tıklayarak kırmızı/sarı/yeşil
  işaretle, klavye tuşlarına sağ tıklayarak (dokunmatikte basılı tutarak) elediğin
  harfleri boya. Kâğıt kalem yerine geçer, oyuna etkisi yoktur; `◫` hepsini temizler.
  Satırın solundaki `↺` yalnızca o satırın notlarını sıfırlar. Bir tahminin üç sayısı
  da (yer/harf/yok'un ilk ikisi) sıfırsa, o harfler kelimede kesinlikle yoktur — bu
  durumda ilgili hücreler otomatik kırmızıya boyanır ve değiştirilemez. Klavyede de
  daha önce denenmiş harfler otomatik olarak gri görünür.
- **Boşluk tuşu**: bilinmeyen harfin yerini `·` ile boş bırakır, satırı taslak kurmanı sağlar.
- **Kart çevirme**: tahmin gönderilince yeşil/sarı/kırmızı rozetler dikey eksenlerinde
  sırayla dönüp arka yüzlerindeki sayıları gösterir. Oyun kazanılınca önce doğru cevap
  duyurulur, üç saniye sonra **perde açılır**: bütün tahminlerdeki harfler aynı
  animasyonla gerçek renklerine döner, kazanan satır baştan sona yeşil olur.
- Listede olmayan kelime satırda kırmızı ve üstü çizili gösterilir — Enter'a basmaya
  gerek yok, kelime tamamlanır tamamlanmaz görünür ve hak yakmaz.
- "Olası cevap" sayacı, tahminlerin arama alanını ne kadar daralttığını gösterir.
- İstatistikler, seri takibi ve sonraki güne geri sayım (mod + zorluk başına), açık/koyu
  tema, sonucu panoya kopyalama.
- Tahta ve klavye ekran yüksekliğine göre ölçeklenir; kaydırma gerekmez.
- Bütün durum `localStorage`'da; sunucu yok, hesap yok.

## Dosyalar

| Dosya | İçerik |
| --- | --- |
| `index.html` | Giriş sayfası (kartlar, zorluk seçimi) |
| `oyna.html` | Oyun sayfası; `?mod=`, `?zorluk=`, `?tarih=`, `?yardim=1` parametrelerini okur |
| `src/giris.js` | Giriş sayfası mantığı |
| `assets/styles.css` | Tema değişkenleri ve bütün görünüm |
| `src/turkish.js` | Türkçe harf işleri (i/ı büyütme, alfabe, Q klavye düzeni) |
| `src/engine.js` | Saf oyun mantığı: puanlama, aday süzme, günlük kelime tohumu |
| `src/words.js` | Cevap havuzu; yüklemede büyütülür, uzunluğu tutmayan elenir |
| `src/sozluk.js` | Tahmin olarak kabul edilen geniş sözlük (üretilmiş dosya) |
| `kelime-listesi.md` | Cevap havuzunun tamamı (üretilmiş dosya) |
| `nasil-oynanir.html` | Kural metninin **tek kaynağı**; `src/yardim.js` bundan üretilir |
| `gizlilik.html` | Gizlilik ve çerez politikası (yayın öncesi doldurulacak yerler var) |
| `src/cerez.js` | Çerez bildirimi ve reklam yükleme kapısı |
| `ads.txt` | AdSense onayından sonra yayıncı kimliğiyle doldurulur |

| `tools/` | Sözlüğü indiren ve kelime listesini çıkaran betikler |
| `src/app.js` | Arayüz, girdi, kayıt, istatistik |

Reklam yerleşimini kontrol etmek için adrese `?reklam=1` eklenir (kapatmak için `?reklam=0`); yuvalar yalnızca o sekmede görünür, ziyaretçiler etkilenmez.

Reklam yuvaları HTML'de hazır ama **`assets/styles.css` sonundaki "REKLAMLAR HENÜZ YAYINDA DEĞİL" bloğu** onları gizliyor. Reklamlar yerleştirilince o blok silinir; ölçüler zaten tanımlı olduğu için yuvalar kendiliğinden yerine oturur.

İki ayrı liste var, çünkü ikisinin işi farklı:

- **Tahmin sözlüğü** (`src/sozluk.js`, 5 harf için 5740 kelime): oyuncunun yazabileceği
  kelimeler. Geniş olması gerekir, yoksa gerçek kelimeler reddedilir.
- **Cevap havuzu** (`src/words.js`, 500 kelime): gizli kelimenin seçildiği liste. Elle
  derlenmiştir ve tanıdık kelimelerden oluşur — cevap, kimsenin bilmediği bir kelime
  olmamalı. Seviye kuralları bu havuzu süzer (Standart 288, İleri 500).

Cevap havuzunun tamamı [kelime-listesi.md](kelime-listesi.md) dosyasında listelidir.
Havuza kelime eklemek için `src/words.js` düzenlenir; yanlış uzunlukta veya alfabe dışı
harf içeren kelimeler yüklemede sessizce elenir. Ardından `python3 tools/liste-cikar.py`
çalıştırılır. Sözlüğü yenilemek için `python3 tools/sozluk-indir.py`.

Kural metni değiştirilecekse `nasil-oynanir.html` içindeki `#kurallar` bölümü
düzenlenir, ardından `python3 tools/yardim-uret.py` çalıştırılır — oyun içindeki
"Nasıl oynanır" penceresi bu betikle üretilir, elle düzenlenmez.

Sözlüğün birincil kaynağı **TDK Güncel Türkçe Sözlük'ün madde başlığı listesidir**
(`eski.sozluk.gov.tr/autocomplete.json`, 99.227 madde). Üstüne TDK maddelerinden
türetilmiş herkese açık iki liste eklenir; birinde eksik kalan kelime diğerinden gelir.
Deyimler, ekler ve çok kelimeli girişler elenir, yalnızca tek parça madde başlıkları
alınır — sözlük tanımları indirilmez ve depoda tutulmaz. Projeyi yayına alacaksan
TDK verisinin kullanım koşullarını kontrol et.

## Testler

Depoda bağımlılık olmadığı için mantık testleri macOS'un JavaScriptCore'uyla çalışır:

    osascript -l JavaScript test/mantik-testi.js

Puanlamayı (harf tekrarı dâhil), liste bütünlüğünü, günlük kelimenin kararlılığını ve
basit bir çözücünün her cevabı 8 hakta bulabildiğini doğrular.
