# Renderöinnin ja mallinnuksen parannussuunnitelma

Tavoite: talo, piha ja tontti näyttävät uskottavilta mutta värikkäiltä, ja malli pyörii sujuvasti iPhone 17 Prolla
(Safari) ja MacBook Prolla. Malli on talon suunnittelun apuväline, joten talon mitat ja tontin tiedot pysyvät tarkkoina.

## Päätökset (14.11.2026)

- Uusi moottori: three.js 0.186.1, WebGPU ja automaattinen WebGL2-varatie. Sama versio ja rakenne kuin Oura-projektissa.
- Uusi moottori rakennetaan `next/`-kansioon vanhan rinnalle (https://laippari.github.io/talo/next/). Vanha sivu toimii
  koko ajan, ja se korvataan vasta, kun uusi on vähintään yhtä hyvä.
- Kohdelaitteet: iPhone 17 Pro ja MacBook Pro. Vanhempia laitteita ei viritetä erikseen.
- Kuvien tallennus pysyy ennallaan. Erillistä valokuvatilaa ei tehdä.
- Naapuritaloja ei tarkenneta, koska niiden ulkonäköä ei tiedetä. Lähimmät voidaan sävyttää tummiksi.
- Ympäristöä parannetaan vain sen verran, että se on rauhallinen ja uskottava tausta.

## Nykytila mitattuna (vanha moottori)

- three.js r128, WebGL2. 1 519 piirtokutsua ja 11,1 miljoonaa kolmiota kuvaa kohti, valtaosa kaukaisista puista.
- Ei varjoja, ympäröivää varjostusta, sävykäyrää, värinhallintaa, ympäristön valoa eikä jälkikäsittelyä.
- 20 materiaalimuutosta (`onBeforeCompile`) ja 5 omaa varjostinta, jotka eivät toimi WebGPU-piirtäjässä ja pitää
  kirjoittaa uudelleen.

## Vaiheet ja tilanne

- [x] **0. Pohjatyö.** Repo jaettu sivuksi, koodiksi, dataksi ja mediaksi. Yksitiedostoversio kootaan työkalulla.
- [ ] **1. Moottorin vaihto (`next/`).** Valmis yhtä kohtaa lukuun ottamatta.
  - [x] Sovellus käy uudella piirtäjällä (WebGPU ja WebGL2-varatie `?webgl`), kuva vastaa vanhaa moottoria.
  - [x] Omat varjostimet solmuina (`next/fx.js`): taivas, maaston leikkaus ja suunnitelman maski, tiemaalaukset, pihan
    pintarakenne, harmaasävy, lehtien valaistus, laudoitus ja terassilaudat, sisävalot, lasi, tuli ja ulkovalojen hehkut.
  - [x] Värinhallinta: sovelluksen värit ovat näytön arvoja, piirtäjä laskee lineaarisessa valossa.
  - [x] Testattu: mallinvaihto, valinta, kierto, peilaus, tasot, julkisivu, pohjat, terassin koko, simulaatio, kellonaika,
    puhelinkoko.
  - [ ] **Esteet pois kameran edestä** (puiden ja naapuritalojen piilotus) puuttuu vielä. `FX.treeHide` ja `FX.obHide`
    ovat tyhjiä.
- [ ] **2. Valo.** Aloitettu.
  - [x] Auringon varjot tontilla ja noin 10 m sen ympärillä: yksi varjokartta, 4096 px tietokoneella ja 2048 px
    puhelimessa. Varjot haalistuvat auringon laskiessa. `?varjot=0` ottaa ne pois.
  - [x] Ympäröivän metsän puut varjostavat tonttia: 85 m säteellä jokaisella laserpuulla on vain varjokarttaan piirtyvä
    latvus, jonka varjo on lehvästön tapaan aukkoinen.
  - [x] Valon tasapaino varjojen kanssa: aurinko 1,5-kertainen, taivaan valo 0,7-kertainen.
  - [x] Sävykäyrä: väri pysyy ennallaan polveen 0,72 asti ja taittuu sen jälkeen pehmeästi. three.js:n valmis neutraali
    käyrä tummensi asfaltin ja katon tukkoon, joten käytössä on oma versio ilman tummaa siirtymää.
  - [x] Sisätilat: katon alla huoneet saavat tasaisen osuuden päivänvalosta (ikkunoista heijastuva valo), joten seinät
    ja kattopaneeli ovat vaaleat. Kun katto on pois (Pohja ylhäältä), aurinko on himmennetty ja varjot pehmennetty.
  - [ ] Ympäröivä varjostus (nurkat, räystäänaluset, terassin alus).
  - [ ] Talon materiaalit fysikaalisiksi (peltikatto, lasin heijastus, laudoitus).
  - [ ] Iltavalojen hehku ja sisävalojen varjot.
  - [ ] Suorituskyky mitattava oikealla iPhonella ja MacBookilla (ruudunpäivitys varjojen kanssa).
- [ ] **3. Kasvillisuus tontilla.** Isojen puiden ja hedelmäpuiden lehvästö (pienemmät lehdet, läpikuultavuus, tuuli),
  oikea ruoho kameran lähellä, pensasaita lehtipintaiseksi, kaukaiset puut kevyiksi.
- [ ] **4. Talon ja pihan yksityiskohdat.** Ikkunoiden syvyys, sokkeli, räystäänaluset, terassi ja pergola, asfaltin
  reuna, kiveykset.
- [ ] **5. Ympäristö.** Maan pinta tontin ulkopuolella, tiet, järvi, pilvet ja kaukoutu. Lähimmät naapuritalot ovat jo
  tummia.
- [ ] **6. Viimeistely ja vaihto.** Reunanpehmennys, suorituskyky iPhonella, `next/` korvaa vanhan sivun.

## Uuden moottorin rakenne (`next/`)

| Tiedosto | Tehtävä |
| --- | --- |
| `index.html` | Sama sivu kuin juuressa, lataa three.js:n moduulina (importmap). |
| `boot.js` | Käynnistys: piirtäjä, laatutaso, varjojen oletukset, sävykäyrä, värien muunnokset, datan haku. |
| `fx.js` | Mallin omat tehosteet solmuina (TSL). |
| `main.js` | Sovellus. Sama koodi kuin `src/main.js`, tehosteet kutsutaan `FX`:n kautta. |

Muutokset tehdään toistaiseksi molempiin `main.js`-tiedostoihin, kunnes `next/` korvaa vanhan.

Huomioita työstä:

- `THREE.Color` on uudessa kirjastossa lineaarinen. Kärkiväreihin menevä väri tehdään `THREE.screenColor`-funktiolla.
- Kaikilla tekstikylteillä (Sprite) on kirjastossa yksi yhteinen geometria, jota ryhmien siivous ei saa tuhota.
- Omalla varjostimella piirretyt materiaalit (taivas, lasi, tuli, hehkut) on merkitty `userData.own`, eikä niitä
  yhdistetä muihin kappaleisiin.

## Periaatteet

- Jokainen vaihe tarkistetaan vakionäkymistä ennen julkaisua: Perusnäkymä, Tontti ylhäältä, Pohja ylhäältä, Olohuone,
  Terassi, silmänkorkeus pihalta, ilta ja yö.
- Kaikki toiminnot säilyvät: siirrot, kierrot, peilaus, talomallit, pohjat, näkymät, leikkaus, asemakuva, simulaatio,
  puhelimen alapaneeli.
- Jos WebGPU:ta ei ole, sama koodi piirtää WebGL2:lla. Raskaimmat tehosteet voi silloin jättää pois.
