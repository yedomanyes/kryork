# Riffle Telegram Bot

Eigener Telegram-Bot namens Riffle.

Features:

- `/start` Hauptmenü
- `/balance` Demo-Balance anzeigen
- `/deposit 50` Deposit-Anfrage erstellen
- `/withdraw 50` Withdraw-Anfrage erstellen
- `/games` Game-Menü anzeigen
- `/blackjack 10` Blackjack spielen
- `/dice 10` Dice spielen
- `/limbo 10` Limbo spielen
- `/dragontiger 10` Dragon Tiger spielen
- `/chat` normaler Chat mit Riffle
- `/id` eigene Telegram-ID anzeigen

Wichtig: Aktuell läuft alles mit Demo-Guthaben in einer lokalen JSON-Datei. Echte Deposits/Withdrawals brauchen später Wallet/Payment-Anbindung, Admin-Panel und sichere Datenbank.

## Setup

```bash
cd /Users/yedo/Desktop/KRYORK/riffletelegram
npm install
cp .env.example .env
```

Dann `.env` öffnen und deinen BotFather Token eintragen:

```env
TELEGRAM_BOT_TOKEN=dein_botfather_token
ADMIN_TELEGRAM_ID=
RIFFLE_BOT_NAME=Riffle
```

`ADMIN_TELEGRAM_ID` ist optional.
Deine Telegram-ID bekommst du später im Bot mit:

```text
/id
```

Wenn `ADMIN_TELEGRAM_ID` gesetzt ist, bekommst du Deposit-/Withdraw-/Support-Anfragen direkt als Telegram-Nachricht.

## Starten

```bash
npm start
```

Oder mit Auto-Neustart bei Änderungen:

```bash
npm run dev
```

## Daten

Der Bot speichert lokale Testdaten hier:

```text
/Users/yedo/Desktop/KRYORK/riffletelegram/riffle-db.json
```

Die Datei wird automatisch erstellt, sobald ein User den Bot nutzt.

## Wichtig

Der Bot läuft lokal nur solange dein Mac/Terminal läuft.
Für 24/7 braucht man später Hosting, z.B. VPS, Railway, Render oder Fly.io.
