import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import express from 'express';
import { saveUser, saveTicket, getTicket, getStats, getBalance, updateBalance } from './db.js';
import { 
  createDeck, 
  calculateHand, 
  formatHand, 
  playDice, 
  playLimbo, 
  playDragonTiger, 
  activeBlackjack 
} from './games.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

if (!token || token === 'DEIN_BOTFATHER_TOKEN_HIER') {
  console.error('Fehler: TELEGRAM_BOT_TOKEN fehlt. Erstelle eine .env Datei und trage deinen BotFather Token ein.');
  process.exit(1);
}

const bot = new Telegraf(token);

// Start a simple HTTP server (required by Glitch so it responds to pings and stays awake)
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is active and running!');
});

app.listen(port, () => {
  console.log(`Health-Check Server läuft auf Port ${port}`);
});

// Middleware to automatically save/update user in the SQLite database
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      saveUser(ctx.from);
    } catch (err) {
      console.error('Fehler beim Speichern des Users in DB:', err);
    }
  }
  return next();
});

// Main Menu Markup
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('🎮 Casino Spiele', 'games_menu')],
  [Markup.button.callback('💳 Einzahlen', 'deposit_menu'), Markup.button.callback('💰 Guthaben', 'balance_menu')],
  [Markup.button.callback('💬 Support', 'support')],
  [Markup.button.callback('ℹ️ Info', 'info'), Markup.button.callback('📢 Updates', 'updates')]
]);

bot.start(async (ctx) => {
  const firstName = ctx.from?.first_name || 'Bro';
  await ctx.reply(
    `Willkommen ${firstName}! 👋\n\nIch bin dein Telegram Bot mit Casino & Support-System.\nWähle eine Option oder nutze /deposit, um dein Guthaben aufzuladen:`,
    mainMenu
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    'Befehle:\n/start - Bot starten\n/help - Hilfe anzeigen\n/id - deine Telegram ID anzeigen\n/balance - Guthaben anzeigen\n/deposit - Guthaben einzahlen\n/stats - Admin Statistiken\n\nDu kannst mir auch einfach eine Nachricht schreiben.'
  );
});

bot.command('id', async (ctx) => {
  await ctx.reply(`Deine Telegram ID ist: ${ctx.from.id}`);
});

bot.command('balance', async (ctx) => {
  const balance = getBalance(ctx.from.id);
  await ctx.reply(`💰 Dein Guthaben beträgt: *${balance.toFixed(2)} Credits*`, { parse_mode: 'Markdown' });
});

bot.command('deposit', async (ctx) => {
  await sendDepositMenu(ctx);
});

// Admin stats command
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  if (!adminTelegramId || userId.toString() !== adminTelegramId.toString()) {
    return ctx.reply('Diesen Befehl dürfen nur Administratoren ausführen.');
  }

  const stats = getStats();
  await ctx.reply(
    `📊 *Bot Statistiken:*\n\n👥 Registrierte User: *${stats.userCount}*\n📩 Support-Tickets gesamt: *${stats.ticketCount}*`,
    { parse_mode: 'Markdown' }
  );
});

/* --- CALLBACK ACTIONS --- */

bot.action('balance_menu', async (ctx) => {
  await ctx.answerCbQuery();
  const balance = getBalance(ctx.from.id);
  await ctx.reply(
    `💰 Dein Guthaben beträgt: *${balance.toFixed(2)} Credits*`,
    Markup.inlineKeyboard([[Markup.button.callback('🔙 Hauptmenü', 'main_menu')]])
  );
});

bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Wähle eine Option:', mainMenu);
});

// Deposit system menu
async function sendDepositMenu(ctx) {
  const text = `💳 *Guthaben aufladen (Deposit)*\n\nWähle eine Zahlungsmethode oder füge Demogeld hinzu, um die Spiele zu testen:`;
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💵 +100 Credits (Test)', 'dep_100'), Markup.button.callback('💵 +500 Credits (Test)', 'dep_500')],
    [Markup.button.callback('💵 +2500 Credits (Test)', 'dep_2500')],
    [Markup.button.callback('₿ Bitcoin / Crypto (Demo-Adresse)', 'dep_crypto')],
    [Markup.button.callback('🔙 Hauptmenü', 'main_menu')]
  ]);
  
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
}

