import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Achievement ids follow a convention the gamification service checks:
// "words-N" unlocks at N known words, "streak-N" at an N-day streak.
const ACHIEVEMENTS = [
  { id: "words-1", title: "Первое слово", description: "Отметь первое известное слово", icon: "🌱", threshold: 1 },
  { id: "words-10", title: "Разминка", description: "10 известных слов", icon: "🔤", threshold: 10 },
  { id: "words-50", title: "Набираешь ход", description: "50 известных слов", icon: "📚", threshold: 50 },
  { id: "words-100", title: "Сотня!", description: "100 известных слов", icon: "💯", threshold: 100 },
  { id: "words-250", title: "Полиглот", description: "250 известных слов", icon: "🎓", threshold: 250 },
  { id: "words-500", title: "Словарный мастер", description: "500 известных слов", icon: "🏆", threshold: 500 },
  { id: "streak-3", title: "Три дня подряд", description: "Занимайся 3 дня подряд", icon: "🔥", threshold: 3 },
  { id: "streak-7", title: "Неделя силы", description: "Занимайся 7 дней подряд", icon: "⚡", threshold: 7 },
  { id: "streak-30", title: "Железная воля", description: "Занимайся 30 дней подряд", icon: "🦾", threshold: 30 },
];

async function main() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      update: { title: a.title, description: a.description, icon: a.icon, threshold: a.threshold },
      create: a,
    });
  }
  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
