# Test framework for Better Studio forms
Some people have been involved in inital discussions regarding how to create and run tests for forms made with the Better form tool. As input to further discussions (preferrably a meeting?) I asked Claude Opus 4.5 to compare and prepare some alternatives looking at Cypress and Playwright. Looking at the syntax of the tests I believe Cypress style would be easiest to understand for informaticians.
(Please excuse the pretty bad mockups linked below, they are not fair for comparison between the alternatives since a lot in them can be done for both systems - but may inspire some ideas to be refined)

* Comparison report Cypress vs Playwright for Informaticians testing Better forms: tasks\test-framework-discussion.md
  * Cypress:
    * PRD: tasks\prd-form-testing-cypress.md
    * Mockup: src\mockups\mockup-cypress-form-tester.html
  * Playwright
    * PRD: tasks\prd-form-testing-playwright.md
    * Mockup: src\mockups\mockup-playwright-form-tester.html

## Response 1
Cypress är ju också verktyget vi i Yoda använder för att testa gränssnittet i våra applikationer så vi kan mycket om det och kan hjälpa till att utbilda. 
 
Min fråga är dock: var är det lämpligt att testa formulären? Vill man göra detta med formuläret i Better Studio medans man utvecklar, vill man göra det någonstans när en ny version av formuläret skapas/releasas eller vill man göra detta i applikationen där formuläret ska användas? Eller vill man göra både och, kanske med olika testfall på de olika ställena? 
Bra praktik inom testning är jj att testa så tidigt som möjligt, så att man upptäcker felet medans man utvecklar / gör ändringar. Så att endast testa i applikationen där formuläret ska användas tycker jag inte vore jättebra. 
 
Om någon visar mig hur formuläret för t.ex. mdk / vårddokumentation har tagits fram i Better Studio så kan jag göra en POC på att testa formuläret där så kanske vi har mer på fötterna inför ett möte? 
 
## response 2
jag instämmer i att vi bör testa varje sak så tidigt som möjligt. 

1. Själva formulärlogiken bör testas när (och nära där) den byggs. Att få in testerna i själva Better studio kan vara lite tekniskt svårt, men det ska vara ganska enkelt att med ett separat testverktyg bredvid Studio jobba mot samma server (jag har förberett litet av det i formulärvisaren för Kintegrate som ska kunna köra både lokalt och mot server, men har inte testat serverdelen). Då kan man i praktiken trycka spara i Studio och sedan i ett annat fönster bredvid Studio direkt köra testerna. Det var ungefär så Better förslog att vi skulle göra - alltså att bygga ett testramverk bredvid Studio som använder Better Form renderer.  

2. Narrativa textgenererings-logiken bör med samma tänk testas när (och nära där) den byggs, i detta fall gärna i eller i anslutning till Kintegrate.

3. Under utveckling av nya "Better-Widgets" bör de givetvis testas separat.

4. Att appen med uthopp etc funkar bör väl testas mot själva appen och bör då kunna testas med ett generellt testformulär som arbetar igenom ett antal de olika sorters konstruktioner som ofta används. Alltså tester som används när man utvecklar själva app-ramverket - jag gissar att Yoda redan har en del testrutiner under sådan utveckling. 

5. Förhoppningsvis ska man kunna lita på att alla de tidigare (ovan nämnda) stegen har fångat fel i formulärlogik, textgenering, widgetar och ramverk/app. Men man kan (bör?) kanske mot slutet av en release-cykel försöka köra de testerna (kanske särskilt #1 & #2) även genom appen i sin rätta kontext på en slutanvändarlik dator också för att se att allt funkar. Förhoppningsvis ska man kunna återanvända deltesterna då. 

Jag tror det kan vara bra att rigga upp alla stegen mot Git på något vis. Det behöver inte var samma repo men ska gå lätt att länka mellan i alla fall. (Funderar på att bygga in smidig möjlighet att spara/hämta konverteringsscript, tester och exempelinstanser mot Github i Kintegrate - det bör funka eftersom informatikerna är vana att jobba så i t.ex. Archetype designer. Då blir allt spårbart och versionshanterat "by default")

Tycker du att jag+AI ska förfina en designapproach för att använda cypress till #1 och #2 ovan?

## response 3

Det låter jättebra! 
 
Gällande 4 så har vi t.ex. för mdk / vårddokumentation Cypress-tester som testar av funktionaliteten i appen som inte är relaterad till formuläret.
Gällande 5 så vill man kunna lita på att testerna i 1, 2, 3 och 4 har fångat upp de flesta krångligheterna och man borde kunna köra endast ett 'happy-case' för att kolla att det går bra att fylla i formuläret, kanske spara som utkast, plocka upp det igen och fylla i vidare. Och eftersom det då blir ett ganska enkelt case så kan man nöja sig med att göra detta manuellt (ett tag åtminstone, tills man tröttnar)