bot.action('deposit_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await sendDepositMenu(ctx);
});

// Handle mock deposits
const handleMockDeposit = (amount) => async (ctx) => {
  await ctx.answerCbQuery();
  const newBalance = updateBalance(ctx.from.id, amount);
  await ctx.reply(`✅ *Einzahlung erfolgreich!*\n\nDir wurden *${amount} Credits* gutgeschrieben.\n💰 Neues Guthaben: *${newBalance.toFixed(2)} Credits*`, { parse_mode: 'Markdown' });
};

bot.action('dep_100', handleMockDeposit(100));
bot.action('dep_500', handleMockDeposit(500));
bot.action('dep_2500', handleMockDeposit(2500));

bot.action('dep_crypto', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `₿ *Crypto Einzahlung (Simulation)*\n\nSende deine Coins an folgende Adresse:\n\`LtcMockAddress123XYZ4567890\`\n\nKlicke nach der Transaktion auf "Zahlung überprüfen".`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Zahlung überprüfen', 'dep_verify_crypto')],
      [Markup.button.callback('🔙 Zurück', 'deposit_menu')]
    ])
  );
});

bot.action('dep_verify_crypto', async (ctx) => {
  await ctx.answerCbQuery('Überprüfe Transaktion...');
  // Simulate finding a transaction and adding 1000 credits
  const amount = 1000;
  const newBalance = updateBalance(ctx.from.id, amount);
  await ctx.reply(`✅ *Zahlung empfangen!*\n\nEs wurden *1000 Credits* via Crypto verbucht.\n💰 Neues Guthaben: *${newBalance.toFixed(2)} Credits*`, { parse_mode: 'Markdown' });
});

// Games selection menu
bot.action('games_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '🎮 *Wähle ein Casino Spiel:*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🃏 Blackjack', 'play_bj'), Markup.button.callback('🎲 Dice (Würfel)', 'play_dice')],
        [Markup.button.callback('🚀 Limbo', 'play_limbo'), Markup.button.callback('🐯 Dragon Tiger', 'play_dt')],
        [Markup.button.callback('🔙 Hauptmenü', 'main_menu')]
      ])
    }
  );
});

