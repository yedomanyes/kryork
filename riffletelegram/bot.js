import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
const botName = process.env.RIFFLE_BOT_NAME || 'Riffle';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'riffle-db.json');

if (!token || token === 'DEIN_RIFFLE_BOT_TOKEN_HIER') {
  console.error('Fehler: TELEGRAM_BOT_TOKEN fehlt. Kopiere .env.example zu .env und trage deinen BotFather Token ein.');
  process.exit(1);
}

const bot = new Telegraf(token);
const userStates = new Map();

function loadDb() {
  if (!fs.existsSync(dbPath)) {
    return { users: {}, deposits: [], withdrawals: [], gameHistory: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (error) {
    console.error('DB konnte nicht gelesen werden:', error);
    return { users: {}, deposits: [], withdrawals: [], gameHistory: [] };
  }
}

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getUser(ctx) {
  const db = loadDb();
  const telegramId = String(ctx.from.id);

  if (!db.users[telegramId]) {
    db.users[telegramId] = {
      telegramId,
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name || '',
      username: ctx.from.username || '',
      demoBalance: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
  }

  return { db, user: db.users[telegramId] };
}

function updateUser(user, db) {
  user.updatedAt = new Date().toISOString();
  db.users[user.telegramId] = user;
  saveDb(db);
}

function money(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function parseAmount(text, fallback = 10) {
  const parts = text.trim().split(/\s+/);
  const raw = parts[1];
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return fallback;
  return Math.min(Math.floor(amount * 100) / 100, 10000);
}

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎮 Games', 'games_menu'), Markup.button.callback('💰 Balance', 'balance')],
    [Markup.button.callback('➕ Deposit', 'deposit'), Markup.button.callback('➖ Withdraw', 'withdraw')],
    [Markup.button.callback('💬 Chat mit Riffle', 'start_chat'), Markup.button.callback('🛟 Support', 'support')]
  ]);
}

function gamesMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🃏 Blackjack', 'game_blackjack'), Markup.button.callback('🎲 Dice', 'game_dice')],
    [Markup.button.callback('🚀 Limbo', 'game_limbo'), Markup.button.callback('🐉 Dragon Tiger', 'game_dragon_tiger')],
    [Markup.button.callback('🏠 Hauptmenü', 'main_menu')]
  ]);
}

function chatMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎮 Games', 'games_menu'), Markup.button.callback('💰 Balance', 'balance')],
    [Markup.button.callback('🏠 Menü', 'main_menu'), Markup.button.callback('🛑 Chat beenden', 'end_chat')]
  ]);
}

function commandsText() {
  return [
    'Riffle Befehle:',
    '',
    '/start - Hauptmenü',
    '/balance - Demo-Balance anzeigen',
    '/deposit 50 - Deposit-Anfrage erstellen',
    '/withdraw 50 - Withdraw-Anfrage erstellen',
    '/games - Spiele anzeigen',
    '/blackjack 10 - Blackjack spielen',
    '/dice 10 - Dice spielen',
    '/limbo 10 - Limbo spielen',
    '/dragontiger 10 - Dragon Tiger spielen',
    '/chat - Chat mit Riffle',
    '/id - deine Telegram ID',
    '',
    'Aktuell ist alles Demo-Guthaben. Echte Zahlungen brauchen später Backend/Admin-Freigabe.'
  ].join('\n');
}

