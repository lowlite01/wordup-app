import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// New topics to add (idempotent: each group is deleted then recreated).
const TOPICS = {
  Colors: [
    { word: "red", pos: "adj", def: "the colour of blood or a ripe tomato", example: "She wore a bright red dress." },
    { word: "blue", pos: "adj", def: "the colour of a clear sky or the sea", example: "He has blue eyes." },
    { word: "green", pos: "adj", def: "the colour of grass and leaves", example: "The traffic light turned green." },
    { word: "yellow", pos: "adj", def: "the colour of the sun or a lemon", example: "A ripe banana is yellow." },
    { word: "black", pos: "adj", def: "the darkest colour, like night", example: "She drank her coffee black." },
    { word: "white", pos: "adj", def: "the colour of snow or milk", example: "He painted the wall white." },
    { word: "orange", pos: "noun/adj", def: "a colour between red and yellow", example: "The sunset glowed bright orange." },
    { word: "purple", pos: "adj", def: "a colour made by mixing red and blue", example: "The grapes were dark purple." },
    { word: "pink", pos: "adj", def: "a pale red colour", example: "The baby wore pink socks." },
    { word: "brown", pos: "adj", def: "the colour of wood or chocolate", example: "She has long brown hair." },
    { word: "grey", pos: "adj", def: "a colour between black and white", example: "The sky was grey and cloudy." },
    { word: "colourful", pos: "adj", def: "having many bright colours", example: "The market was colourful and lively." },
    { word: "bright", pos: "adj", def: "full of strong, shining light or colour", example: "The room had bright walls." },
    { word: "dark", pos: "adj", def: "with little light; deep in colour", example: "He wore a dark blue suit." },
  ],
  Space: [
    { word: "planet", pos: "noun", def: "a large round object in space that orbits a star", example: "Mars is the fourth planet from the Sun." },
    { word: "star", pos: "noun", def: "a huge ball of burning gas that shines at night", example: "The stars were bright over the desert." },
    { word: "galaxy", pos: "noun", def: "a very large group of stars and planets", example: "Our galaxy is called the Milky Way." },
    { word: "orbit", pos: "noun/verb", def: "the curved path of an object around a star or planet", example: "The satellite stays in orbit around Earth." },
    { word: "gravity", pos: "noun", def: "the force that pulls objects toward each other", example: "Gravity keeps us on the ground." },
    { word: "astronaut", pos: "noun", def: "a person trained to travel in space", example: "The astronaut floated inside the station." },
    { word: "rocket", pos: "noun", def: "a vehicle that is launched into space", example: "The rocket lifted off at dawn." },
    { word: "universe", pos: "noun", def: "everything that exists, including all of space", example: "The universe is billions of years old." },
    { word: "comet", pos: "noun", def: "an icy space object that forms a bright tail", example: "The comet returns every 76 years." },
    { word: "telescope", pos: "noun", def: "a device for seeing distant objects in space", example: "She watched Saturn through a telescope." },
    { word: "satellite", pos: "noun", def: "an object that orbits a planet, natural or man-made", example: "The satellite sends weather data." },
    { word: "spacecraft", pos: "noun", def: "a vehicle designed to travel in space", example: "The spacecraft reached the Moon." },
    { word: "eclipse", pos: "noun", def: "when one space object blocks light from another", example: "We watched the solar eclipse." },
    { word: "atmosphere", pos: "noun", def: "the layer of gases around a planet", example: "Earth's atmosphere protects us from the Sun." },
  ],
};

async function main() {
  let order = 900;
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
    console.log(`Added topic "${key}" with ${words.length} words.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