// General bet selection helper
async function askForBet(ctx, gameKey) {
  await ctx.reply(
    `Wähle deinen Einsatz für das Spiel:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('💰 10 Credits', `bet_${gameKey}_10`), Markup.button.callback('💰 50 Credits', `bet_${gameKey}_50`)],
      [Markup.button.callback('💰 100 Credits', `bet_${gameKey}_100`), Markup.button.callback('💰 250 Credits', `bet_${gameKey}_250`)],
      [Markup.button.callback('🔙 Spielemenü', 'games_menu')]
    ])
  );
}

bot.action('play_bj', async (ctx) => { await ctx.answerCbQuery(); await askForBet(ctx, 'bj'); });
bot.action('play_dice', async (ctx) => { await ctx.answerCbQuery(); await askForBet(ctx, 'dice'); });
bot.action('play_limbo', async (ctx) => { await ctx.answerCbQuery(); await askForBet(ctx, 'limbo'); });
bot.action('play_dt', async (ctx) => { await ctx.answerCbQuery(); await askForBet(ctx, 'dt'); });

// Create bet callback listeners
const gameKeys = ['bj', 'dice', 'limbo', 'dt'];
const bets = [10, 50, 100, 250];

gameKeys.forEach(gameKey => {
  bets.forEach(bet => {
    bot.action(`bet_${gameKey}_${bet}`, async (ctx) => {
      await ctx.answerCbQuery();
      const userId = ctx.from.id;
      const balance = getBalance(userId);
      
      if (balance < bet) {
        return ctx.reply(`❌ *Zu wenig Guthaben!* (Du hast: ${balance.toFixed(2)} Credits)\nBitte lade dein Guthaben über /deposit auf.`, { parse_mode: 'Markdown' });
      }

      if (gameKey === 'dice') {
        await ctx.reply(
          `🎲 *Dice* - Einsatz: *${bet} Credits*\n\nWürfelst du über oder unter 50? (50/50 Chance auf 2x Gewinn)`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('⬇️ Unter 50 (Under)', `run_dice_${bet}_under`), Markup.button.callback('⬆️ 50 oder höher (Over)', `run_dice_${bet}_over`)],
              [Markup.button.callback('🔙 Abbrechen', 'games_menu')]
            ])
          }
        );
      } else if (gameKey === 'limbo') {
        await ctx.reply(
          `🚀 *Limbo* - Einsatz: *${bet} Credits*\n\nWähle deinen Ziel-Multiplikator:`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('1.5x Multiplikator', `run_limbo_${bet}_1.5`), Markup.button.callback('2.0x Multiplikator', `run_limbo_${bet}_2.0`)],
              [Markup.button.callback('5.0x Multiplikator', `run_limbo_${bet}_5.0`), Markup.button.callback('10.0x Multiplikator', `run_limbo_${bet}_10.0`)],
              [Markup.button.callback('🔙 Abbrechen', 'games_menu')]
            ])
          }
        );
      } else if (gameKey === 'dt') {
        await ctx.reply(
          `🐯 *Dragon Tiger* - Einsatz: *${bet} Credits*\n\nWorauf wettest du?`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔴 Dragon (2x)', `run_dt_${bet}_dragon`), Markup.button.callback('🔵 Tiger (2x)', `run_dt_${bet}_tiger`)],
              [Markup.button.callback('🟢 Tie (Unentschieden - 8x)', `run_dt_${bet}_tie`)],
              [Markup.button.callback('🔙 Abbrechen', 'games_menu')]
            ])
          }
        );
      } else if (gameKey === 'bj') {
        // Blackjack implementation
        if (activeBlackjack.has(userId)) {
          return ctx.reply('Du hast bereits ein aktives Blackjack-Spiel!');
        }

        // Subtract bet first
        updateBalance(userId, -bet);

        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const playerVal = calculateHand(playerHand);
        const dealerVal = calculateHand(dealerHand);

        if (playerVal === 21) {
          // Blackjack!
          if (dealerVal === 21) {
            updateBalance(userId, bet); // Push, refund bet
            await ctx.reply(
              `🃏 *Blackjack!* (Push)\n\nDeine Hand: ${formatHand(playerHand)} (${playerVal})\nDealer Hand: ${formatHand(dealerHand)} (${dealerVal})\n\nDu hast deinen Einsatz zurückerhalten. 👥`
            );
          } else {
            const winnings = Math.floor(bet * 2.5);
            updateBalance(userId, winnings);
            await ctx.reply(
              `🃏 *BLACKJACK!* 🥳 (Gewonnen!)\n\nDeine Hand: ${formatHand(playerHand)} (${playerVal})\nDealer Hand: ${formatHand(dealerHand)} (${dealerVal})\n\nDu gewinnst: *${winnings} Credits*! 🎉`,
              { parse_mode: 'Markdown' }
            );
          }
          return;
        }

        activeBlackjack.set(userId, { deck, playerHand, dealerHand, bet });

        await ctx.reply(
          `🃏 *Blackjack* - Einsatz: *${bet} Credits*\n\nDeine Hand: *${formatHand(playerHand)}* (Wert: *${playerVal}*)\nDealer Hand: *${dealerHand[0].rank}${dealerHand[0].suit}*  [?]\n\nWas möchtest du tun?`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🃏 Karte ziehen (Hit)', 'bj_hit'), Markup.button.callback('🛑 Halten (Stand)', 'bj_stand')]
            ])
          }
        );
      }
    });
  });
});

// Dice engine trigger
bot.action(/^run_dice_(\d+)_(under|over)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const bet = parseInt(ctx.match[1]);
  const choice = ctx.match[2];
  const userId = ctx.from.id;

  const balanceBefore = getBalance(userId);
  if (balanceBefore < bet) {
    return ctx.reply('Ungenügendes Guthaben!');
  }

  const res = playDice(userId, bet, choice);
  const newBal = getBalance(userId);

  if (res.win) {
    await ctx.reply(
      `🎲 *Dice-Ergebnis:*\n\nGewürfelt: *${res.roll}*\nTipp: *${choice.toUpperCase()} 50*\n\n🎉 *Gewonnen!* +${res.payout} Credits.\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      `🎲 *Dice-Ergebnis:*\n\nGewürfelt: *${res.roll}*\nTipp: *${choice.toUpperCase()} 50*\n\n❌ *Verloren!* -${bet} Credits.\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Limbo engine trigger
bot.action(/^run_limbo_(\d+)_([\d.]+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const bet = parseInt(ctx.match[1]);
  const target = parseFloat(ctx.match[2]);
  const userId = ctx.from.id;

  const balanceBefore = getBalance(userId);
  if (balanceBefore < bet) {
    return ctx.reply('Ungenügendes Guthaben!');
  }

  const res = playLimbo(userId, bet, target);
  const newBal = getBalance(userId);

  if (res.win) {
    await ctx.reply(
      `🚀 *Limbo-Ergebnis:*\n\nMultiplikator erreicht: *${res.roll}x*\nZiel: *${target.toFixed(1)}x*\n\n🎉 *Gewonnen!* +${res.payout} Credits.\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      `🚀 *Limbo-Ergebnis:*\n\nMultiplikator erreicht: *${res.roll}x*\nZiel: *${target.toFixed(1)}x*\n\n❌ *Verloren!* -${bet} Credits.\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Dragon Tiger engine trigger
bot.action(/^run_dt_(\d+)_(dragon|tiger|tie)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const bet = parseInt(ctx.match[1]);
  const choice = ctx.match[2];
  const userId = ctx.from.id;

  const balanceBefore = getBalance(userId);
  if (balanceBefore < bet) {
    return ctx.reply('Ungenügendes Guthaben!');
  }

  const res = playDragonTiger(userId, bet, choice);
  const newBal = getBalance(userId);

  let resultHeader = '';
  if (res.result === 'dragon') resultHeader = '🔴 Dragon gewinnt!';
  else if (res.result === 'tiger') resultHeader = '🔵 Tiger gewinnt!';
  else resultHeader = '🟢 Unentschieden (Tie)!';

  if (res.win) {
    await ctx.reply(
      `🐯 *Dragon Tiger Ergebnis:*\n\n${resultHeader}\n\n🐉 Dragon: ${res.dragonCard.rank}${res.dragonCard.suit}\n🐯 Tiger: ${res.tigerCard.rank}${res.tigerCard.suit}\n\n🎉 *Gewonnen!* Wette auf: *${choice.toUpperCase()}*\nGewinn: *+${res.payout} Credits*\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply(
      `🐯 *Dragon Tiger Ergebnis:*\n\n${resultHeader}\n\n🐉 Dragon: ${res.dragonCard.rank}${res.dragonCard.suit}\n🐯 Tiger: ${res.tigerCard.rank}${res.tigerCard.suit}\n\n❌ *Verloren!* Wette auf: *${choice.toUpperCase()}*\nVerlust: *-${bet} Credits*\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Blackjack: Hit action
bot.action('bj_hit', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const game = activeBlackjack.get(userId);

  if (!game) {
    return ctx.reply('Kein aktives Blackjack-Spiel gefunden.');
  }

  game.playerHand.push(game.deck.pop());
  const playerVal = calculateHand(game.playerHand);

  if (playerVal > 21) {
    // Player bust
    activeBlackjack.delete(userId);
    const newBal = getBalance(userId);
    await ctx.reply(
      `💥 *Überkauft! (Bust)* (Wert: *${playerVal}*)\n\nHand: ${formatHand(game.playerHand)}\n\nDu hast deinen Einsatz von *${game.bet} Credits* verloren. ❌\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`,
      { parse_mode: 'Markdown' }
    );
  } else {
    // Show updated hand and buttons
    await ctx.reply(
      `🃏 *Blackjack* - Hand: *${formatHand(game.playerHand)}* (Wert: *${playerVal}*)\nDealer Hand: *${game.dealerHand[0].rank}${game.dealerHand[0].suit}*  [?]\n\nWas möchtest du tun?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🃏 Karte ziehen (Hit)', 'bj_hit'), Markup.button.callback('🛑 Halten (Stand)', 'bj_stand')]
        ])
      }
    );
  }
});

