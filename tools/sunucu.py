#!/usr/bin/env python3
"""Yerel gelistirme sunucusu.

Cloudflare Pages sayfalari uzantisiz adreste sunuyor (/oyna -> oyna.html) ve
.html adreslerini uzantisiza yonlendiriyor. python3 -m http.server bunu
yapmadigi icin yerelde baglantilar kiriliyordu. Bu sunucu ayni davranisi
taklit eder, boylece yerel test canliyla ayni olur.

    python3 tools/sunucu.py [port]
"""
import http.server
import os
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Islem(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=KOK, **kw)

    def do_GET(self):
        yol = self.path.split('?', 1)[0].split('#', 1)[0]

        # Yalnizca bu yerel sunucuda: tarayicidaki oyun kayitlarini siler ve
        # oyuna doner. Test ederken (ornegin telefondan) ayni gunun oyununu
        # bastan oynayabilmek icin. Istatistik, tema ve seviye tercihi kalir.
        # Canli sitede boyle bir adres yok - bu dosya yayinlanmiyor.
        if yol == '/sifirla':
            sayfa = (
                '<!doctype html><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width">'
                '<title>Sıfırlandı</title>'
                '<body style="font:16px system-ui;padding:24px;background:#0f1115;color:#e8eaf0">'
                '<p id="d">Oyun kayıtları siliniyor…</p>'
                '<script>'
                'var n=0;Object.keys(localStorage).forEach(function(k){'
                'if(k.indexOf("kelime500.oyun.")===0){localStorage.removeItem(k);n++;}});'
                'document.getElementById("d").textContent=n+" oyun kaydı silindi, oyuna dönülüyor…";'
                'setTimeout(function(){location.replace("/oyna?mod=gunluk");},900);'
                '</script>'
            ).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(sayfa)))
            self.end_headers()
            self.wfile.write(sayfa)
            return

        # .html ile gelen istek uzantisiza yonlendirilir (Cloudflare gibi)
        if yol.endswith('.html') and yol != '/index.html':
            hedef = yol[:-5]
            if self.path[len(yol):]:
                hedef += self.path[len(yol):]
            self.send_response(307)
            self.send_header('Location', hedef)
            self.end_headers()
            return

        # uzantisiz istek varsa .html dosyasina eslenir
        if yol != '/' and not os.path.splitext(yol)[1]:
            aday = os.path.join(KOK, yol.lstrip('/') + '.html')
            if os.path.isfile(aday):
                self.path = yol + '.html' + self.path[len(yol):]

        return super().do_GET()

    def log_message(self, bicim, *args):
        pass          # sessiz


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with http.server.ThreadingHTTPServer(('', port), Islem) as s:
        print('http://localhost:%d  (Ctrl+C ile durdur)' % port)
        s.serve_forever()


if __name__ == '__main__':
    main()
