# Renderöinnin ja mallinnuksen parannussuunnitelma

Tavoite: talo, piha ja tontti näyttävät uskottavilta mutta värikkäiltä, ja malli pyörii sujuvasti iPhone 17 Prolla
(Safari) ja MacBook Prolla. Malli on talon suunnittelun apuväline, joten talon mitat ja tontin tiedot pysyvät tarkkoina.

## Päätökset (14.11.2026)

- Uusi moottori: three.js 0.186.1, WebGPU ja automaattinen WebGL2-varatie. Sama versio ja rakenne kuin Oura-projektissa.
- Uusi moottori on 14.11.2026 alkaen pääsivu (`index.html` ja `src/`). Edellinen moottori (r128) on sellaisenaan
  varalla kansiossa `vanha/` (https://laippari.github.io/talo/vanha/), eikä siihen tehdä muutoksia. `next/` ohjaa
  pääsivulle.
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
- [x] **1. Moottorin vaihto.** Valmis, uusi moottori on pääsivu.
  - [x] Sovellus käy uudella piirtäjällä (WebGPU ja WebGL2-varatie `?webgl`), kuva vastaa vanhaa moottoria.
  - [x] Omat varjostimet solmuina (`src/fx.js`): taivas, maaston leikkaus ja suunnitelman maski, tiemaalaukset, pihan
    pintarakenne, harmaasävy, lehtien valaistus, laudoitus ja terassilaudat, sisävalot, lasi, tuli ja ulkovalojen hehkut.
  - [x] Värinhallinta: sovelluksen värit ovat näytön arvoja, piirtäjä laskee lineaarisessa valossa.
  - [x] Esteet pois kameran edestä: puut pudotetaan kokonaisina kärkivaiheessa (puun tyvi ja korkeus
    instanssiattribuuttina `tb`), naapurien rakennukset ja pylväät leikataan pois.
  - [x] Vain tontti ja leikkaus: tontti leikataan varjostimessa tarkasti rajaa pitkin (`plotIn`), ei leikkaustasoilla
    (piirtäjän yleiset leikkaustasot eivät toimi uudessa kirjastossa).
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
  - [x] Yö on pimeä: kun aurinko on yli kuusi astetta horisontin alla, valaisemattomat pinnat näkyvät vain heikosti.
  - [ ] Suorituskyky mitattava oikealla iPhonella ja MacBookilla (ruudunpäivitys varjojen kanssa).
- [ ] **3. Kasvillisuus tontilla.** Isojen puiden ja hedelmäpuiden lehvästö (pienemmät lehdet, läpikuultavuus, tuuli),
  oikea ruoho kameran lähellä, pensasaita lehtipintaiseksi, kaukaiset puut kevyiksi.
- [ ] **4. Talon ja pihan yksityiskohdat.** Ikkunoiden syvyys, sokkeli, räystäänaluset, terassi ja pergola, asfaltin
  reuna, kiveykset.
- [ ] **5. Ympäristö.** Maan pinta tontin ulkopuolella, tiet, järvi, pilvet ja kaukoutu. Lähimmät naapuritalot ovat jo
  tummia.
- [ ] **6. Viimeistely.** Reunanpehmennys ja suorituskyvyn säätö iPhonella. `vanha/` poistetaan, kun uutta on käytetty
  jonkin aikaa ongelmitta.

## Käyttöliittymä ja malli (14.11.2026)

- Reunan painikkeet: tasot (alapaneeli), esteet pois kameran edestä (liuku), näkymät, tekstit, perusnäkymä.
- Perustukset on taso. Vain tontti on kytkin Ympäristö-välilehdellä. Ohjetekstit, pintavaihtoehdot ja listat on poistettu.
- Vain tontti näyttää tontin lohkona: seinissä täyttö, pintamaa ja kairausten maakerrokset, pohja tasolla +25.
- Leikkaus on tontin pituinen sivukuva talon keskilinjalta: maakerrokset, kairaukset, perustus, paalut ja korot.
- Talon ja autotallin korot ovat erilliset: kumpikin lasketaan pihan perussuunnitelmasta (`GP.TB`), ja oma hienosäätö
  nostaa tai laskee maata rakennuksen ympärillä pehmeästi häipyen.
- Oletukset: tekstit pois, puujulkisivu, alkuperäinen pohja peilikuvana, korot 0.
- Perusnäkymä: kotipainike ja jokainen sivun käynnistys palauttavat saman perustilan (kaikki työkalut ja tilat pois,
  tasot oletuksiin, tekstit pois, esteliuku nollaan, kello 14.00, kamera talon etuviistoon). Talon ja pihan valinnat
  säilyvät. Selaimeen jäävät muistiin vain asetukset: kameran nopeus, valojen himmennys, maanpinnan läpinäkyvyys,
  sivupaneeli ja eläimet.
- Kairaukset maan alla on oma tilansa: Poistu palauttaa tasot, tekstit ja kameran sellaisiksi kuin ne olivat.
- Valinnoista on poistettu Lehtikuusi 125, Kaarna 152 ja Pikku-Jussi. Niiden koodi on tallessa.

## Rakenne

| Tiedosto | Tehtävä |
| --- | --- |
| `index.html` | Sivun rakenne ja tyylit, lataa three.js:n moduulina (importmap). |
| `src/boot.js` | Käynnistys: piirtäjä, laatutaso, varjojen oletukset, sävykäyrä, värien muunnokset, datan haku. |
| `src/fx.js` | Mallin omat tehosteet solmuina (TSL). |
| `src/main.js` | Sovellus: malli ja käyttöliittymä. |
| `vanha/` | Edellinen moottori sellaisenaan. |

Huomioita työstä:

- `THREE.Color` on uudessa kirjastossa lineaarinen. Kärkiväreihin menevä väri tehdään `THREE.screenColor`-funktiolla.
- Kaikilla tekstikylteillä (Sprite) on kirjastossa yksi yhteinen geometria, jota ryhmien siivous ei saa tuhota.
- Omalla varjostimella piirretyt materiaalit (taivas, lasi, tuli, hehkut) on merkitty `userData.own`, eikä niitä
  yhdistetä muihin kappaleisiin.
- `THREE.LineLoop` ei toimi uudessa piirtäjässä: suljettu viiva tehdään `THREE.Line`-viivana, jonka alkupiste toistuu.
- Valojen arvot päivittyvät piirtäjän omassa kellossa (kerran ruudussa). Testissä, jossa ruudut ajetaan käsin, kello
  pitää siirtää itse (`renderer._nodes.nodeFrame.update()`), muuten valot näyttävät jäävän vanhoihin arvoihin.

## Periaatteet

- Jokainen vaihe tarkistetaan vakionäkymistä ennen julkaisua: Perusnäkymä, Tontti ylhäältä, Pohja ylhäältä, Olohuone,
  Terassi, silmänkorkeus pihalta, ilta ja yö.
- Kaikki toiminnot säilyvät: siirrot, kierrot, peilaus, talomallit, pohjat, näkymät, leikkaus, asemakuva, simulaatio,
  puhelimen alapaneeli.
- Jos WebGPU:ta ei ole, sama koodi piirtää WebGL2:lla. Raskaimmat tehosteet voi silloin jättää pois.
