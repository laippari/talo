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
- [ ] **1. Moottorin vaihto (`next/`).** Sovellus käyntiin uudella piirtäjällä, omat varjostimet uudelleen:
  maaston leikkaus ja suunnitelman maski, harmaasävy, puiden piilotus kameran edestä, lehtien valaistus, sisävalot,
  lasi, tuli ja hehkut.
- [ ] **2. Valo.** Värinhallinta ja sävykäyrä, auringon varjot tontin alueella, taivaan valo, ympäröivä varjostus,
  talon materiaalit fysikaalisiksi (peltikatto, lasi, laudoitus), iltavalojen hehku.
- [ ] **3. Kasvillisuus tontilla.** Isojen puiden ja hedelmäpuiden lehvästö (pienemmät lehdet, läpikuultavuus, tuuli),
  oikea ruoho kameran lähellä, pensasaita lehtipintaiseksi, kaukaiset puut kevyiksi.
- [ ] **4. Talon ja pihan yksityiskohdat.** Ikkunoiden syvyys, sokkeli, räystäänaluset, terassi ja pergola, asfaltin
  reuna, kiveykset.
- [ ] **5. Ympäristö.** Maan pinta tontin ulkopuolella, lähimmät naapuritalot tummiksi, tiet, järvi, pilvet ja kaukoutu.
- [ ] **6. Viimeistely ja vaihto.** Reunanpehmennys, suorituskyky iPhonella, `next/` korvaa vanhan sivun.

## Periaatteet

- Jokainen vaihe tarkistetaan vakionäkymistä ennen julkaisua: Perusnäkymä, Tontti ylhäältä, Pohja ylhäältä, Olohuone,
  Terassi, silmänkorkeus pihalta, ilta ja yö.
- Kaikki toiminnot säilyvät: siirrot, kierrot, peilaus, talomallit, pohjat, näkymät, leikkaus, asemakuva, simulaatio,
  puhelimen alapaneeli.
- Jos WebGPU:ta ei ole, sama koodi piirtää WebGL2:lla. Raskaimmat tehosteet voi silloin jättää pois.