bot.start(async (ctx) => {
  const { user } = getUser(ctx);
  userStates.set(ctx.from.id, { mode: 'menu' });

  await ctx.reply(
    `Willkommen bei ${botName} 👋\n\nDeine Demo-Balance: ${money(user.demoBalance)}\n\nDu kannst mit /deposit, /withdraw und /games starten.`,
    mainMenu()
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(commandsText(), mainMenu());
});

bot.command('id', async (ctx) => {
  await ctx.reply(`Deine Telegram ID ist: ${ctx.from.id}`);
});

bot.command('chat', async (ctx) => {
  getUser(ctx);
  userStates.set(ctx.from.id, { mode: 'chat' });
  await ctx.reply(`Chat mit ${botName} ist gestartet. Schreib einfach deine Nachricht.`, chatMenu());
});

bot.command('balance', async (ctx) => {
  const { user } = getUser(ctx);
  await ctx.reply(`Deine Riffle Demo-Balance: ${money(user.demoBalance)}`, mainMenu());
});

bot.command('deposit', async (ctx) => {
  const amount = parseAmount(ctx.message.text, 50);
  await createDeposit(ctx, amount);
});

bot.command('withdraw', async (ctx) => {
  const amount = parseAmount(ctx.message.text, 50);
  await createWithdraw(ctx, amount);
});

bot.command('games', async (ctx) => {
  getUser(ctx);
  await ctx.reply('Wähle ein Spiel. Standard-Einsatz über Buttons ist $10. Per Befehl kannst du z.B. /dice 25 nutzen.', gamesMenu());
});

bot.command('blackjack', async (ctx) => {
  await playBlackjack(ctx, parseAmount(ctx.message.text, 10));
});

bot.command('dice', async (ctx) => {
  await playDice(ctx, parseAmount(ctx.message.text, 10));
});

bot.command('limbo', async (ctx) => {
  await playLimbo(ctx, parseAmount(ctx.message.text, 10));
});

bot.command(['dragontiger', 'dragon_tiger'], async (ctx) => {
  await playDragonTiger(ctx, parseAmount(ctx.message.text, 10));
});

bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  getUser(ctx);
  userStates.set(ctx.from.id, { mode: 'menu' });
  await ctx.reply(`${botName} Hauptmenü:`, mainMenu());
});

bot.action('balance', async (ctx) => {
  await ctx.answerCbQuery();
  const { user } = getUser(ctx);
  await ctx.reply(`Deine Riffle Demo-Balance: ${money(user.demoBalance)}`, mainMenu());
});

bot.action('deposit', async (ctx) => {
  await ctx.answerCbQuery();
  await createDeposit(ctx, 50);
});

bot.action('withdraw', async (ctx) => {
  await ctx.answerCbQuery();
  await createWithdraw(ctx, 50);
});

bot.action('games_menu', async (ctx) => {
  await ctx.answerCbQuery();
  getUser(ctx);
  await ctx.reply('Riffle Games - wähle ein Spiel:', gamesMenu());
});

bot.action('game_blackjack', async (ctx) => {
  await ctx.answerCbQuery();
  await playBlackjack(ctx, 10);
});

bot.action('game_dice', async (ctx) => {
  await ctx.answerCbQuery();
  await playDice(ctx, 10);
});

bot.action('game_limbo', async (ctx) => {
  await ctx.answerCbQuery();
  await playLimbo(ctx, 10);
});

bot.action('game_dragon_tiger', async (ctx) => {
  await ctx.answerCbQuery();
  await playDragonTiger(ctx, 10);
});

bot.action('start_chat', async (ctx) => {
  await ctx.answerCbQuery();
  getUser(ctx);
  userStates.set(ctx.from.id, { mode: 'chat' });
  await ctx.reply(`Du bist jetzt im Chat mit ${botName}. Schreib einfach los.`, chatMenu());
});

bot.action('support', async (ctx) => {
  await ctx.answerCbQuery();
  getUser(ctx);
  userStates.set(ctx.from.id, { mode: 'support' });
  await ctx.reply('Schreib jetzt deine Support-Nachricht. Ich bestätige sie und leite sie an den Admin weiter, wenn ADMIN_TELEGRAM_ID gesetzt ist.', chatMenu());
});

bot.action('end_chat', async (ctx) => {
  await ctx.answerCbQuery();
  userStates.set(ctx.from.id, { mode: 'menu' });
  await ctx.reply(`Chat mit ${botName} beendet.`, mainMenu());
});

