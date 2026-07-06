import { PrismaClient } from "@prisma/client";
import { WORD_GROUPS, TOPIC_LEVEL2 } from "../../web/src/data/words.js";

const prisma = new PrismaClient();
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const toWords = (arr) =>
  arr.map((w, i) => ({ word: w.word, pos: w.pos, def: w.def, example: w.example, order: i }));

async function main() {
  // Idempotent: clear content and re-seed from the static source of truth.
  await prisma.wordEntry.deleteMany();
  await prisma.wordGroup.deleteMany();

  let order = 0;
  for (const [key, words] of Object.entries(WORD_GROUPS)) {
    await prisma.wordGroup.create({
      data: {
        key,
        category: LEVELS.includes(key) ? "level" : "topic",
        order: order++,
        words: { create: toWords(words) },
      },
    });
  }

  let order2 = 1000;
  for (const [name, words] of Object.entries(TOPIC_LEVEL2)) {
    await prisma.wordGroup.create({
      data: {
        key: name + "@2",
        category: "topic",
        order: order2++,
        words: { create: toWords(words) },
      },
    });
  }

  const groups = await prisma.wordGroup.count();
  const entries = await prisma.wordEntry.count();
  console.log(`Seeded ${groups} groups, ${entries} words.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
