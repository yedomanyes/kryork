import { getBalance, updateBalance } from './db.js';

// Global state for ongoing Blackjack games
// Maps userId -> { deck, playerHand, dealerHand, bet, messageId }
export const activeBlackjack = new Map();

// Helper to shuffle a card deck
export function createDeck() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      let value = parseInt(rank);
      if (['J', 'Q', 'K'].includes(rank)) value = 10;
      if (rank === 'A') value = 11;
      deck.push({ rank, suit, value });
    }
  }
  
  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Calculate Blackjack hand value
export function calculateHand(hand) {
  let value = hand.reduce((sum, card) => sum + card.value, 0);
  let aces = hand.filter(card => card.rank === 'A').length;
  
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
}

// Format hand to user-readable string
export function formatHand(hand) {
  return hand.map(c => `${c.rank}${c.suit}`).join(' ');
}

/**
 * Play Dice
 * Returns { win, roll, payout }
 * Configured for 99.53% RTP: Probability of winning is 49.765%
 */
/**
 * Play Dice
 * Returns { win, roll, payout }
 * Configured for 99.53% RTP: Probability of winning is 49.765%
 */
export function playDice(userId, bet, choice) {
  const roll = Math.random() * 100; // 0 to 100 decimal roll
  let win = false;
  
  if (choice === 'under') {
    win = roll < 49.765;
  } else {
    win = roll >= (100 - 49.765);
  }
  
  const payout = win ? bet * 2 : 0;
  
  // Update balance
  if (win) {
    updateBalance(userId, bet); // Net win = bet
  } else {
    updateBalance(userId, -bet);
  }
  
  return { win, roll: Math.round(roll * 100) / 100, payout };
}

/**
 * Play Limbo
 * Returns { win, roll, payout }
 * Configured for 99% RTP: P(roll >= target) = 0.99 / target
 */
export function playLimbo(userId, bet, targetMultiplier) {
  // Limbo formula for exactly 99% RTP: roll = 0.99 / (1 - random)
  const roll = 0.99 / (1 - Math.random());
  const formattedRoll = Math.round(Math.min(roll, 10000) * 100) / 100;
  
  const win = formattedRoll >= targetMultiplier;
  const payout = win ? Math.floor(bet * targetMultiplier) : 0;
  
  if (win) {
    updateBalance(userId, payout - bet);
  } else {
    updateBalance(userId, -bet);
  }
  
  return { win, roll: formattedRoll, payout };
}

/**
 * Play Dragon Tiger
 * Returns { dragonCard, tigerCard, result, win, payout }
 */
export function playDragonTiger(userId, bet, choice) {
  const deck = createDeck();
  const dragonCard = deck.pop();
  const tigerCard = deck.pop();
  
  let result = 'tie';
  if (dragonCard.value > tigerCard.value) {
    result = 'dragon';
  } else if (dragonCard.value < tigerCard.value) {
    result = 'tiger';
  }
  
  const win = choice === result;
  let payout = 0;
  
  if (win) {
    if (result === 'tie') {
      payout = bet * 8;
    } else {
      payout = bet * 2;
    }
    updateBalance(userId, payout - bet);
  } else {
    updateBalance(userId, -bet);
  }
  
  return { dragonCard, tigerCard, result, win, payout };
}
