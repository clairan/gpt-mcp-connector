# Kom igång och testa lokalt

## Förutsättningar

- Node.js ≥ 20 (`node -v`)
- npm

---

## 1. Installera beroenden

```bash
npm install
```

---

## 2. Skapa en lokal miljöfil

Projektet läser inställningar från `.env`. En färdig mall finns i `.env.example`.
För lokal testning räcker det med att aktivera mockdata och stänga av auth:

```bash
cp .env.example .env
```

`.env` ska innehålla (redan satt om du kopierade mallen):

```
USE_MOCK_BACKEND=true
AUTH_DISABLED=true
```

Filen ignoreras av git och ska aldrig checkas in.

---

## 3. Starta servern

```bash
npm run dev
```

Det som händer:
1. Widgets byggs (`dist/widgets/*.js`)
2. Servern startar med `tsx watch` – den startar om automatiskt vid kodändringar

Förväntat utskrift:
```
Löpning & Livet Apps SDK server on :8788
  MCP endpoint     http://localhost:8788/mcp
  Auth             DISABLED (dev)
  Backend          MOCK data
```

---

## 4. Kontrollera att servern svarar

```bash
curl http://localhost:8788/healthz
```

Förväntat svar: `{"ok":true,"mock":true}`

---

## 5. Kör kontraktstesterna

Testerna startar servern i en subprocess, anropar varje verktyg via MCP-klienten
och verifierar att svaren är korrekta.

```bash
npm test
```

Alla tester ska gå igenom (✓ gröna). Testerna kontrollerar bl.a.:

- `tools/list` listar alla verktyg
- Varje verktygs `openai/outputTemplate` pekar på en registrerad widget-resurs
- `show_training_week` och `show_training_log` returnerar data
- `propose_add_workout → apply_proposal`-flödet fungerar
- Utan token (auth på) svarar servern `401` + `WWW-Authenticate`

---

## 6. Förhandsgranska widgetarna i webbläsaren

```bash
npm run preview
```

Öppna `http://localhost:4180` i webbläsaren. Här kan du:

- Byta mellan widgetarna (week, training-log, proposal) i toppmenyn
- Växla mellan light och dark mode
- Testa bekräfta-knappen i förslagsvyn – `callTool`/`sendFollowupMessage` loggas i sidan

Ingen tunnel eller ChatGPT-konto behövs.

---

## 7. Testa med MCP Inspector (valfritt)

MCP Inspector är ett grafiskt verktyg för att anropa MCP-endpointen manuellt.

```bash
npm run inspector
```

Anslut med:
- **URL:** `http://localhost:8788/mcp`
- **Transport:** Streamable HTTP

Prova sedan:
1. `tools/list` – ska lista `show_training_week`, `show_training_log`, `propose_add_workout`, `apply_proposal`
2. Anropa `show_training_week` – ska returnera data + en `_meta.openai/outputTemplate`-länk
3. Läs resursen `ui://widget/week.html` via `resources/read` – ska returnera HTML

---

## 8. Testa i ChatGPT (kräver Developer Mode)

För att testa mot riktigt ChatGPT behöver du:

1. Ett ChatGPT-konto med **Developer Mode** aktiverat för connectors
2. En publik URL – exponera den lokala servern med en tunnel:

```bash
ngrok http 8788
# eller
cloudflared tunnel --url http://localhost:8788
```

3. Gå till ChatGPTs inställningar → Connectors → lägg till en anpassad connector
4. Ange `https://<tunnel-url>/mcp` som endpoint

Testa med prompter som:
- *"Vad ska jag springa den här veckan?"*
- *"Visa mitt träningslogg från förra veckan"*
- *"Lägg till ett löppass på tisdag"*

> **OBS:** Auth är inaktiverad i `.env` – ChatGPT skickar inget token men servern
> accepterar ändå anropet. Bra för att testa UI och verktygsanrop. Sätt
> `AUTH_DISABLED=false` när du testar det riktiga OAuth-flödet.

---

## Vanliga problem

| Problem | Orsak | Lösning |
|---|---|---|
| `Missing required env var: OAUTH_ISSUER` | `.env` saknas eller `AUTH_DISABLED` inte satt | Se steg 2 |
| Port 8788 upptagen | Annan process lyssnar | `lsof -i :8788` och avsluta processen |
| Widgets saknas i `dist/` | Build misslyckades | Kör `npm run build:widgets` separat för att se felet |
| Testerna misslyckas med connection error | Servern körs redan på 8788 | Stäng `npm run dev` innan du kör `npm test` |
