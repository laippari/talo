#!/usr/bin/env python3
"""Kokoaa sivusta yhden HTML-tiedoston (dist/talo.html): data, koodi ja video ovat sen sisällä.

Yksitiedostoversio aukeaa kaksoisnapsautuksella ilman palvelinta, ja sen voi julkaista Claude-artefaktina.
Käyttö: python3 tools/build_single.py
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
data = (root / 'data' / 'site.json').read_text(encoding='utf-8')
js = (root / 'src' / 'main.js').read_text(encoding='utf-8')
mp4 = base64.b64encode((root / 'assets' / 'tv.mp4').read_bytes()).decode()

for old, new in [("var TV_CLIP = 'assets/tv.mp4'", "var TV_CLIP = 'data:video/mp4;base64," + mp4 + "'"),
                 ("var DATA = window.SITE_DATA;", "var DATA = JSON.parse(document.getElementById('data').textContent);")]:
    assert js.count(old) == 1, old
    js = js.replace(old, new)

libs = re.findall(r'<script src="[^"]+"></script>\n', re.search(r'<!--LOADER-->.*?<!--/LOADER-->', html, re.S).group(0))
inline = '<script type="application/json" id="data">' + data + '</script>\n' + ''.join(libs) + '<script>\n' + js + '</script>\n'
out, n = re.subn(r'<!--LOADER-->.*?<!--/LOADER-->\n', lambda m: inline, html, flags=re.S)
assert n == 1
dist = root / 'dist'
dist.mkdir(exist_ok=True)
(dist / 'talo.html').write_text(out, encoding='utf-8')
print('dist/talo.html', round(len(out) / 1e6, 2), 'Mt')
