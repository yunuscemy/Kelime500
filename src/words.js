/* Türkçe kelime listeleri.
 * cozum  : gizli kelime olarak seçilebilecek kelimeler (yaygın, tanıdık)
 * ekstra : cevap olmaz ama tahmin olarak kabul edilir
 * Kelimeler küçük harfle yazılır; yükleme sırasında Türkçe kurallarına göre
 * büyütülür, uzunluğu tutmayanlar elenir. */
(function (global) {
  'use strict';

  var HAM = {
    4: {
      cozum: `adam akıl alev altı anne arpa asıl ateş avuç ayak ayna ayva baba bacı balo batı bina
        bira borç boya cadı ceza cilt çakı çare çatı çene çile dava dede defa deli dere ders dert
        deve dolu dost ekip elma emek emir erik esas esir eşik eşya etek fare fark fıçı film fiil
        hava hane harf hece hile ışık ilan ilaç ilgi ilik ilim imza inek ipek isim izin kafa kale
        kalp kapı kara kart kase kaya kaza kent kilo kira kişi koca kola koku konu koşu köşe köşk
        kral kule kurt kutu kuyu kuzu küre lale leke mama masa mavi maya meze mide mola nane neşe
        nine ocak odun okul olay onur orak oran orta otel oyun ödev ödül öğle ölçü ömür örgü örtü
        öykü para peri pide pire pist plaj plan puan renk rota rüya saat saha sarı semt sıra soru
        spor süre şato şiir takı tane tava tema tepe tren uçak ufak ufuk ulus umut usta uyku uzay
        uzun ülke ürün üzüm vade vali veda vida vize yaka yalı yama yara yarı yasa yaya yazı yeni
        yüce zarf zeka`,
      ekstra: `abla adet ağaç ağıl ağız ahır akım alan alay alçı alım amaç anot arka arsa asma aşçı
        avlu ayaz ayıp ayrı azot bant bebe beze boru burç cami civa cuma çift dana dizi doku ecel
        efor ekol elek elit enik eren esen esin etik evet evli faiz fani fide form fuar gaye gece
        geri halk ilke inci işçi kaos karo kene kına kıyı kova küme lira mart meşe moda oruç otağ
        oyma ödem öfke öğüt önem övgü özel paça pala pano pipo plak pota prim priz pusu rica risk
        rulo sade salı sarp saye soba şans şarj şeyh tabu tarz tasa tayf tere tire tunç turp tütü
        uçuş uğur unlu usul uyum ücra ülkü ünlü vaat vaha vaiz vals vazo veli veri veto yapı yedi
        yoga yuva zade zift`
    },
    5: {
      cozum: `adres ahşap akrep akşam albüm alkış altın ampul anlam armut asker aslan avize ayran bacak badem
        bahar bakır balon balta balık banka barut barış basit basın bavul bayan bebek bedel belge beton
        beyaz biber bilek bilet bilgi bilim bitki borsa boyut bozuk boğaz bugün bulut burun bölge bölüm
        börek bütçe bütün büyük cadde cesur cevap ceviz ciddi dahil daire dalga damak damar damat damla
        darbe davet davul dayak delik delil demet demir deney denge deniz dergi derin dilek dilim direk
        dokuz dolap dolar dolma domuz dosya doğal doğru doğum dudak duman durak durum duvar duygu dönem
        döviz dünya düzen düğme düğün düşük ekmek ekran elmas emlak engel erdem erken esnaf etraf evren
        ezber eşlik fakir fayda felek fener ferah fidan fikir firma fiyat fizik fişek forma fırın garaj
        gelin gelir genel geniş gerek geyik geçit giriş gitar giyim gizem gizli gurur göbek gölge gönül
        görev görüş gövde göğüs gümüş günah güneş güven güzel güçlü hafif hakim halka hamur hangi hasta
        havuz havuç hayal hayat hayır hazır hedef hekim hemen hesap hukuk huzur hücre hüzün hızlı iddia
        iklim ikram ilham imkan inanç incir insan irade isyan kablo kabuk kabus kadeh kader kadro kadın
        kafes kalem kalın kalıp kamış kanal kanat kanca kanun kapak karar karga karne kasap kaset kasım
        katkı kavak kavga kavun kayak kayıt kazan kaçak kağıt kaşık kebap keman kemer kemik kenar kesim
        keten keyif kilim kilit kimse kiraz kitap kolay komik konak konut kopya korku koyun koşul kucak
        kumaş kural kurul kuruş kuzen kuzey kuşak kömür köpek köprü kütle kütük küçük kılıf kılıç kısım
        lamba lider liman limon liste lokma lokum maden makam makas manav marka masal maske mekan melek
        memur merak mermi mesai mesaj metin meyve mezar midye mimar minik model motor mutlu mühür müzik
        nakit nakış namaz nazik neden nefes nehir niyet nokta nöbet olgun orman ortak paket palet palto
        panik parke parça pasta pazar pedal pembe perde petek peşin pilav pilot plaka polis poşet prens
        radyo rakam rakip resim roman sabah sabun sadık sahih sahil sahne sakal sakız salon salça sanat
        saray sarma satır savaş sayfa sebep sefer sekiz selam sepet sergi sevgi seçim silah silgi sinek
        sirke siyah sofra sokak sonuç soğan soğuk sucuk sunum susam sürat sınıf sınır tabak tablo tabur
        tahta takas taksi takım talep talih tanık taraf tarih tarla tatil tavan tavuk teker tekne telaş
        temel temiz tepsi teras terzi testi tilki tohum torun turşu tuval tuzak tuğla tünel türkü tıraş
        uyarı uygun uzman vagon vahşi vakit valiz varil vatan vergi viraj virüs yakut yakıt yalan yamaç
        yanak yankı yapay yarar yarım yarış yasak yatak yavaş yavru yayın yazar yelek yemek yemin yenge
        yerli yetim yetki yeşil yiğit yolcu yonca yorum yumak yunus yürek yüzey yüzük yığın zafer zaman
        zarar zayıf zehir zemin zihin zirve zurna çabuk çadır çakıl çamur çanak çanta çarşı çatal çayır
        çekiç çelik çerez çevre çeşme çilek çizgi çiçek çorap çorba çubuk çukur çuval çıkış çınar ödeme
        ölçek önlem önlük örnek özgür özlem üzgün üçgen ırmak ıslak şafak şahin şahit şapka şarap şarkı
        şehir şeker şeref şifre`,
      ekstra: `antik arena artık atlas bakla bulgu buzul civar çakal defne devir dizel emsal enkaz esans evrak
        fasıl filiz galip garip gider gübre güruh hamal harap hasat hatır helva heves hisar jeton kahır
        kalas kalfa kapan katık kaval kayın kefen kelam kiler kovan külçe macun mafya matem mazot misal
        mizah mühim oymak pafta pasaj peron piyon rende rezil rulet salep sancı sedir semer servi sevap
        sicim solak soyut sürgü şanlı şilep tabir tasma tekel topaç tutam umumi unsur ülser üslup üstat
        vakıf velet yaban yalın yamuk yazgı yular yumru ziyan zorba zümre yasin salih nasip nasıl niçin
        birey birim bilge binek birer bodur bohça bolca bordo boyun bozma böğür bölme budak bukle bunak
        burma buruk buhar bunca cılız cıvık çakır çalgı çalım çapak çekim çeper çıban çıkar çıkma çırak
        çizik çöküş çömez çöpçü çünkü dakik dalak davar dekan demeç denek derbi derya devre dinar diyet
        dizge dolgu donma dökme dönme dönüş döşek dumur duruş düdük dürüm düşey düzey endam enlem ergen
        erzak esnek esrar etkin etken evrim evsiz eyvah falan fanus fatih fesat fesih fetih fevri figür
        filan firar fitil flama folyo fuaye fular gafil gamze gazap gazel geçer geçim geçiş germe gezme
        gıpta gocuk gonca gölet gömme gönye görgü görme gözde güdük güfte güğüm gülle gülüş güzel hacim
        hafta hakan hakem halat halef halim hamak hamle hamsi hanım harbi harem hasar hasım hasır haset
        hatun havai havan hayta hazan helal helak hepsi herif heybe hicap hilal hindi hisse hitap humus
        hücum hüküm hüner ılıca ırgat ısrar ıssız içeri içmek iftar ihale ihbar ihmal ihram ikili iksir
        ilave ilgeç ilkel ilmek imbat imdat imece inanç iptal irfan irmik iskan islam ismet ispat israf
        istek izafi jokey kabak kabza kaçış kadir kafir kahve kaide kakao kalan kalay kalıt kamil kaşar
        katar katil kavim kavuk kayık kazak kazma keder kefal kefil kekik kelek kepek kerem kesat kesin
        kesit keşif kılık kırık kırma kısır kısıt kışla kıyas kıyma kızak kızıl kibar kibir kitle kolej
        kolon kolye komün konum kopça kotra kovuk kubbe kulaç kulis kulüp kumar kumru kumul kupon kurak
        kurgu kurna kusur kutup kuyum küfür külah külot kümes künye kürek kürsü küspe laçka lades lağım
        lakap lakin lavaş layık lehçe lehim levha levye leziz limit lisan lokal lügat lüfer lütuf madde
        madem mahal mahir makul malum mamul manda mango mantı manto marul masaj masör mavna mecal mecaz
        medya mekik melez memba menfi merci mesel mesut meşru metal metot mevki mevzu mezat mezun mısır
        mobil moral motel mucit muhit mumya murat muska mümin mürit nadas nadir nakil namus nasip nazar
        nazır nebat nefer nefis nemli nesil nesne nezle nihai nikah nişan niyaz nizam nüfus nükte nüsha
        obruk odacı ofset oğlak oğlan olası oniks onlar opera ortam ödünç öksüz ölçüm ölmek önder öneri
        önsöz ötesi övünç özerk özgün palaz pamuk panel papel papaz pazen pelin pelte pınar pinti piyon
        plato poker polen pompa potas proje rakım raket rampa rapor rayiç refah rehin rejim rekor remiz
        resif resmi revir reyon rimel ritim rodeo rozet rutin sabır sabit safir sağır sahaf sahan sahip
        sakat sakin saksı salak salam sanal sanık sanki sapan sapık sargı sarih satın savcı sayaç sazan
        seans sebat sebil sebze sedef sefil sehpa seher sekme selvi semiz serap serin sezgi sıcak sıfat
        sıfır sığır sıkma sınav sırma sırık sıtma sızma sicil siğil silik silme simge simit sinir sinsi
        sitem sivil sivri sokma soluk somun somut sonat sorgu sorun söğüt sökme sözde sulak sunak sunta
        surat suret susma sükut sürme süslü sütun süzme şayet şerit şifon şilte şimdi şirin şoför şölen
        şöyle şükür şüphe taban tabip tacir taciz tahin tahıl takat takip takla talan talaş tamam tango
        tarak tarif tarım tartı taşra tatlı tavır tavla tayfa tayin tekir tekme telef telli telve temas
        tempo tenis tenor tepki tesir tetik teyel teyze tezat tıkaç tifüs tiner tirit titiz tokat tomar
        tonaj toplu torba torna tortu tosun tulum turne tuzlu tümce türbe türev tütün tüylü uçmak uğrak
        utanç uygar uyluk uyruk uysal ücret ürkek üstün üşüme üzeri vahim vakur vapur varis vasat vasıf
        veciz vekil verem verim vezir video viran viski vurgu vücut yağış yağlı yahni yakın yalak yanıt
        yapım yaslı yassı yatay yavan yayla yazık yedek yeğen yerel yıkım yoğun yokuş yosun yudum yufka
        yünlü yüzde zabıt zalim zarif zebra zerre zorlu zuhur`
    },
    6: {
      cozum: `adalet akraba altmış aralık avukat bakkal balkon bardak başarı bayrak benzin berber
        boncuk bostan buğday cambaz coşkun cüzdan çakmak çelenk çember çiftçi deprem derece destek
        devlet doktor dolmuş düzine efsane eğitim eleman emanet endişe fıstık fincan futbol gazete
        gerçek gezgin girdap günlük gümrük hafıza harita hatıra hayvan hazine hediye hendek heykel
        hikaye ikinci kaplan kaptan kardeş karpuz kasaba kavşak kayısı kazanç kelime koltuk konser
        korsan koşmak kuaför kurşun kültür lastik leylek makine mandal market mektup mendil mercan
        mermer meslek mevsim meydan mimari mucize musluk mutfak numara otobüs önemli pancar panjur
        parlak patika peynir piyano portre rehber sağlık sandık sanayi servis sessiz sigara sinema
        sistem sözlük sürücü şirket takvim tarçın tarife tavşan terlik torpil trafik üzüntü varlık
        vitrin yağmur yaprak yardım yastık yelken yıldız yorgun yüzyıl zambak zengin zeytin zincir
        zorluk`,
      ekstra: `acımak açılış akarsu akıllı alacak albeni aniden arayüz asalet atölye balina basınç
        başlık beceri binici birlik boyama bozkır budama bulgur burgaç buyruk büyülü cırcır çağdaş
        çamlık çavdar çeltik çeyrek çıkmaz defter dergah dikkat direnç dörtlü eczane eğilim emekli
        enerji esinti galeri gemici gündem havacı içerik imzalı itibar kanaat kanepe kasnak kaynak
        kepenk kiracı koruma matbaa mesafe normal olanak peyzaj renkli römork sinyal sunucu şablon
        terazi tomruk ülkücü`
    }
  };

  function bosluklaAyir(s) {
    return s.split(/\s+/).filter(function (w) { return w.length > 0; });
  }

  function hazirla(uzunluk) {
    var ham = HAM[uzunluk];
    var cozum = [], gecerli = [], gorulen = Object.create(null), atilan = [];

    function ekle(kelime, cozumMu) {
      var b = global.KB.tr.buyut(kelime);
      if (b.length !== uzunluk || !global.KB.tr.gecerliHarfler(b)) { atilan.push(kelime); return; }
      if (gorulen[b]) { return; }
      gorulen[b] = true;
      gecerli.push(b);
      if (cozumMu) { cozum.push(b); }
    }

    bosluklaAyir(ham.cozum).forEach(function (w) { ekle(w, true); });
    bosluklaAyir(ham.ekstra).forEach(function (w) { ekle(w, false); });

    /* Genis sozluk (tools/sozluk-indir.py ile uretilir) varsa tahmin olarak
     * kabul edilenlere eklenir. Gizli kelime yine yalnizca 'cozum' listesinden
     * secilir; boylece cevaplar tanidik kalir, tahminde ise oyuncu ozgurdur. */
    var genis = global.KB.sozlukHam && global.KB.sozlukHam[uzunluk];
    if (genis) { bosluklaAyir(genis).forEach(function (w) { ekle(w, false); }); }

    cozum.sort();
    gecerli.sort();
    return { cozum: cozum, gecerli: gecerli, atilan: atilan };
  }

  var onbellek = Object.create(null);

  global.KB = global.KB || {};
  global.KB.kelimeler = {
    uzunluklar: [4, 5, 6],
    al: function (uzunluk) {
      if (!onbellek[uzunluk]) { onbellek[uzunluk] = hazirla(uzunluk); }
      return onbellek[uzunluk];
    }
  };
}(window));
