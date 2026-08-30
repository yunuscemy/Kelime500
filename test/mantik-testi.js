var app = Application.currentApplication(); app.includeStandardAdditions = true;
function read(p){ return app.doShellScript("cat " + JSON.stringify(p)); }
// Depo kokunden calistirilir; sabit yol yerine bulunulan dizin kullanilir.
var kok = app.doShellScript("pwd") + "/";
var window = {};
["src/turkish.js","src/engine.js","src/sozluk.js","src/words.js"].forEach(function(f){ eval(read(kok+f)); });
var KB = window.KB, out = [], hata = 0;
function ok(ad, kosul, ek){ out.push((kosul?"PASS ":"FAIL ")+ad+(ek!==undefined?" -> "+ek:"")); if(!kosul) hata++; }

// Türkçe büyütme
ok("i->İ, ı->I", KB.tr.buyut("kaşık ilik ısı")==="KAŞIK İLİK ISI", KB.tr.buyut("kaşık ilik ısı"));

// Puanlama
var p = KB.motor.puanla("KELAM","KALEM");
ok("KELAM/KALEM = 3 yer, 2 harf, 0 yok", p.yer===3 && p.harf===2 && p.yok===0, JSON.stringify(p));
ok("tam isabet", (function(){var s=KB.motor.puanla("KİTAP","KİTAP"); return s.yer===5&&s.harf===0&&s.yok===0;})());
ok("hiç ortak yok -> 5 kırmızı", (function(){var s=KB.motor.puanla("BULUT","ŞAFAK"); return s.yer===0&&s.harf===0&&s.yok===5;})(), JSON.stringify(KB.motor.puanla("BULUT","ŞAFAK")));
// çokluk kümesi: tahminde 2 A, gizlide 1 A
ok("fazla tekrar sayılmaz", (function(){var s=KB.motor.puanla("KAZAN","KANAT"); return s.yer===3&&s.harf===1&&s.yok===1;})(), JSON.stringify(KB.motor.puanla("KAZAN","KANAT")));
ok("üç sayının toplamı hep uzunluk", (function(){ var d=KB.kelimeler.al(5), k=0;
   for(var i=0;i<400;i++){ var a=d.gecerli[(i*37)%d.gecerli.length], b=d.cozum[(i*53)%d.cozum.length];
     var s=KB.motor.puanla(a,b); if(s.yer+s.harf+s.yok!==5 || s.yer<0 || s.harf<0 || s.yok<0) k++; }
   return k===0; })());

// Kesin-yok harfler: yer=0 ve harf=0 olan bir tahminin bütün harfleri kesin yoktur
ok("tek tahmin, hepsi kesin yok", (function(){
  var g=[{tahmin:"BULUT",yer:0,harf:0}];
  var s=KB.motor.kesinYokHarfler(g);
  return ["B","U","L","T"].every(function(h){return s[h];}) && !s["A"];
})());
ok("kismi eslesen tahmin kesin-yok kumesine girmez", (function(){
  var g=[{tahmin:"KELAM",yer:3,harf:2}];
  return Object.keys(KB.motor.kesinYokHarfler(g)).length===0;
})());
ok("birden fazla sifir tahmin birlesir", (function(){
  var g=[{tahmin:"BULUT",yer:0,harf:0},{tahmin:"ŞAFAK",yer:0,harf:0}];
  var s=KB.motor.kesinYokHarfler(g);
  return ["B","U","L","T","Ş","A","F","K"].every(function(h){return s[h];});
})());

// Gercek harf renkleri (perde acilisi): 1 kirmizi, 2 sari, 3 yesil
ok("KELAM/KALEM renkleri", (function(){
  return KB.motor.harfRenkleri("KELAM","KALEM").join("")==="32323";
})(), KB.motor.harfRenkleri("KELAM","KALEM").join(""));
ok("tam isabette hepsi yesil", KB.motor.harfRenkleri("KİTAP","KİTAP").join("")==="33333");
ok("hic ortak yoksa hepsi kirmizi", KB.motor.harfRenkleri("BULUT","ŞAFAK").join("")==="11111");
ok("fazla tekrar sariya donmez", (function(){
  // KAZAN/KANAT: K,A,N yerinde; ikinci A gizlideki tek fazla A ile eslesir mi?
  var r = KB.motor.harfRenkleri("KAZAN","KANAT");
  return r.length===5 && r.filter(function(x){return x===3;}).length===3;
})(), KB.motor.harfRenkleri("KAZAN","KANAT").join(""));
ok("renkler puanla ile tutarli", (function(){
  var d=KB.kelimeler.al(5), k=0;
  for(var i=0;i<300;i++){
    var a=d.gecerli[(i*37)%d.gecerli.length], b=d.cozum[(i*53)%d.cozum.length];
    var s=KB.motor.puanla(a,b), r=KB.motor.harfRenkleri(a,b);
    var yesil=r.filter(function(x){return x===3;}).length;
    var sari =r.filter(function(x){return x===2;}).length;
    if(yesil!==s.yer || sari!==s.harf) k++;
  }
  return k===0;
})());

// Listeler
[4,5,6].forEach(function(n){
  var d = KB.kelimeler.al(n);
  var uzunlukTamam = d.gecerli.every(function(w){ return w.length===n; });
  var cozumIcerde  = d.cozum.every(function(w){ return d.gecerli.indexOf(w)!==-1; });
  ok(n+" harf: uzunluklar tutuyor", uzunlukTamam);
  ok(n+" harf: çözümler geçerli listede", cozumIcerde);
  ok(n+" harf: atılan yok", d.atilan.length===0, d.atilan.join(","));
  out.push("     "+n+" harf: "+d.cozum.length+" cevap, "+d.gecerli.length+" kabul edilen");
});

