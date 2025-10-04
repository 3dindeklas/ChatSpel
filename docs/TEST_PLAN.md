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
  - Lezen van configuratie (`GET /api/quiz-config`, `GET /api/modules`).
  - Beheer van vragen (`POST /api/questions`, `PUT /api/questions/:id`).
  - Dashboardstatistieken (`GET /api/dashboard`).
- **Aanpak**:
  - Gebruik een in-memory SQLite-database per testsuite.
  - Herseed de database voor elke test om deterministische resultaten te krijgen.

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
- Gebruik `data/quizData.json` als bron voor seed-data.
- Voor nieuwe testcases kunnen aanvullende fixture-bestanden in `tests/fixtures/` worden toegevoegd.

## 4. Richtlijnen voor toekomstige tests
- Houd tests onafhankelijk en idempotent; reset de database tussen tests.
- Gebruik duidelijke beschrijvingen (`it("should ...")`) zodat falende tests direct inzicht geven in het probleem.
- Documenteer bugfixes met regressietests om herhaling te voorkomen.

## 5. Uitvoering
- **Lokale ontwikkeling**: `npm test` draait alle Jest-tests sequentieel (`--runInBand`) zodat de gedeelde SQLite-verbinding geen race conditions veroorzaakt.
- **CI**: Voeg de teststap toe aan de bestaande pipeline zodra die is ingericht.

Met dit plan borgen we dat belangrijke backend-processen, zoals sessieregistratie en dashboardrapportage, getest worden en dat de front-end de data correct blijft weergeven. Verdere uitbreidingen (zoals e2e-tests) kunnen hier gemakkelijk op aansluiten.
