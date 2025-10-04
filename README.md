# Digitaal Veiligheidsrijbewijs Quiz

Deze repository bevat een kant-en-klare quizmodule die je kunt insluiten op bijvoorbeeld een Wix-website. De quiz begeleidt kinderen in het basisonderwijs door verschillende thema's rondom digitale veiligheid. Na het doorlopen van de modules kan de leerling een persoonlijk certificaat downloaden.

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
<script src="https://jouw-domein.nl/path/to/digitalSafetyQuiz.js"></script>
<script>
  window.__CHAT_SPEL_SESSION_API_BASE_URL__ =
    "https://script.google.com/macros/s/JE-GEDEPLOYEDE-ID/exec";

  document.addEventListener("DOMContentLoaded", function () {
    new DigitalSafetyQuiz({
      container: "#quiz"
      // Je kunt de standaardteksten of modules eventueel aanpassen via de config-optie
      // config: { title: "Mijn aangepaste titel" }
    });
  });
</script>
```

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
