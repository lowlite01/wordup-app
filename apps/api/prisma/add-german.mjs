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
};

async function main() {
  let order = 950;
  for (const [key, words] of Object.entries(TOPICS)) {
    await prisma.wordGroup.deleteMany({ where: { key } });
    await prisma.wordGroup.create({
      data: {
        key,
        category: "topic",
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