// Zorluk havuzları: hepsi 5 harf, değişen şey kurallar
var besli = KB.kelimeler.al(5);
var NADIR = "JFVĞ";
var havuzlar = {
  "Standart":  besli.cozum.filter(function(k){ return KB.motor.tekrarsiz(k) && KB.motor.nadirsiz(k,NADIR); }),
  "Standart+": besli.cozum.filter(KB.motor.tekrarsiz),
  "İleri":     besli.cozum.slice()
};
ok("Standart havuzunda seyrek harf yok", havuzlar["Standart"].every(function(k){ return KB.motor.nadirsiz(k,NADIR); }));
ok("Standart havuzunda tekrar harf yok", havuzlar["Standart"].every(KB.motor.tekrarsiz));
ok("Standart+ havuzunda tekrar harf yok", havuzlar["Standart+"].every(KB.motor.tekrarsiz));
ok("havuzlar Standart < Standart+ < İleri", havuzlar["Standart"].length < havuzlar["Standart+"].length
   && havuzlar["Standart+"].length < havuzlar["İleri"].length);
ok("her havuz yeterince büyük", Object.keys(havuzlar).every(function(a){ return havuzlar[a].length >= 100; }),
   Object.keys(havuzlar).map(function(a){ return a+": "+havuzlar[a].length; }).join(" · "));
ok("geniş sözlük yüklendi", besli.gecerli.length > 4000, besli.gecerli.length + " kabul edilen");
ok("aranan kelimeler kabul ediliyor",
   ["SAHİH","YASİN","HİTAP","KİTAP","KELAM","ZURNA","ÇAKIL","ŞAFAK"]
     .every(function(k){ return besli.gecerli.indexOf(k)!==-1; }));
ok("cevap havuzu kabul listesinin alt kümesi",
   besli.cozum.every(function(k){ return besli.gecerli.indexOf(k)!==-1; }));
ok("cevap havuzu hedeflenen büyüklükte", besli.cozum.length >= 500, besli.cozum.length);
ok("cevap havuzu sözlükten çok daha dar", besli.cozum.length < besli.gecerli.length / 5,
   besli.cozum.length + " / " + besli.gecerli.length);

// Günlük kelime kararlılığı
var liste = havuzlar["Standart"];
var g1 = KB.motor.gunlukKelime(liste,"2026-08-29","standart");
var g2 = KB.motor.gunlukKelime(liste,"2026-08-29","standart");
var g3 = KB.motor.gunlukKelime(liste,"2026-08-30","standart");
ok("günlük kelime sabit", g1===g2, g1);
ok("ertesi gün değişiyor", g1!==g3, g1+" / "+g3);

// Ayni gun her zorluk icin ayri kelime yayimlanir (gunde 3 kelime)
// Uygulamadaki (src/app.js gununKelimesi) sirayla ayni mantik.
var SIRA = ["standart","standarta","ileri"], SIRA_AD = ["Standart","Standart+","İleri"];
function gununUcu(t){
  var alinan = [];
  for (var i=0; i<SIRA.length; i++){
    alinan.push(KB.motor.gunlukKelime(havuzlar[SIRA_AD[i]], t, SIRA[i], alinan.slice()));
  }
  return alinan;
}
ok("günde 3 zorluk = 3 ayrı kelime",
   new Set(gununUcu("2026-08-29")).size===3, gununUcu("2026-08-29").join(" / "));
// Bir ay degil tam yil taranir: eski test yalnizca Eylul 2026'ya bakiyordu ve
// carpisan gunleri kaciriyordu.
ok("yıl boyunca 3 zorluk hep ayrı kelime", (function(){
  var kotu = [];
  for(var ay=1; ay<=12; ay++) for(var g=1; g<=28; g++){
    var t = "2026-" + String(ay).padStart(2,"0") + "-" + String(g).padStart(2,"0");
    if(new Set(gununUcu(t)).size!==3) kotu.push(t);
  }
  return kotu.length===0 ? true : kotu.slice(0,5).join(", ");
})()===true, "");


// Çözücü: geri bildirimler daralttıkça tek cevaba iniyor mu (8 hakta bitiyor mu)
function simule(gizli, havuz){
  var gecmis=[], adaylar=havuz.slice();
  for(var t=1;t<=8;t++){
    var tahmin = adaylar[Math.floor(adaylar.length/2)];
    var s = KB.motor.puanla(tahmin,gizli);
    if(s.yer===gizli.length) return t;
    gecmis.push({tahmin:tahmin,yer:s.yer,harf:s.harf});
    adaylar = KB.motor.adaylar(adaylar,gecmis,0);
    if(!adaylar.length) return -1;
  }
  return 0;
}
var toplam=0, basarisiz=0, enKotu=0;
for(var i=0;i<liste.length;i+=7){
  var r = simule(liste[i], liste);
  if(r<=0){ basarisiz++; } else { toplam+=r; enKotu=Math.max(enKotu,r); }
}
ok("basit çözücü hep 8 hakta bitiriyor", basarisiz===0, basarisiz+" başarısız");
out.push("     çözücü ortalama "+(toplam/Math.ceil(liste.length/7)).toFixed(2)+" hak, en kötü "+enKotu);
ok("aday süzgeci doğru cevabı elemiyor",
   KB.motor.adaylar(liste,[{tahmin:liste[0],yer:KB.motor.puanla(liste[0],liste[9]).yer,harf:KB.motor.puanla(liste[0],liste[9]).harf}],0).indexOf(liste[9])!==-1);

out.push(hata===0 ? "\nTÜMÜ GEÇTİ" : "\n"+hata+" TEST BAŞARISIZ");
out.join("\n");
