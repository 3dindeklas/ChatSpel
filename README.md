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
```

Open vervolgens [http://localhost:3000/](http://localhost:3000/) in je browser om de quiz te bekijken. Het live dashboard is bereikbaar via `public/dashboard.html` en het beheer van vragen via `public/questions.html`.

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
