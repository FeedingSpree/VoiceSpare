import { Filter } from 'bad-words';

export const BAD_WORDS = [
  // English
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'motherfucker', 'bastard', 'slut', 'whore', 'faggot', 'nigger', 'nigga', 'bullshit', 'retard',
  // Filipino
  'putangina', 'tangina', 'gago', 'tarantado', 'bobo', 'puta', 'puke', 'titi', 'bayag', 'kupal', 'hindot', 'ulol', 'punyeta', 'leche', 'pakshet', 'bwisit', 'kantot', 'iyot', 'pekpek', 'burat', 'siraulo', 'inutil', 'pokpok', 'tanga'
];

const filter = new Filter();
filter.addWords(...BAD_WORDS);

function normalizeLeetspeak(text: string): string {
  return text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = normalizeLeetspeak(text);
  return filter.isProfane(normalized) || filter.isProfane(text);
}

export function cleanProfanity(text: string): string {
  if (!text) return text;
  
  // First pass: clean normal profanity
  let cleaned = filter.clean(text);
  
  // Second pass: clean leetspeak profanity
  // We split by non-word characters to check individual words
  const words = cleaned.split(/([\s.,!?_'"()[\]{}]+)/);
  
  const fullyCleaned = words.map(word => {
    if (!word || /^[\s.,!?_'"()[\]{}]+$/.test(word)) return word;
    
    const normalized = normalizeLeetspeak(word);
    if (filter.isProfane(normalized)) {
      return '*'.repeat(word.length);
    }
    return word;
  });
  
  return fullyCleaned.join('');
}
