# Löpning & Livet – ChatGPT-app (Apps SDK)

En **OpenAI Apps SDK**-app som gör Löpning & Livets träningsdata tillgänglig direkt i
ChatGPT – för alla inloggade användare, oavsett abonnemang, när den väl är
godkänd och utrullad.

> "ChatGPT-plugins" i den gamla formen (2023) är nedlagda. Apps SDK är
> efterföljaren och bygger på **MCP** (Model Context Protocol), så den
> befintliga Löpning & Livet-MCP-servern är rätt grund att bygga vidare på.

---

## Vad som ingår i skelettet

| Del | Fil | Syfte |
|---|---|---|
| HTTP + MCP-endpoint | `src/server.ts` | Streamable HTTP, statslös, en `McpServer` per request |
| OAuth 2.1 | `src/auth.ts` | Verifierar access tokens, serverar `/.well-known/oauth-protected-resource` |
| Backend-klient | `src/lopningLivetClient.ts` | Anropar Löpning & Livets riktiga REST-API (har `USE_MOCK_BACKEND` för demo) |
| Verktyg | `src/tools/*.ts` | `show_training_week`, `show_training_log`, `propose_add_workout`, `apply_proposal` |
| Widgets (UI) | `web/src/*/` | React-komponenter som renderas i ChatGPTs iframe via `window.openai` |
| Widget-bundling | `scripts/build-widgets.mjs` | esbuild → `dist/widgets/<namn>.js`, inlinas i widget-resursen |

Verktyg och widgets hänger ihop via `_meta["openai/outputTemplate"]` som pekar på
en MCP-resurs med mime-typen `text/html+skybridge`.

---

## Kom igång lokalt

```bash
npm install
cp .env.example .env          # kör vidare med default (mock + auth av)
npm run dev                   # bygger widgets och startar servern med watch
```

Servern lyssnar på `http://localhost:8788/mcp`.

### Testa med MCP Inspector

```bash
npm run inspector
```

Anslut till `http://localhost:8788/mcp` (Transport: *Streamable HTTP*). Kör
`tools/list`, anropa `show_training_week` och kontrollera att `resources/read`
på `ui://widget/week.html` returnerar HTML.

### Automatiska kontraktstester

```bash
npm test
```

`test/mcp.contract.test.mjs` startar servern (mock + auth av) i en subprocess
och kör igenom `initialize`, `tools/list`, varje verktygsanrop och
`resources/read` via den riktiga MCP-klienten. Verifierar bl.a. att varje
verktygs `openai/outputTemplate` pekar på en registrerad widget-resurs, att
`propose_ → apply_`-flödet funkar, och att servern svarar `401` +
`WWW-Authenticate` när auth är på och token saknas. CI-vänligt (ingen tunnel,
inget ChatGPT-konto).

### Förhandsgranska widgetarna i webbläsaren

```bash
npm run preview      # http://localhost:4180
```

Renderar varje byggd widget-bundle i en iframe med en **mockad `window.openai`**
(exempeldata, `callTool`/`setWidgetState`/`sendFollowupMessage` loggas på
sidan). Växla widget och light/dark i toppmenyn. Bra för att se UI:t och testa
bekräfta-knappen i förslagsvyn utan ChatGPT.

### Testa i ChatGPT (utvecklarläge)

Kräver ett konto med **Developer Mode** för connectors. Exponera din lokala
server med en tunnel (`ngrok http 8788` el. `cloudflared`), lägg till
`https://<tunnel>/mcp` som egen connector och prova prompter som
*"Vad ska jag springa den här veckan?"*.

---

## OAuth 2.1 – vad du behöver

Apps SDK kräver att varje användare loggar in. Du bygger **inte** en
authorization server här – du pekar på Löpning & Livets befintliga inloggning.

1. Registrera en OAuth-klient i Löpning & Livets IdP som stödjer
   **authorization code + PKCE** och gärna **dynamisk klientregistrering**
   (RFC 7591) – ChatGPT registrerar sig själv som klient.