// Blackjack: Stand action
bot.action('bj_stand', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const game = activeBlackjack.get(userId);

  if (!game) {
    return ctx.reply('Kein aktives Blackjack-Spiel gefunden.');
  }

  activeBlackjack.delete(userId);

  let dealerVal = calculateHand(game.dealerHand);
  while (dealerVal < 17) {
    game.dealerHand.push(game.deck.pop());
    dealerVal = calculateHand(game.dealerHand);
  }

  const playerVal = calculateHand(game.playerHand);
  const newBal = getBalance(userId);

  let resultMsg = '';
  if (dealerVal > 21) {
    // Dealer bust, player wins
    const winnings = game.bet * 2;
    updateBalance(userId, winnings);
    const finalBal = getBalance(userId);
    resultMsg = `🎉 *Dealer überkauft!* Du gewinnst: *${winnings} Credits*!\n💰 Neues Guthaben: *${finalBal.toFixed(2)} Credits*`;
  } else if (playerVal > dealerVal) {
    // Player wins
    const winnings = game.bet * 2;
    updateBalance(userId, winnings);
    const finalBal = getBalance(userId);
    resultMsg = `🎉 *Du gewinnst!* Du hast den Dealer geschlagen.\nGewinn: *${winnings} Credits*!\n💰 Neues Guthaben: *${finalBal.toFixed(2)} Credits*`;
  } else if (playerVal < dealerVal) {
    // Player loses
    resultMsg = `❌ *Verloren!* Der Dealer gewinnt.\nVerlust: *-${game.bet} Credits*\n💰 Neues Guthaben: *${newBal.toFixed(2)} Credits*`;
  } else {
    // Push
    updateBalance(userId, game.bet);
    const finalBal = getBalance(userId);
    resultMsg = `👥 *Push (Unentschieden)!* Du bekommst deinen Einsatz zurück.\n💰 Guthaben: *${finalBal.toFixed(2)} Credits*`;
  }

  await ctx.reply(
    `🛑 *Spiel beendet:*\n\nDeine Hand: *${formatHand(game.playerHand)}* (Wert: *${playerVal}*)\nDealer Hand: *${formatHand(game.dealerHand)}* (Wert: *${dealerVal}*)\n\n${resultMsg}`,
    { parse_mode: 'Markdown' }
  );
});

