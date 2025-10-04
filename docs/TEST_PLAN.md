# Testplan voor ChatSpel

Dit testplan beschrijft hoe we de stabiliteit van de Digitale Veiligheidsquiz waarborgen naarmate de codebase groeit. Het plan is opgesplitst in lagen zodat we zowel de back-end- als front-endlogica blijven afdekken.

## 1. Continüle integratie
- **Doel**: Automatisch vertrouwen krijgen in elke wijziging.
- **Actiepunten**:
  - Voeg een CI-workflow toe (bijv. GitHub Actions) die `npm install` en `npm test` uitvoert op elke push en pull request.
  - Rapporteer testresultaten en mislukte stappen direct in de PR.

## 2. Testpijlers

### 2.1 API-integratietests (nu geïmplementeerd)
- **Framework**: Jest + Supertest.
- **Dekking**:
  - Lezen van configuratie vanuit Google Sheets (`GET /api/quiz-config`, `GET /api/modules`, `GET /api/questions`).
  - Afhandelen van niet-ondersteunde mutaties (`POST /api/questions` retourneert een duidelijke melding).
- **Aanpak**:
  - Gebruik `process.env.GOOGLE_SHEETS_FAKE_DATA_DIR` om naar lokale JSON-fixtures te verwijzen in plaats van live spreadsheets.
  - Houd de fixtures klein en representatief zodat tests deterministisch blijven.

### 2.2 Front-end componenttests (nu geïmplementeerd)
- **Framework**: Jest (jsdom-omgeving).
- **Dekking**:
  - Renderen en automatisch bijwerken van het dashboard.
  - Eventuele regressies in UI-logica kunnen opgespoord worden zonder een browser.

### 2.3 End-to-end tests (te plannen)
- **Aanbevolen tooling**: Playwright of Cypress.
- **Scope**:
  - Volledige quiz flow (starten, beantwoorden van vragen, certificaat genereren).
  - Dashboard dat live statistieken toont terwijl sessies worden voltooid.
- **Status**: Nog te implementeren zodra er een stabiele CI is en de belangrijkste user journeys zijn vastgelegd.

## 3. Testdata en fixtures
- Gebruik de JSON-bestanden in `data/google-sheets/` als bron voor testdata.
- Voor nieuwe testcases kunnen aanvullende fixture-bestanden in `tests/fixtures/` worden toegevoegd.

## 4. Richtlijnen voor toekomstige tests
- Houd tests onafhankelijk en idempotent; wijzig de fixturebestanden alleen bewust en documenteer die wijzigingen.
- Gebruik duidelijke beschrijvingen (`it("should ...")`) zodat falende tests direct inzicht geven in het probleem.
- Documenteer bugfixes met regressietests om herhaling te voorkomen.

## 5. Uitvoering
- **Lokale ontwikkeling**: `npm test` draait alle Jest-tests sequentieel (`--runInBand`) zodat gedeelde fixtures niet door elkaar gaan lopen.
- **CI**: Voeg de teststap toe aan de bestaande pipeline zodra die is ingericht.

Met dit plan borgen we dat belangrijke backend-processen, zoals sessieregistratie en dashboardrapportage, getest worden en dat de front-end de data correct blijft weergeven. Verdere uitbreidingen (zoals e2e-tests) kunnen hier gemakkelijk op aansluiten.