async function createDeposit(ctx, amount) {
  const { db, user } = getUser(ctx);
  const request = {
    id: `dep_${Date.now()}_${user.telegramId}`,
    telegramId: user.telegramId,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.deposits.push(request);
  saveDb(db);

  await ctx.reply(
    `Deposit-Anfrage erstellt ✅\n\nBetrag: ${money(amount)}\nStatus: pending\n\nHinweis: Aktuell ist das nur vorbereitet. Echte Deposits brauchen später Wallet/Payment + Admin-Freigabe.`,
    mainMenu()
  );
  await notifyAdmin(ctx, `Neue Deposit-Anfrage ${money(amount)}`, `Request ID: ${request.id}`);
}

async function createWithdraw(ctx, amount) {
  const { db, user } = getUser(ctx);

  if (user.demoBalance < amount) {
    await ctx.reply(`Nicht genug Demo-Balance. Du hast ${money(user.demoBalance)}, Withdraw wäre ${money(amount)}.`, mainMenu());
    return;
  }

  const request = {
    id: `wd_${Date.now()}_${user.telegramId}`,
    telegramId: user.telegramId,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.withdrawals.push(request);
  saveDb(db);

  await ctx.reply(
    `Withdraw-Anfrage erstellt ✅\n\nBetrag: ${money(amount)}\nStatus: pending\n\nHinweis: Aktuell ist das nur vorbereitet. Echte Auszahlungen brauchen später Wallet/Payment + Admin-Freigabe.`,
    mainMenu()
  );
  await notifyAdmin(ctx, `Neue Withdraw-Anfrage ${money(amount)}`, `Request ID: ${request.id}`);
}

function canBet(ctx, bet) {
  const { db, user } = getUser(ctx);
  if (bet <= 0) return { ok: false, db, user, error: 'Einsatz muss größer als 0 sein.' };
  if (user.demoBalance < bet) {
    return { ok: false, db, user, error: `Nicht genug Demo-Balance. Du hast ${money(user.demoBalance)}.` };
  }
  return { ok: true, db, user };
}

function finishGame(db, user, game, bet, payout, details) {
  const profit = payout - bet;
  user.demoBalance = Math.max(0, Math.round((user.demoBalance + profit) * 100) / 100);
  updateUser(user, db);

  db.gameHistory.push({
    id: `game_${Date.now()}_${user.telegramId}`,
    telegramId: user.telegramId,
    game,
    bet,
    payout,
    profit,
    details,
    balanceAfter: user.demoBalance,
    createdAt: new Date().toISOString()
  });
  saveDb(db);

  return profit;
}

async function playBlackjack(ctx, bet) {
  const check = canBet(ctx, bet);
  if (!check.ok) return ctx.reply(check.error, gamesMenu());

  const { db, user } = check;
  const player = drawBlackjackHand();
  const dealer = drawBlackjackHand();
  let payout = 0;
  let result = '';

  if (player.total > 21) {
    result = 'Bust - verloren';
  } else if (dealer.total > 21 || player.total > dealer.total) {
    payout = bet * (player.blackjack ? 2.5 : 2);
    result = player.blackjack ? 'Blackjack - gewonnen' : 'Gewonnen';
  } else if (player.total === dealer.total) {
    payout = bet;
    result = 'Push - Einsatz zurück';
  } else {
    result = 'Verloren';
  }

  const profit = finishGame(db, user, 'Blackjack', bet, payout, { player, dealer, result });
  await ctx.reply(
    `🃏 Blackjack\n\nEinsatz: ${money(bet)}\nDu: ${player.cards.join(', ')} = ${player.total}\nDealer: ${dealer.cards.join(', ')} = ${dealer.total}\n\nResult: ${result}\nProfit: ${money(profit)}\nBalance: ${money(user.demoBalance)}`,
    gamesMenu()
  );
}

async function playDice(ctx, bet) {
  const check = canBet(ctx, bet);
  if (!check.ok) return ctx.reply(check.error, gamesMenu());

  const { db, user } = check;
  const roll = Math.floor(Math.random() * 100) + 1;
  const win = roll > 50;
  const payout = win ? bet * 1.95 : 0;
  const profit = finishGame(db, user, 'Dice', bet, payout, { roll, target: 'Over 50', win });

  await ctx.reply(
    `🎲 Dice\n\nEinsatz: ${money(bet)}\nTarget: Over 50\nRoll: ${roll}\n\nResult: ${win ? 'Gewonnen' : 'Verloren'}\nProfit: ${money(profit)}\nBalance: ${money(user.demoBalance)}`,
    gamesMenu()
  );
}

async function playLimbo(ctx, bet) {
  const check = canBet(ctx, bet);
  if (!check.ok) return ctx.reply(check.error, gamesMenu());

  const { db, user } = check;
  const target = 2.0;
  const crash = Math.max(1, Math.round((1 / Math.random()) * 0.97 * 100) / 100);
  const win = crash >= target;
  const payout = win ? bet * target : 0;
  const profit = finishGame(db, user, 'Limbo', bet, payout, { crash, target, win });

  await ctx.reply(
    `🚀 Limbo\n\nEinsatz: ${money(bet)}\nTarget: ${target.toFixed(2)}x\nCrash: ${crash.toFixed(2)}x\n\nResult: ${win ? 'Gewonnen' : 'Verloren'}\nProfit: ${money(profit)}\nBalance: ${money(user.demoBalance)}`,
    gamesMenu()
  );
}

async function playDragonTiger(ctx, bet) {
  const check = canBet(ctx, bet);
  if (!check.ok) return ctx.reply(check.error, gamesMenu());

  const { db, user } = check;
  const dragon = Math.floor(Math.random() * 13) + 1;
  const tiger = Math.floor(Math.random() * 13) + 1;
  const pick = Math.random() < 0.5 ? 'Dragon' : 'Tiger';
  const winner = dragon === tiger ? 'Tie' : dragon > tiger ? 'Dragon' : 'Tiger';
  const win = pick === winner;
  const payout = win ? bet * 1.95 : 0;
  const profit = finishGame(db, user, 'Dragon Tiger', bet, payout, { dragon, tiger, pick, winner, win });

  await ctx.reply(
    `🐉 Dragon Tiger\n\nEinsatz: ${money(bet)}\nDeine Seite: ${pick}\nDragon: ${cardLabel(dragon)}\nTiger: ${cardLabel(tiger)}\nWinner: ${winner}\n\nResult: ${win ? 'Gewonnen' : 'Verloren'}\nProfit: ${money(profit)}\nBalance: ${money(user.demoBalance)}`,
    gamesMenu()
  );
}

function drawBlackjackHand() {
  const cards = [drawBlackjackCard(), drawBlackjackCard()];
  let total = blackjackTotal(cards);

  while (total < 17) {
    cards.push(drawBlackjackCard());
    total = blackjackTotal(cards);
  }

  return {
    cards: cards.map(cardLabel),
    total,
    blackjack: cards.length === 2 && total === 21
  };
}

function drawBlackjackCard() {
  return Math.floor(Math.random() * 13) + 1;
}

function blackjackTotal(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card === 1) {
      aces += 1;
      total += 11;
    } else {
      total += Math.min(card, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function cardLabel(card) {
  const labels = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  return labels[card] || String(card);
}

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  getUser(ctx);
  const state = userStates.get(ctx.from.id) || { mode: 'chat' };

  if (state.mode === 'support') {
    await ctx.reply('Danke, deine Support-Nachricht wurde empfangen ✅', chatMenu());
    await notifyAdmin(ctx, `Neue Support-Nachricht an ${botName}`, text);
    return;
  }

  userStates.set(ctx.from.id, { mode: 'chat' });

  const lower = text.toLowerCase();
  let reply = '';

  if (lower.includes('deposit')) {
    reply = 'Nutze /deposit 50, um eine Deposit-Anfrage zu erstellen.';
  } else if (lower.includes('withdraw')) {
    reply = 'Nutze /withdraw 50, um eine Withdraw-Anfrage zu erstellen.';
  } else if (lower.includes('games') || lower.includes('spielen')) {
    await ctx.reply('Hier sind die Riffle Games:', gamesMenu());
    return;
  } else if (lower.includes('hallo') || lower.includes('hi') || lower.includes('hey')) {
    reply = `Hey, ich bin ${botName}. Schreib /games für Spiele oder /balance für deine Balance.`;
  } else {
    reply = `Ich habe deine Nachricht bekommen: "${text}"\n\nSchnellstart: /deposit, /withdraw, /games, /balance`;
  }

  await ctx.reply(reply, chatMenu());
  await notifyAdmin(ctx, `Neue Chat-Nachricht an ${botName}`, text, false);
});

async function notifyAdmin(ctx, title, text, force = true) {
  if (!adminTelegramId) return;
  if (!force && process.env.FORWARD_ALL_MESSAGES !== 'true') return;

  const user = ctx.from;
  const username = user.username ? `@${user.username}` : 'kein Username';

  await ctx.telegram.sendMessage(
    adminTelegramId,
    `${title}:\n\nVon: ${user.first_name || ''} ${user.last_name || ''}\nUsername: ${username}\nTelegram ID: ${user.id}\n\nNachricht:\n${text}`
  );
}

bot.catch((err, ctx) => {
  console.error(`Bot-Fehler bei Update ${ctx.update?.update_id}:`, err);
});

bot.launch();
console.log(`${botName} Telegram Bot läuft per Polling...`);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
