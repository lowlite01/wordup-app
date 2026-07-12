import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Beginner German, added as clearly-labelled topics (idempotent per group).
const TOPICS = {
  "German Alphabet": [
    { word: "A", pos: "letter", def: "'ah' — like 'a' in father", example: "Apfel (apple)" },
    { word: "E", pos: "letter", def: "'eh' — like 'e' in bet", example: "Elefant (elephant)" },
    { word: "I", pos: "letter", def: "'ee' — like 'ee' in see", example: "Igel (hedgehog)" },
    { word: "O", pos: "letter", def: "'oh' — like 'o' in note", example: "Ofen (oven)" },
    { word: "U", pos: "letter", def: "'oo' — like 'oo' in boot", example: "Uhr (clock)" },
    { word: "Ä", pos: "letter", def: "'eh' — like 'e' in bed", example: "Äpfel (apples)" },
    { word: "Ö", pos: "letter", def: "rounded 'e' — like 'i' in bird", example: "schön (beautiful)" },
    { word: "Ü", pos: "letter", def: "rounded 'ee' — say 'ee' with round lips", example: "über (over)" },
    { word: "ß", pos: "letter", def: "'eszett' — a sharp 's' sound", example: "Straße (street)" },
    { word: "J", pos: "letter", def: "'yot' — sounds like English 'y'", example: "Ja (yes)" },
    { word: "V", pos: "letter", def: "'fau' — sounds like 'f'", example: "Vater (father)" },
    { word: "W", pos: "letter", def: "'veh' — sounds like English 'v'", example: "Wasser (water)" },
    { word: "Z", pos: "letter", def: "'tset' — sounds like 'ts'", example: "Zeit (time)" },
    { word: "R", pos: "letter", def: "guttural 'r' from the throat", example: "rot (red)" },
  ],
  "German Articles": [
    { word: "der", pos: "article", def: "the (masculine)", example: "der Mann — the man" },
    { word: "die", pos: "article", def: "the (feminine)", example: "die Frau — the woman" },
    { word: "das", pos: "article", def: "the (neuter)", example: "das Kind — the child" },
    { word: "die (pl.)", pos: "article", def: "the (plural, all genders)", example: "die Kinder — the children" },
    { word: "ein", pos: "article", def: "a/an (masculine or neuter)", example: "ein Hund — a dog" },
    { word: "eine", pos: "article", def: "a/an (feminine)", example: "eine Katze — a cat" },
    { word: "der Tisch", pos: "noun", def: "the table (masculine)", example: "Der Tisch ist groß." },
    { word: "die Lampe", pos: "noun", def: "the lamp (feminine)", example: "Die Lampe ist neu." },
    { word: "das Buch", pos: "noun", def: "the book (neuter)", example: "Das Buch ist gut." },
    { word: "der Apfel", pos: "noun", def: "the apple (masculine)", example: "Der Apfel ist rot." },
    { word: "die Sonne", pos: "noun", def: "the sun (feminine)", example: "Die Sonne scheint." },
    { word: "das Haus", pos: "noun", def: "the house (neuter)", example: "Das Haus ist alt." },
  ],
  "German Basics": [
    { word: "Hallo", pos: "greeting", def: "hello", example: "Hallo, wie geht's?" },
    { word: "Tschüss", pos: "greeting", def: "bye", example: "Tschüss, bis morgen!" },
    { word: "Guten Tag", pos: "greeting", def: "good day / hello", example: "Guten Tag, Frau Müller." },
    { word: "Ja", pos: "word", def: "yes", example: "Ja, gern." },
    { word: "Nein", pos: "word", def: "no", example: "Nein, danke." },
    { word: "Danke", pos: "word", def: "thank you", example: "Danke schön!" },
    { word: "Bitte", pos: "word", def: "please / you're welcome", example: "Bitte schön." },
    { word: "ich", pos: "pronoun", def: "I", example: "Ich heiße Anna." },
    { word: "du", pos: "pronoun", def: "you (informal)", example: "Wie heißt du?" },
    { word: "Wasser", pos: "noun", def: "water", example: "Ich trinke Wasser." },
    { word: "Brot", pos: "noun", def: "bread", example: "Das Brot ist frisch." },
    { word: "eins", pos: "number", def: "one", example: "eins, zwei, drei" },
    { word: "zwei", pos: "number", def: "two", example: "Ich habe zwei Katzen." },
    { word: "drei", pos: "number", def: "three", example: "drei Äpfel" },
  ],
  "German Numbers": [
    { word: "null", pos: "number", def: "zero", example: "null Grad" },
    { word: "eins", pos: "number", def: "one", example: "Nummer eins" },
    { word: "zwei", pos: "number", def: "two", example: "zwei Uhr" },
    { word: "drei", pos: "number", def: "three", example: "drei Tage" },
    { word: "vier", pos: "number", def: "four", example: "vier Wochen" },
    { word: "fünf", pos: "number", def: "five", example: "fünf Euro" },
    { word: "sechs", pos: "number", def: "six", example: "sechs Uhr" },
    { word: "sieben", pos: "number", def: "seven", example: "sieben Tage" },
    { word: "acht", pos: "number", def: "eight", example: "acht Stunden" },
    { word: "neun", pos: "number", def: "nine", example: "neun Jahre" },
    { word: "zehn", pos: "number", def: "ten", example: "zehn Minuten" },
    { word: "elf", pos: "number", def: "eleven", example: "elf Spieler" },
    { word: "zwölf", pos: "number", def: "twelve", example: "zwölf Monate" },
    { word: "zwanzig", pos: "number", def: "twenty", example: "zwanzig Euro" },
  ],
  "German Verbs": [
    { word: "sein", pos: "verb", def: "to be", example: "Ich bin müde." },
    { word: "haben", pos: "verb", def: "to have", example: "Ich habe Zeit." },
    { word: "gehen", pos: "verb", def: "to go", example: "Ich gehe nach Hause." },
    { word: "kommen", pos: "verb", def: "to come", example: "Kommst du mit?" },
    { word: "machen", pos: "verb", def: "to do / make", example: "Was machst du?" },
    { word: "sagen", pos: "verb", def: "to say", example: "Was sagst du?" },
    { word: "sehen", pos: "verb", def: "to see", example: "Ich sehe dich." },
    { word: "essen", pos: "verb", def: "to eat", example: "Ich esse einen Apfel." },
    { word: "trinken", pos: "verb", def: "to drink", example: "Ich trinke Kaffee." },
    { word: "sprechen", pos: "verb", def: "to speak", example: "Ich spreche Deutsch." },
    { word: "wohnen", pos: "verb", def: "to live / reside", example: "Ich wohne in Berlin." },
    { word: "arbeiten", pos: "verb", def: "to work", example: "Ich arbeite heute." },
    { word: "lernen", pos: "verb", def: "to learn", example: "Ich lerne Deutsch." },
    { word: "verstehen", pos: "verb", def: "to understand", example: "Ich verstehe nicht." },
  ],
};

async function main() {
  let order = 950;
  for (const [key, words] of Object.entries(TOPICS)) {
    await prisma.wordGroup.deleteMany({ where: { key } });
    await prisma.wordGroup.create({
      data: {
        key,
        category: "topic",
        language: "de",
        order: order++,
        words: { create: words.map((w, i) => ({ ...w, order: i })) },
      },
    });
    console.log(`Added "${key}" with ${words.length} words.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
