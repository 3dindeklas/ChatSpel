# Digitaal Veiligheidsrijbewijs Quiz

Deze repository bevat een kant-en-klare quizmodule die je eenvoudig kunt integreren op een eigen website. De quiz begeleidt kinderen in het basisonderwijs door verschillende thema's rondom digitale veiligheid. Na het doorlopen van de modules kan de leerling een persoonlijk certificaat downloaden.

## Bestanden

- `src/digitalSafetyQuiz.js` – JavaScript-module die de quiz rendert en beheert.
- `styles/digitalSafetyQuiz.css` – Stijlen voor de quiz.
- `public/index.html` – Voorbeeldpagina om de quiz lokaal te bekijken/testen.

## Lokaal testen

Installeer eerst de afhankelijkheden en start daarna de Node-server. De server levert de quizbestanden, API's en beheerschermen uit.

```bash
npm install
npm start
npm test
```

Open vervolgens [http://localhost:3000/](http://localhost:3000/) in je browser om de quiz te bekijken. Het live dashboard is bereikbaar via `public/dashboard.html` en het beheer van vragen via `public/questions.html`.

### Automatische dashboardverversing

Het dashboard wordt standaard elke 15 seconden ververst. Pas dit aan door `refreshIntervalMs` mee te geven aan `createDigitalSafetyDashboard` (waarde in milliseconden).

### Vragen beheren

Ga naar [http://localhost:3000/questions.html](http://localhost:3000/questions.html) om het overzicht van vragen te zien. Vanuit dit scherm kun je bestaande vragen bewerken of nieuwe vragen toevoegen. Het formulier ondersteunt het aanpassen van antwoordopties, feedbackteksten en het type vraag (één antwoord of meerdere antwoorden).

## Integratie op je eigen site

1. Publiceer de bestanden `digitalSafetyQuiz.js` en `digitalSafetyQuiz.css` op een locatie die jouw website kan laden (bijvoorbeeld je eigen hosting of een CDN).
2. Voeg op je pagina een element toe waar de quiz in mag landen, bij voorkeur een leeg `<div>`.
3. Zet vóór het initialiseren van de quiz de globale variabele `window.__CHAT_SPEL_SESSION_API_BASE_URL__` op de URL van je Google Apps Script web-app (zie hieronder voor de instructies).
4. Voeg onderstaande HTML toe en pas de paden naar de bestanden aan.

```html
<div id="quiz"></div>
<link rel="stylesheet" href="https://jouw-domein.nl/path/to/digitalSafetyQuiz.css" />
<script src="https://jouw-domein.nl/path/to/digitalSafetyQuiz.js"></script>
<script>
  window.__CHAT_SPEL_SESSION_API_BASE_URL__ =
    "https://script.google.com/macros/s/JE-GEDEPLOYEDE-ID/exec";

  document.addEventListener("DOMContentLoaded", function () {
    new DigitalSafetyQuiz({
      container: "#quiz"
    });
  });
</script>
```

### Configuratie via Google Sheets

Alle quizdata komt rechtstreeks uit Google Sheets. De standaard Spreadsheet-ID is `1-mU_hGc-GLgu1QD_s1gyYW7iZ992srYMdGeQ-nicuRc`. Wil je een ander spreadsheet gebruiken, stel dan de omgevingsvariabele `GOOGLE_SHEETS_ID` in voordat je de server start.

Maak in het spreadsheet minimaal de volgende tabbladen aan:

- **defaults** – bevat algemene instellingen met de kolommen `key` en `value`.
  - `title` – titel die bovenaan de quiz verschijnt.
  - `description` – introductietekst op de startpagina.
  - `certificateMessage` – tekst op het certificaat.
  - `strings` – JSON-object met UI-strings, bijvoorbeeld `{ "startButton": "Start de quiz" }`.
- **modules** – kolommen `id`, `title`, `intro`, `tips` (JSON-array), `questionsPerSession` en `position`.
- **questions** – kolommen `id`, `moduleId`, `text`, `type`, `feedbackCorrect`, `feedbackIncorrect` en `position`.
- **options** – kolommen `id`, `questionId`, `label`, `isCorrect` (TRUE/FALSE) en `position`.

Pas je iets aan in het spreadsheet, dan is de wijziging direct zichtbaar in de quiz zonder dat je code hoeft te deployen.

Let op: voor de downloadknop van het certificaat heb je de bibliotheek [`html2canvas`](https://html2canvas.hertzen.com/) nodig. Voeg deze toe vóór `digitalSafetyQuiz.js` als je de downloadfunctie wilt gebruiken.

```html
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
```

Veel succes met het digitale veiligheidsrijbewijs!

## Sessies opslaan in Google Sheets

Gebruik het Google Apps Script in [`docs/google-apps-script-session-mirror.gs`](docs/google-apps-script-session-mirror.gs) om
sessiegegevens rechtstreeks in een Google Sheet te bewaren. Het script implementeert dezelfde routes als de Node-server
(`POST /api/sessions`, `POST /api/sessions/:id/heartbeat`, `POST /api/sessions/:id/attempt`, `POST /api/sessions/:id/complete`,
`POST /api/sessions/:id/leave` en `GET /api/dashboard`) en werkt zonder bijkomende configuratie zodra je het hebt gedeployed
als web-app.

1. Maak een nieuw Apps Script-project aan en plak de code uit het hierboven genoemde bestand in de editor.
2. Vul je Spreadsheet-ID in en deploy het project als web-app met toegang voor iedereen met de link.
3. Configureer je website door vóór het initialiseren van de quiz `window.__CHAT_SPEL_SESSION_API_BASE_URL__` te zetten naar de
   URL van de web-app (zie voorbeeld hierboven). Zowel de quiz als het dashboard sturen hun sessieaanroepen automatisch naar dit
   adres.
4. Controleer het Google Sheet: nieuwe sessies, heartbeats, pogingen en afrondingen verschijnen direct zodat je dashboards kunt
   opbouwen zonder de Node-server.