bot.action('info', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Das ist ein Starter-Bot. Man kann ihn später mit Support, Datenbank, Website-Anbindung oder Admin-Funktionen erweitern.');
});

bot.action('updates', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Aktuell gibt es noch keine Updates.');
});

bot.action('support', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Schreib einfach deine Frage hier in den Chat. Ich leite sie an den Admin weiter, und er kann dir direkt hier antworten!');
});

bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  const user = ctx.from;

  if (message.startsWith('/')) return;

  // 1. Check if the message is a reply from the Admin
  if (ctx.message.reply_to_message && adminTelegramId && user.id.toString() === adminTelegramId.toString()) {
    const adminReplyToId = ctx.message.reply_to_message.message_id;
    const ticket = getTicket(adminReplyToId);

    if (ticket) {
      try {
        await ctx.telegram.sendMessage(
          ticket.user_telegram_id,
          `📩 *Antwort vom Support:*\n\n${message}`,
          {
            parse_mode: 'Markdown',
            reply_to_message_id: ticket.user_message_id
          }
        );
        await ctx.reply('Antwort wurde erfolgreich gesendet! ✅');
      } catch (err) {
        console.error('Fehler beim Senden der Antwort an User:', err);
        await ctx.reply('❌ Fehler: Die Antwort konnte nicht an den User gesendet werden (Bot blockiert?).');
      }
      return;
    }
  }

  // 2. Default user messaging -> forward to Admin
  await ctx.reply('Danke, deine Nachricht wurde empfangen und an den Support weitergeleitet. ✅');

  if (adminTelegramId) {
    const username = user.username ? `@${user.username}` : 'kein Username';
    try {
      const adminMsg = await ctx.telegram.sendMessage(
        adminTelegramId,
        `📩 *Neue Support-Anfrage*\n\n*Von:* ${user.first_name || ''} ${user.last_name || ''}\n*Username:* ${username}\n*User-ID:* \`${user.id}\`\n\n*Nachricht:*\n${message}`,
        { parse_mode: 'Markdown' }
      );
      
      // Save mapping in database
      saveTicket(adminMsg.message_id, user.id, ctx.message.message_id);
    } catch (err) {
      console.error('Fehler beim Weiterleiten an Admin:', err);
    }
  }
});

bot.catch((err, ctx) => {
  console.error(`Bot-Fehler bei Update ${ctx.update?.update_id}:`, err);
});

bot.launch();
console.log('Telegram Bot läuft per Polling...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
