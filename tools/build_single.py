#!/usr/bin/env python3
"""Kokoaa sivusta yhden HTML-tiedoston (dist/talo.html): data, koodi ja video ovat sen sisällä.

Yksitiedostoversio aukeaa kaksoisnapsautuksella ilman palvelinta (three.js haetaan silti verkosta).
Käyttö: python3 tools/build_single.py
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
data = (root / 'data' / 'site.json').read_text(encoding='utf-8')
js = (root / 'src' / 'main.js').read_text(encoding='utf-8')
boot = (root / 'src' / 'boot.js').read_text(encoding='utf-8')
fx = (root / 'src' / 'fx.js').read_text(encoding='utf-8')
mp4 = base64.b64encode((root / 'assets' / 'tv.mp4').read_bytes()).decode()

def once(s, old, new):
    assert s.count(old) == 1, old
    return s.replace(old, new)

js = once(js, "var TV_CLIP = 'assets/tv.mp4'", "var TV_CLIP = 'data:video/mp4;base64," + mp4 + "'")
# tehosteet (fx.js) samaan moduuliin käynnistyksen kanssa
boot = once(boot, "import { FX } from './fx.js';\n", once(fx, 'export const FX', 'const FX'))
assert '</script' not in js and '</script' not in boot and '</script' not in data

inline = ('<script type="application/json" id="data">' + data + '</script>\n'
          + '<script type="text/plain" id="app-src">' + js + '</script>\n'
          + '<script type="module">\n' + boot + '</script>\n')
out, n = re.subn(r'<script type="module" src="./src/boot.js"></script>\n', lambda m: inline, html)
assert n == 1
dist = root / 'dist'
dist.mkdir(exist_ok=True)
(dist / 'talo.html').write_text(out, encoding='utf-8')
print('dist/talo.html', round(len(out) / 1e6, 2), 'Mt')
