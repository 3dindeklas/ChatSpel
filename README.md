# Digitaal Veiligheidsrijbewijs Quiz

Deze repository bevat een kant-en-klare quizmodule die je kunt insluiten op bijvoorbeeld een Wix-website. De quiz begeleidt kinderen in het basisonderwijs door verschillende thema's rondom digitale veiligheid. Na het doorlopen van de modules kan de leerling een persoonlijk certificaat downloaden.

## Bestanden

- `src/digitalSafetyQuiz.js` – JavaScript-module die de quiz rendert en beheert.
- `styles/digitalSafetyQuiz.css` – Stijlen voor de quiz.
- `public/index.html` – Voorbeeldpagina om de quiz lokaal te bekijken/testen.

## Installatie & lokaal testen

1. Kopieer de repository naar je eigen machine en installeer de afhankelijkheden:

   ```bash
   npm install
   ```

2. Maak optioneel een `.env`-bestand in de hoofdmap om lokale instellingen te overschrijven (zie [Configuratie](#configuratie)).

3. Start de server:

   ```bash
   npm start
   ```

4. Open vervolgens [http://localhost:3000/](http://localhost:3000/) in je browser om de quiz te bekijken. Het live dashboard is bereikbaar via `public/dashboard.html` en het beheer van vragen via `public/admin/questions.html`.

Tijdens ontwikkeling kun je ook `npm run dev` gebruiken voor automatische herstart bij codewijzigingen.

## Testplan

Zie [TESTING.md](TESTING.md) voor het actuele testplan met automatische controles, handmatige regressietests en een releasechecklist. Vul dit document aan wanneer er nieuwe functionaliteit of scripts bijkomen.

## Configuratie

De server leest instellingen uit environment-variabelen. Plaats ze lokaal in een `.env`-bestand en configureer ze op Render via het **Environment**-tabblad.

| Variabele | Beschrijving | Standaard |
| --- | --- | --- |
| `PORT` | Poort waarop de server draait. | `3000` |
| `DATABASE_URL` | Connection string naar een externe PostgreSQL-database (bijvoorbeeld Render). Als deze waarde is gezet, gebruikt de app PostgreSQL in plaats van de meegeleverde SQLite-database. | *(niet gezet)* |
| `DATABASE_SSL` | Zet deze op `false` om SSL uit te schakelen voor PostgreSQL. Laat leeg (of `true`) om SSL te gebruiken; Render vereist dit meestal. | `true` |
| `SQLITE_DATABASE_PATH` | Pad naar een alternatief SQLite-bestand als je geen PostgreSQL gebruikt. | `data/quiz.db` |
| `SESSION_TIMEOUT_MS` | Bepaalt hoe lang een sessie actief blijft zonder hartslag (dashboard). | `60000` |

### Verbinding maken met een Render-database

1. Maak in Render een **PostgreSQL**-database aan en kopieer de `External Database URL`.
2. Voeg in de Render-service van deze app de volgende environment-variabelen toe:

   ```
   DATABASE_URL=postgres://gebruikersnaam:password@host:port/dbname?sslmode=require
   DATABASE_SSL=true
   ```

   Laat `DATABASE_SSL` op `true` staan om het zelfondertekende certificaat van Render te accepteren. Pas de waarde alleen aan als je een eigen certificaat beheert.

3. Deploy de service opnieuw. Bij de eerste start wordt de database automatisch voorzien van de tabellen en de standaard quizinhoud vanuit `data/quizData.json`.

Wil je lokaal dezelfde Render-database gebruiken? Maak dan een `.env`-bestand met dezelfde `DATABASE_URL` en `DATABASE_SSL=true`.

### Vragen beheren

Ga naar [http://localhost:3000/admin/questions.html](http://localhost:3000/admin/questions.html) om het overzicht van vragen te zien. Vanuit dit scherm kun je bestaande vragen bewerken of nieuwe vragen toevoegen. Het formulier ondersteunt het aanpassen van antwoordopties, feedbackteksten en het type vraag (één antwoord of meerdere antwoorden).

## Insluiten op Wix

1. Upload de bestanden `digitalSafetyQuiz.js` en `digitalSafetyQuiz.css` naar een publiek toegankelijke locatie (bijvoorbeeld GitHub, je eigen hosting of Wix Static Files). Wanneer je de nieuwe back-end functionaliteit wilt gebruiken heb je daarnaast een server nodig die de API aanbiedt (zie bovenstaande stappen).
2. Voeg op Wix een **Embed Code** (HTML iframe) element toe.
3. Plak onderstaande HTML en pas zo nodig de paden naar de bestanden aan.

```html
<div id="quiz"></div>
<link
  rel="stylesheet"
  href="https://jouw-domein.nl/path/to/digitalSafetyQuiz.css"
/>
<script
  src="https://jouw-domein.nl/path/to/digitalSafetyQuiz.js"
  data-api-base-url="https://jouw-backend.nl"
></script>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    new DigitalSafetyQuiz({
      container: "#quiz"
      // Je kunt de standaardteksten of modules eventueel aanpassen via de config-optie
      // config: { title: "Mijn aangepaste titel" }
    });
  });
</script>
```

De `data-api-base-url` geeft aan waar de server draait die de API aanbiedt (bijvoorbeeld
een Render-service). Gebruik hierbij het domein of basispad waar de API beschikbaar is;
de quiz voegt zelf `/api/...` toe aan de requests. Deze URL wordt automatisch gebruikt
voor het versturen van heartbeat- en sessieverkeer, zodat het insluiten op een extern
domein (zoals Wix) correct blijft werken. Je kunt het basispad ook op een later moment
instellen via JavaScript:

```html
<script>
  window.DigitalSafetyQuizDefaults = {
    apiBaseUrl: "https://jouw-backend.nl"
  };
</script>
<script src="https://jouw-domein.nl/path/to/digitalSafetyQuiz.js"></script>
```

### Custom element (zonder iframe)

Gebruik je het custom-elementscript (`digitalSafetyQuizCE.js`) in Wix, dan vul je de attributen als volgt in:

| Attribuut | Verplicht | Voorbeeldwaarde | Uitleg |
| --- | --- | --- | --- |
| `data-config-url` | Ja, als je vragen wilt tonen | `https://jouw-backend.nl/api/quiz-config` | Absolute URL naar een JSON-configuratie in hetzelfde formaat als [`/api/quiz-config`](server/index.js). Wanneer je de Node-server online hebt staan, verwijs je direct naar dat endpoint. Zonder back-end kun je een statisch `.json`-bestand uploaden (zie [`data/quizData.json`](data/quizData.json) voor de structuur) en de volledige URL naar dat bestand invullen. |
| `data-api-base` | Optioneel maar aanbevolen | `https://jouw-backend.nl` | Basis-URL voor de API die sessies, statistieken en certificaatgegevens verwerkt. Laat leeg als je alleen een statische quiz zonder opslag gebruikt. Het script voegt zelf `/api/...` toe voor de verschillende requests. |
| `data-enable-certificate` | Optioneel | *(laat leeg, attribuut alleen toevoegen)* | Wanneer dit attribuut aanwezig is wordt `html2canvas` geladen zodat de downloadknop voor het certificaat werkt. |

Zorg er daarnaast voor dat `digitalSafetyQuiz.css`, `digitalSafetyQuiz.js` en (optioneel) `html2canvas` via `ensureStylesheet`/`ensureScript` worden geladen zoals in het voorbeeld in `public/digitalSafetyQuizCE.js`. Zonder geldige `data-config-url` blijft de modulelijst leeg en verschijnen er geen vragen.

### Configuratie aanpassen

Je kunt de quiz personaliseren door een configuratie-object mee te geven bij het initialiseren:

```javascript
new DigitalSafetyQuiz({
  container: "#quiz",
  config: {
    title: "Mijn Digitale Veiligheidsquiz",
    description: "Pas de introductietekst aan.",
    modules: [
      // ...je eigen modules en vragen...
    ],
    certificateMessage: "Eigen certificaattekst",
    strings: {
      startButton: "Start nu!"
    }
  }
});
```

Let op: voor de downloadknop van het certificaat heb je de bibliotheek [`html2canvas`](https://html2canvas.hertzen.com/) nodig. Voeg deze toe vóór `digitalSafetyQuiz.js` als je de downloadfunctie wilt gebruiken.

```html
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
```

Veel succes met het digitale veiligheidsrijbewijs!
