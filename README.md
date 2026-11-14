# Tontti 3D – Ideal 132 tontilla

Selaimessa toimiva three.js-malli tontista, talosta, pihasta ja perustuksista. Koko sivu on
yksi staattinen tiedosto (`index.html`): maastodata, tekstuurit ja koodi ovat sen sisällä, ja
three.js ladataan CDN:stä (`three.js r128`, lukittu versio).

## Avaaminen

```sh
python3 -m http.server 8000      # → http://localhost:8000
```

**Julkaisu:** jokainen `main`-haaran push julkaisee sivun GitHub Pagesiin
(`.github/workflows/pages.yml`; kertaluonteinen asetus: Settings → Pages → Source → GitHub
Actions). Käännösvaihetta ei ole. Workflow tarkistaa, että `index.html` on olemassa ja että sen
skriptit ovat syntaktisesti kunnossa, ja julkaisee sen.

## Työtapa

Sama malli kuin Oura- ja kartat-projekteissa:

1. Muutokset tehdään suoraan tämän kansion `index.html`-tiedostoon.
2. Muutos tarkistetaan paikallisesti (`python3 -m http.server`): siirrot, kierrot, peilaus,
   mallinvaihto, näkymät, simulaatio ja mobiili kaikilla talomalleilla.
3. Commit ja push `main`-haaraan → GitHub Actions julkaisee sivun noin minuutissa.

Claude-artefakti voi jatkaa esikatseluna, mutta lähde on tämä repositorio.

## Tallennus GitHub Pagesissa

Claude-artefaktina sivu tallentaa omat näkymät ja kamera-ajot katsojan omaan pilvivarastoon.
GitHub Pagesissa sitä ei ole, joten ne tallentuvat selaimen paikalliseen muistiin
(`localStorage`) ja näkyvät vain samalla selaimella. Kuvien tallennus lataa PNG-tiedoston
tavalliseen tapaan.

## Mitä repositorioon ei laiteta

Vain sivu ja sen työkalut. Sopimukset, lupakuvat, pohjatutkimukset, pankki- ja muut
henkilökohtaiset asiakirjat pysyvät pois tästä kansiosta (ks. `.gitignore`).
