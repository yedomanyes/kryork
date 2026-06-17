# Telegram Bot Starter

Ein einfacher Telegram Bot mit Node.js und Telegraf.

## 1. Bot bei Telegram erstellen

1. Telegram öffnen
2. `@BotFather` suchen
3. `/newbot` senden
4. Namen und Username vergeben
5. Bot Token kopieren

## 2. Setup

```bash
cd /Users/yedo/Desktop/KRYORK/telegram-bot
npm install
cp .env.example .env
```

Dann `.env` öffnen und eintragen:

```env
TELEGRAM_BOT_TOKEN=dein_botfather_token
ADMIN_TELEGRAM_ID=deine_telegram_id_optional
```

Deine Telegram ID bekommst du später im Bot mit:

```text
/id
```

## 3. Starten

```bash
npm start
```

Oder im Entwicklungsmodus:

```bash
npm run dev
```

## Wichtig

- Der Bot läuft nur, solange der Prozess läuft.
- Lokal auf deinem Mac: Wenn Mac aus ist, Bot aus.
- Für dauerhaft online braucht er später Hosting, z.B. VPS, Railway, Render oder Fly.io.
