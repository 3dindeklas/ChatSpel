# ChatSpel Wiki

## Configuratie via Google Sheets

De quiz haalt al zijn inhoud uit een Google Spreadsheet. Standaard wordt het spreadsheet met ID `1-mU_hGc-GLgu1QD_s1gyYW7iZ992srYMdGeQ-nicuRc` gebruikt. Je kunt dit overschrijven door de omgevingsvariabele `GOOGLE_SHEETS_ID` te zetten voordat je de server start.

### Vereiste tabbladen

| Tabblad   | Doel                                        | Vereiste kolommen                                                                 |
|-----------|---------------------------------------------|-----------------------------------------------------------------------------------|
| defaults  | Algemene instellingen en vertalingen        | `key`, `value`                                                                    |
| modules   | Moduleoverzicht                             | `id`, `title`, `intro`, `tips`, `questionsPerSession`, `position`                |
| questions | Vragen per module                           | `id`, `moduleId`, `text`, `type`, `feedbackCorrect`, `feedbackIncorrect`, `position` |
| options   | Antwoordopties gekoppeld aan vragen         | `id`, `questionId`, `label`, `isCorrect`, `position`                              |

### Inhoud van het tabblad `defaults`

| key                | Beschrijving                                                                                                       | Voorbeeldwaarde |
|--------------------|---------------------------------------------------------------------------------------------------------------------|-----------------|
| `title`            | Titel van de quiz.                                                                                                  | `Digitaal Veiligheidsrijbewijs` |
| `description`      | Introductietekst op het startscherm.                                                                               | `Doorloop de modules, beantwoord de vragen ...` |
| `certificateMessage` | Tekst die onderaan het certificaat verschijnt nadat een deelnemer alles heeft voltooid.                           | `Gefeliciteerd! ...` |
| `strings`          | JSON-object met UI-strings zoals knoppen en foutmeldingen. Gebruik geldige JSON, bijvoorbeeld `{ "startButton": "Start de quiz" }`. | `{ "startButton": "Start de quiz" }` |

Alle overige tabellen mogen aanvullende kolommen bevatten voor eigen gebruik, maar de kolommen hierboven zijn verplicht zodat de parser de gegevens kan verwerken. De velden `tips` (in `modules`) en `isCorrect` (in `options`) verwachten respectievelijk een JSON-array en een TRUE/FALSE-waarde.

### Werkwijze voor wijzigingen

1. Pas de gegevens in het spreadsheet aan.
2. Sla het spreadsheet op; er is geen extra deploystap nodig.
3. Herlaad de quiz of de beheerpagina om de nieuwe inhoud te zien.

Voor lokale ontwikkeling kun je testdata uit de map `data/google-sheets/` gebruiken door de omgevingsvariabele `GOOGLE_SHEETS_FAKE_DATA_DIR` te zetten op dat pad. De server leest dan de JSON-bestanden in plaats van het live spreadsheet.
