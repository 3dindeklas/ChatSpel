# Digitaal Veiligheidsrijbewijs Quiz

Deze repository bevat een kant-en-klare quizmodule die je kunt insluiten op bijvoorbeeld een Wix-website. De quiz begeleidt kinderen in het basisonderwijs door verschillende thema's rondom digitale veiligheid. Na het doorlopen van de modules kan de leerling een persoonlijk certificaat downloaden.

## Bestanden

- `src/digitalSafetyQuiz.js` – JavaScript-module die de quiz rendert en beheert.
- `styles/digitalSafetyQuiz.css` – Stijlen voor de quiz.
- `public/index.html` – Voorbeeldpagina om de quiz lokaal te bekijken/testen.

## Lokaal testen

Open `public/index.html` in je browser (bijvoorbeeld door het bestand te openen vanuit Finder/Explorer of met een lokale webserver).

## Insluiten op Wix

1. Upload de bestanden `digitalSafetyQuiz.js` en `digitalSafetyQuiz.css` naar een publiek toegankelijke locatie (bijvoorbeeld GitHub, je eigen hosting of Wix Static Files).
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
