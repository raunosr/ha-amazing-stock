# Amazing Stock Card

Home Assistantin **UI-kortti** osakkeiden, rahastojen, ETF:ien ja indeksien seurantaan. Käyttää nykyisiä kurssisensoreitasi. Avanza Stockin attribuutit tunnistuvat automaattisesti; muiden integraatioiden kentät voi määrittää kortin editorissa.

![Kortin esikatselu – keksityt demotiedot](docs/preview.png)

## Asennus

1. Avaa **HACS → valikko → Mukautetut repositoriot / Custom repositories**.
2. Lisää `https://github.com/raunosr/ha-amazing-stock` ja valitse tyypiksi **Dashboard** (vanhemmissa versioissa **Lovelace**).
3. Lataa **Amazing Stock Card** ja päivitä selain.
4. Muokkaa kojelautaa → lisää kortti → **Amazing Stock Card**.
5. Valitse nykyiset sensorit kortin visuaalisessa editorissa.

Jos korttia ei löydy, tarkista kojelautojen resursseista JavaScript-moduuli `/hacsfiles/ha-amazing-stock/ha-amazing-stock.js`.

Kortti ei tarvitse muutoksia `configuration.yaml`-tiedostoon. Uusien kurssisensorien luominen kuuluu käyttämällesi integraatiolle; kortin editorissa valitaan jo olemassa olevia sensoreita. Tämä julkaisu ei sisällä integraatiota.

## Käyttö

Seurantalistassa näkyvät nimi, kurssi, valuutta, päivän muutos ja leveässä näkymässä viikon kuvaaja sekä prosenttimuutos. Rivin painaminen avaa kohteen suuren kuvaajan. Jakson voi vaihtaa päiväksi, viikoksi, kuukaudeksi tai vuodeksi. Kuvaajan voi piilottaa ja riveistä tehdä tiiviimmät.

Editorissa voit lisätä ja poistaa kortin rivejä, muuttaa järjestystä, nimiä ja kohteen tyyppiä sekä määrittää muiden integraatioiden attribuutit. Sensorin tilan tulee sisältää numeerinen hinta. Valuutta luetaan tavallisesti `unit_of_measurement`-attribuutista. Puuttuvia muutostietoja ei arvata.

Lista on **vieritettävä**. Sections-kojelautanäkymässä kortti noudattaa HA:n Layout-asetuksia ja `grid_options`-määrityksiä, esimerkiksi `columns: 12` ja `rows: 10`. Lisääminen ei kasvata kortin korkeutta. Otsikot pysyvät paikallaan, ja vierityskohta säilyy kurssipäivityksissä. Matalassa kortissa suuri kuvaaja piilotetaan, jotta listalle jää tilaa. Masonry-näkymässä listan enimmäiskorkeus on 320 pikseliä.

Kuvaajat näyttävät **Home Assistantiin tallentuneen historian**. Vuoden historiaa ei synny, jos HA säilyttää vain muutaman päivän tiedot. Kortti ilmaisee puuttuvan tai osittaisen historian ja erottaa sensorin päivitysajan lähteen mahdollisesta kurssiaikaleimasta. Avanzan datan viive pysyy lähteen mukaisena.

Valinnainen kortin YAML-esimerkki (kojelautaan, ei `configuration.yaml`-tiedostoon):

```yaml
type: custom:amazing-stock-card
title: Sijoitukset
locale: fi
entities:
  - entity: sensor.microsoft
    symbol: MSFT
    kind: stock
  - entity: sensor.indeksirahasto
    kind: fund
default_period: week
```

Vaihda esimerkkien tunnukset omiin olemassa oleviin sensoreihisi. Tarkat asetukset ja muiden lähteiden kenttäkartoitukset ovat [tietosopimuksessa](docs/data-contract.md). [Englanninkielinen ohje](README.md) sisältää manuaalisen asennuksen ja kehitysohjeet.