2. IdP:n måste publicera `/.well-known/oauth-authorization-server`
   (RFC 8414) med `authorization_endpoint`, `token_endpoint`,
   `jwks_uri`, `code_challenge_methods_supported: ["S256"]`.
3. Access tokens ska vara JWT:er med `iss`, `sub` (stabilt medlems-id),
   `aud` = denna servers publika URL, och `scope`
   (`training:read`, `training:write`).
4. Sätt `OAUTH_ISSUER`, `OAUTH_AUDIENCE` och `OAUTH_JWKS_URL` i miljön.
   `src/auth.ts` verifierar signatur, issuer och audience på varje request.

Flödet: ChatGPT anropar utan token → 401 + `WWW-Authenticate` som pekar på vår
resource metadata → ChatGPT kör OAuth mot IdP:n → återkommer med
`Authorization: Bearer …` → vi verifierar och skickar token vidare till
backend-API:t i varje verktyg.

---

## Koppla på den riktiga backend

`src/lopningLivetClient.ts` har en metod per verktyg med `fetch` mot
`LOPNING_LIVET_API_BASE_URL`. Byt ut sökvägarna mot de riktiga endpointsen –
formen på svaren speglar redan det som den befintliga Löpning & Livet-MCP:n
returnerar (`get_schedule`, `get_training_log`, `propose_add_workouts` …).
Sätt sedan `USE_MOCK_BACKEND=false`.

Behåll `propose_ → apply_`-mönstret: skrivande verktyg skapar ett förslag,
användaren bekräftar i widgeten (`apply_proposal`). Det matchar hur appen redan
fungerar och ger en tydlig bekräftelsepunkt i ChatGPT.

---

## Bygg och driftsätt

```bash
npm run build        # dist/widgets/*.js + dist/*.js
npm start            # node dist/server.js
```

Kör bakom HTTPS på en publik domän (t.ex. `mcp.lopningochlivet.se`). Sätt
`PUBLIC_BASE_URL` till exakt den URL:en – den används i OAuth-metadatan.
Statslös design gör att den skalar horisontellt utan delad session-store.

Checklista för produktion:

- [ ] `USE_MOCK_BACKEND=false`, riktiga backend-endpoints inkopplade
- [ ] `AUTH_DISABLED=false`, JWT-verifiering mot skarp IdP
- [ ] HTTPS, korrekt `PUBLIC_BASE_URL`
- [ ] Rate limiting / loggning / observability framför `/mcp`
- [ ] Widget-CSP satt om någon widget behöver hämta bilder eller data externt

---

## Skicka in till OpenAI

1. Läs igenom OpenAIs riktlinjer för appar i ChatGPT (design, säkerhet,
   dataanvändning) och fyll i appmetadata (namn, ikon, beskrivning,
   exempelprompter, privacy policy-URL).
2. Registrera appen i OpenAIs utvecklarportal, ange MCP-URL:en och OAuth-detaljer.
3. Skicka in för granskning. Efter godkännande kan appen visas för inloggade
   ChatGPT-användare (Free/Go/Plus/Pro).

### ⚠️ EU-förbehåll

Appar i ChatGPT rullades först ut **utanför EU**. En svensk publik nås alltså
inte fullt ut via Apps SDK ännu, och utloggade användare omfattas inte alls.
Bekräfta aktuell tillgänglighet för EU/Sverige innan lansering. Under tiden är
egen connector via Developer Mode enda vägen – men bara för betalande användare
som gör setup själva.

---

## Verktyg

| Verktyg | Typ | Beskrivning |
|---|---|---|
| `show_training_week` | läs | Aktuell/nästa programvecka som veckoschema |
| `show_training_log` | läs | Genomförda pass senaste N dagarna |
| `propose_add_workout` | skriv | Skapar förslag om att lägga till eget pass (ej verkställt) |
| `apply_proposal` | skriv | Verkställer ett förslag (anropas från bekräfta-knappen) |
