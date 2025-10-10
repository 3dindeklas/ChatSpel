# Testplan

Deze teststrategie helpt om de belangrijkste onderdelen van ChatSpel te controleren telkens wanneer er wijzigingen plaatsvinden. De stappen zijn opgesplitst in automatische controles (voor zover beschikbaar) en handmatige regressietests. Voeg bij nieuwe functionaliteit altijd relevante scenario's toe aan de tabellen hieronder.

## 1. Automatische controles

| Domein | Test | Command | Verwachte uitkomst |
|--------|------|---------|--------------------|
| Projectbreed | Pakketinstallatie | `npm install` | Installatie voltooit zonder fouten |
| Lint/kwaliteit | ESLint (in te plannen) | _TODO: `npm run lint`_ | Geen lint-fouten |
| Backend | Unit tests voor server logica | _TODO_ | Alle tests slagen |
| Frontend | Unit tests voor componenten | _TODO_ | Alle tests slagen |

> :bulb: Voeg bij het introduceren van nieuwe lint- of testcommando's de exacte opdracht toe aan deze tabel.

## 2. Handmatige regressietests

Voer deze controles uit in een lokale ontwikkelomgeving (bijv. `npm run start`) na het doorvoeren van wijzigingen.

### 2.1 Authenticatie en sessiebeheer

| Scenario | Stappen | Verwachte uitkomst |
|----------|---------|--------------------|
| School maakt nieuwe sessie aan | 1. Ga naar `/school-session.html`.<br>2. Vul schoolnaam en groepsnaam in.<br>3. Kies toegestane vraaggroepen en bevestig. | Er verschijnt een passkey en de sessie is zichtbaar in de sessielijst. |
| Leerling meldt zich aan met passkey | 1. Ga naar `/index.html`.<br>2. Vul een geldige passkey in.<br>3. Start de quiz. | Quiz start met geselecteerde vraaggroepen; voortgang wordt opgeslagen bij de sessie. |
| Passkey ongeldig | 1. Ga naar `/index.html`.<br>2. Vul een willekeurige of verlopen passkey in. | Er verschijnt een duidelijke foutmelding en er wordt geen quiz gestart. |

### 2.2 Quiz functionaliteit

| Scenario | Stappen | Verwachte uitkomst |
|----------|---------|--------------------|
| Vragen navigeren | Doorloop de quiz en navigeer tussen vragen. | Vragen laden correct en antwoorden kunnen opgeslagen worden. |
| Resultatenverwerking | Rond de quiz af. | Resultaten worden opgeslagen en zichtbaar in het dashboard van de sessie. |

### 2.3 Dashboard en rapportage

| Scenario | Stappen | Verwachte uitkomst |
|----------|---------|--------------------|
| Dashboard overzicht | 1. Open `/dashboard.html`.<br>2. Selecteer de sessie uit stap 2.1. | Grafieken tonen juiste resultaten voor de geselecteerde sessie. |
| Vergelijking met andere sessies | 1. Kies meerdere sessies in de vergelijkingsselector.<br>2. Controleer de grafiek. | Vergelijkingsgrafiek toont correct vs. fout per sessie. |
| Toggle vraaggroepen | 1. Keer terug naar `/school-session.html`.<br>2. Pas de selectie aan en sla op.<br>3. Vernieuw dashboard. | Alleen de geselecteerde vraaggroepen worden weergegeven in sessie- en dashboardschermen. |

### 2.4 Administratie en contentbeheer

| Scenario | Stappen | Verwachte uitkomst |
|----------|---------|--------------------|
| Vraagbeheer | 1. Open `/question-editor.html`.<br>2. Voeg nieuwe vraag toe / bewerk bestaande.<br>3. Sla wijzigingen op. | Wijzigingen verschijnen in de vragenlijst en zijn bruikbaar in nieuwe sessies. |
| Categoriebeheer | 1. Open `/categories.html`.<br>2. Voeg categorie toe / bewerk bestaande.<br>3. Sla op. | Nieuwe categorieën zijn beschikbaar bij het maken van vragen. |
| Database-export | Open `/database.html` en download de export. | Bestand bevat actuele gegevens zonder fouten. |

## 3. Release checklist

1. Alle automatische controles uit sectie 1 succesvol uitgevoerd.
2. Relevante handmatige scenario's uit sectie 2 doorlopen.
3. Documentatie (README, TESTING.md, etc.) bijgewerkt indien nodig.
4. Wijzigingen doorgevoerd in versiebeheer (git) met duidelijke commitboodschappen.

Door deze checklist te volgen behouden we vertrouwen in de stabiliteit van het platform en kunnen we toekomstige automatisering eenvoudig integreren.
