var quotes = [
  'Appear weak when you are strong, and strong when you are weak. - Sun Tzu, The Art of War.',
  'The supreme art of war is to subdue the enemy without fighting. - Sun Tzu, The Art of War.',
  'In the midst of chaos, there is also opportunity. - Sun Tzu, The art of War.',
  'So in war, the way is to avoid what is strong, and strike at what is weak. - Sun Tzu, The Art of War.',
  'Veni, vidi, vici - Julius Caesar, after Battle of Zela.',
];

function getQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}
