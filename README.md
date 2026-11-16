# Talo – Ideal 132 tontilla

Selaimessa toimiva three.js-malli tontista, talosta, pihasta ja perustuksista. Julkaistu sivu:
https://laippari.github.io/talo/

## Rakenne

| Polku | Sisältö |
| --- | --- |
| `index.html` | Sivun rakenne ja tyylit. Käynnistää `src/boot.js`:n. |
| `src/boot.js` | Käynnistys: three.js 0.186.1, WebGPU-piirtäjä (WebGL2 varalla), laatutaso, varjot ja sävykäyrä. |
| `src/fx.js` | Mallin omat tehosteet piirtäjän solmuina (maaston leikkaukset, lasi, sisävalot, tuli, esteiden piilotus). |
| `src/main.js` | Koko sovellus: malli ja käyttöliittymä. |
| `data/site.json` | Maasto, tontti, rakennukset, puut ja ilmakuvat. |
| `assets/` | Media (olohuoneen television video). |
| `vanha/` | Edellinen moottori (three.js r128, WebGL) sellaisenaan varalla: https://laippari.github.io/talo/vanha/ |
| `tools/build_single.py` | Kokoaa sivusta yhden HTML-tiedoston (`dist/talo.html`). |
| `docs/SUUNNITELMA.md` | Renderöinnin ja mallinnuksen parannussuunnitelma ja sen tilanne. |

Osoitteen perään voi lisätä `?webgl` (pakottaa WebGL2:n) tai `?varjot=0` (varjot pois).

## Avaaminen

```sh
python3 -m http.server 8000      # → http://localhost:8000
```

Sivu hakee datan erillisestä tiedostosta, joten se tarvitsee palvelimen. Yksitiedostoversio aukeaa
kaksoisnapsautuksella:

```sh
python3 tools/build_single.py    # → dist/talo.html
```

## Julkaisu

Jokainen `main`-haaran push julkaisee sivun GitHub Pagesiin (`.github/workflows/pages.yml`).
Käännösvaihetta ei ole. Workflow tarkistaa datan ja skriptien syntaksin ja julkaisee tiedostot sellaisinaan.

## Työtapa

Sama malli kuin Oura- ja kartat-projekteissa:

1. Muutokset tehdään `src/`-kansion tiedostoihin ja `index.html`:ään. `vanha/`-kansioon ei kosketa.
2. Muutos tarkistetaan paikallisesti: siirrot, kierrot, peilaus, mallinvaihto, näkymät, simulaatio ja mobiili
   kaikilla talomalleilla.
3. Commit ja push `main`-haaraan → GitHub Actions julkaisee sivun noin minuutissa.

## Tallennus

Omat näkymät ja kamera-ajot tallentuvat selaimen paikalliseen muistiin (`localStorage`) ja näkyvät vain samalla
selaimella. Kuvien tallennus lataa PNG-tiedoston.

## Mitä repositorioon ei laiteta

Vain sivu ja sen työkalut. Sopimukset, lupakuvat, pohjatutkimukset, pankki- ja muut henkilökohtaiset asiakirjat
pysyvät pois tästä kansiosta.
