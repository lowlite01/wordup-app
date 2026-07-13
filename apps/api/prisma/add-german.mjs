import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Full German course, mirroring the English one: CEFR level cores (A1–B2)
// plus themed topics, all tagged language "de". Keys are prefixed "de:" so
// they never collide with the English groups; the API strips the prefix when
// it serves the German course, so the front-end sees plain "A1"/"Food"/… keys.
// Nouns include their article to teach gender. The alphabet, articles, verb
// conjugation etc. live in the Grammar guide (grammar-de), not here.

const N = (word, def, example) => ({ word, pos: "noun", def, example });
const V = (word, def, example) => ({ word, pos: "verb", def, example });
const A = (word, def, example) => ({ word, pos: "adj", def, example });
const R = (word, def, example) => ({ word, pos: "adverb", def, example });

// Level cores (key -> words), category "level".
const CORES = {
  "de:A1": [
    N("der Mann", "the man", "Der Mann ist groß."),
    N("die Frau", "the woman", "Die Frau liest ein Buch."),
    N("das Kind", "the child", "Das Kind spielt draußen."),
    N("der Freund", "the friend", "Er ist mein Freund."),
    N("das Haus", "the house", "Wir wohnen in einem Haus."),
    N("die Stadt", "the city / town", "Berlin ist eine große Stadt."),
    N("der Tag", "the day", "Heute ist ein schöner Tag."),
    N("die Nacht", "the night", "Gute Nacht!"),
    N("das Jahr", "the year", "Ein Jahr hat zwölf Monate."),
    V("gehen", "to go", "Ich gehe nach Hause."),
    V("kommen", "to come", "Kommst du mit?"),
    V("sehen", "to see", "Ich sehe dich."),
    A("gut", "good", "Das Essen ist gut."),
    A("groß", "big / tall", "Das Haus ist groß."),
    A("klein", "small", "Die Katze ist klein."),
    R("heute", "today", "Heute lerne ich Deutsch."),
  ],
  "de:A2": [
    N("die Arbeit", "the work / job", "Die Arbeit macht Spaß."),
    N("das Geld", "the money", "Ich habe kein Geld."),
    N("die Familie", "the family", "Meine Familie ist groß."),
    N("die Reise", "the trip / journey", "Die Reise war lang."),
    N("die Woche", "the week", "Eine Woche hat sieben Tage."),
    N("der Monat", "the month", "Der Monat ist fast vorbei."),
    A("wichtig", "important", "Das ist sehr wichtig."),
    A("schwierig", "difficult", "Die Frage ist schwierig."),
    A("einfach", "easy / simple", "Das ist ganz einfach."),
    V("verstehen", "to understand", "Ich verstehe die Frage nicht."),
    V("sprechen", "to speak", "Sprichst du Deutsch?"),
    V("brauchen", "to need", "Ich brauche Hilfe."),
    V("finden", "to find", "Ich finde meinen Schlüssel nicht."),
    R("vielleicht", "maybe", "Vielleicht komme ich später."),
    R("immer", "always", "Sie ist immer freundlich."),
    R("oft", "often", "Wir gehen oft ins Kino."),
  ],
  "de:B1": [
    N("die Erfahrung", "the experience", "Er hat viel Erfahrung."),
    N("die Meinung", "the opinion", "Meiner Meinung nach ist das falsch."),
    N("die Möglichkeit", "the possibility / option", "Es gibt viele Möglichkeiten."),
    N("die Entscheidung", "the decision", "Das war eine gute Entscheidung."),
    N("die Umwelt", "the environment", "Wir müssen die Umwelt schützen."),
    N("die Gesundheit", "the health", "Gesundheit ist wichtig."),
    A("erfolgreich", "successful", "Das Projekt war erfolgreich."),
    A("verantwortlich", "responsible", "Wer ist dafür verantwortlich?"),
    A("möglich", "possible", "Das ist leider nicht möglich."),
    V("entwickeln", "to develop", "Wir entwickeln eine neue App."),
    V("erreichen", "to reach / achieve", "Ich habe mein Ziel erreicht."),
    V("empfehlen", "to recommend", "Ich empfehle dieses Restaurant."),
    R("deshalb", "therefore / that's why", "Es regnet, deshalb bleibe ich zu Hause."),
    R("trotzdem", "nevertheless", "Es war teuer, trotzdem habe ich es gekauft."),
    R("normalerweise", "normally / usually", "Normalerweise stehe ich früh auf."),
  ],
  "de:B2": [
    N("die Herausforderung", "the challenge", "Das ist eine große Herausforderung."),
    N("der Zusammenhang", "the connection / context", "Ich sehe keinen Zusammenhang."),
    N("die Auswirkung", "the impact / effect", "Das hat große Auswirkungen."),
    N("die Nachhaltigkeit", "the sustainability", "Nachhaltigkeit ist ein wichtiges Thema."),
    N("der Fortschritt", "the progress", "Wir machen große Fortschritte."),
    N("die Voraussetzung", "the prerequisite", "Gute Kenntnisse sind eine Voraussetzung."),
    A("anspruchsvoll", "demanding / sophisticated", "Die Aufgabe ist anspruchsvoll."),
    A("nachhaltig", "sustainable", "Wir suchen nachhaltige Lösungen."),
    A("wahrscheinlich", "likely / probable", "Das ist wahrscheinlich richtig."),
    V("berücksichtigen", "to take into account", "Wir müssen alle Faktoren berücksichtigen."),
    V("beeinflussen", "to influence", "Das Wetter beeinflusst meine Laune."),
    V("ermöglichen", "to enable / make possible", "Die App ermöglicht schnelles Lernen."),
    R("dennoch", "nevertheless / yet", "Es war schwer, dennoch hat er es geschafft."),
    R("hinsichtlich", "regarding / with regard to", "Hinsichtlich der Kosten gibt es Fragen."),
    R("außerdem", "besides / moreover", "Es ist teuer; außerdem ist es weit weg."),
  ],
};

// Themed topics (key -> words), category "topic". Names match the English
// topics so they reuse the same level mapping and emoji.
const TOPICS = {
  "de:Food": [
    N("das Brot", "bread", "Das Brot ist frisch."),
    N("das Wasser", "water", "Ich trinke Wasser."),
    N("die Milch", "milk", "Die Milch ist kalt."),
    N("der Kaffee", "coffee", "Ich trinke gern Kaffee."),
    N("der Apfel", "apple", "Der Apfel ist rot."),
    N("der Käse", "cheese", "Der Käse schmeckt gut."),
    N("das Fleisch", "meat", "Ich esse kein Fleisch."),
    N("der Fisch", "fish", "Der Fisch ist frisch."),
    N("das Gemüse", "vegetables", "Gemüse ist gesund."),
    N("das Obst", "fruit", "Obst ist gesund."),
    N("die Suppe", "soup", "Die Suppe ist heiß."),
    N("der Zucker", "sugar", "Nimmst du Zucker?"),
  ],
  "de:Family": [
    N("die Mutter", "mother", "Meine Mutter kocht gern."),
    N("der Vater", "father", "Mein Vater arbeitet viel."),
    N("die Schwester", "sister", "Ich habe eine Schwester."),
    N("der Bruder", "brother", "Mein Bruder ist jünger."),
    N("die Tochter", "daughter", "Ihre Tochter ist fünf."),
    N("der Sohn", "son", "Sein Sohn geht zur Schule."),
    N("die Oma", "grandma", "Meine Oma wohnt am Meer."),
    N("der Opa", "grandpa", "Mein Opa erzählt Geschichten."),
    N("die Eltern", "parents", "Meine Eltern sind nett."),
    N("das Baby", "baby", "Das Baby schläft."),
  ],
  "de:Home": [
    N("das Zimmer", "room", "Mein Zimmer ist klein."),
    N("die Küche", "kitchen", "Die Küche ist neu."),
    N("das Bett", "bed", "Das Bett ist bequem."),
    N("der Tisch", "table", "Der Tisch ist aus Holz."),
    N("der Stuhl", "chair", "Der Stuhl ist kaputt."),
    N("die Tür", "door", "Mach bitte die Tür zu."),
    N("das Fenster", "window", "Das Fenster ist offen."),
    N("die Lampe", "lamp", "Die Lampe ist an."),
    N("der Schrank", "cupboard / wardrobe", "Der Schrank ist voll."),
    N("das Bad", "bathroom", "Das Bad ist oben."),
  ],
  "de:Colors": [
    A("rot", "red", "Die Rose ist rot."),
    A("blau", "blue", "Der Himmel ist blau."),
    A("grün", "green", "Das Gras ist grün."),
    A("gelb", "yellow", "Die Sonne ist gelb."),
    A("schwarz", "black", "Die Katze ist schwarz."),
    A("weiß", "white", "Der Schnee ist weiß."),
    A("orange", "orange", "Die Orange ist orange."),
    A("braun", "brown", "Der Bär ist braun."),
    A("rosa", "pink", "Das Kleid ist rosa."),
    A("grau", "grey", "Die Wolke ist grau."),
  ],
  "de:City": [
    N("die Straße", "street", "Die Straße ist breit."),
    N("der Bahnhof", "train station", "Der Bahnhof ist im Zentrum."),
    N("der Markt", "market", "Der Markt ist am Samstag."),
    N("die Kirche", "church", "Die Kirche ist sehr alt."),
    N("die Bank", "bank", "Die Bank ist geschlossen."),
    N("das Krankenhaus", "hospital", "Das Krankenhaus ist groß."),
    N("der Park", "park", "Wir gehen in den Park."),
    N("das Geschäft", "shop / store", "Das Geschäft öffnet um neun."),
    N("die Haltestelle", "bus/tram stop", "Die Haltestelle ist dort."),
    N("das Rathaus", "town hall", "Das Rathaus ist am Platz."),
  ],
  "de:Weather": [
    N("die Sonne", "sun", "Die Sonne scheint."),
    N("der Regen", "rain", "Der Regen hört nicht auf."),
    N("der Schnee", "snow", "Der Schnee ist weiß."),
    N("der Wind", "wind", "Der Wind ist stark."),
    N("die Wolke", "cloud", "Eine Wolke bedeckt die Sonne."),
    N("der Himmel", "sky", "Der Himmel ist blau."),
    A("warm", "warm", "Heute ist es warm."),
    A("kalt", "cold", "Im Winter ist es kalt."),
    A("heiß", "hot", "Der Sommer ist heiß."),
    A("nass", "wet", "Die Straße ist nass."),
  ],
  "de:Travel": [
    N("der Flug", "flight", "Der Flug ist pünktlich."),
    N("der Zug", "train", "Der Zug fährt um acht."),
    N("das Flugzeug", "airplane", "Das Flugzeug landet bald."),
    N("der Koffer", "suitcase", "Mein Koffer ist schwer."),
    N("der Pass", "passport", "Zeig mir deinen Pass."),
    N("das Hotel", "hotel", "Das Hotel liegt am Strand."),
    N("das Ticket", "ticket", "Ich habe das Ticket gekauft."),
    N("die Grenze", "border", "Wir überqueren die Grenze."),
    N("das Ausland", "abroad", "Sie arbeitet im Ausland."),
    N("die Ankunft", "arrival", "Die Ankunft ist um zehn."),
  ],
  "de:Work": [
    N("der Beruf", "profession / job", "Was ist dein Beruf?"),
    N("der Chef", "boss", "Mein Chef ist streng."),
    N("das Büro", "office", "Das Büro ist im dritten Stock."),
    N("die Besprechung", "meeting", "Die Besprechung dauert eine Stunde."),
    N("der Vertrag", "contract", "Ich unterschreibe den Vertrag."),
    N("das Gehalt", "salary", "Das Gehalt ist gut."),
    N("die Bewerbung", "job application", "Ich schreibe eine Bewerbung."),
    N("der Kollege", "colleague", "Mein Kollege hilft mir."),
    N("die Aufgabe", "task", "Die Aufgabe ist schwierig."),
    N("der Termin", "appointment", "Ich habe einen Termin um drei."),
  ],
  "de:Health": [
    N("der Arzt", "doctor", "Ich gehe zum Arzt."),
    N("die Krankheit", "illness", "Die Krankheit ist harmlos."),
    N("das Medikament", "medicine", "Nimm das Medikament zweimal am Tag."),
    N("der Schmerz", "pain", "Ich habe Schmerzen im Rücken."),
    N("die Behandlung", "treatment", "Die Behandlung dauert eine Woche."),
    N("das Fieber", "fever", "Das Kind hat Fieber."),
    N("die Apotheke", "pharmacy", "Die Apotheke ist um die Ecke."),
    N("die Untersuchung", "examination / check-up", "Die Untersuchung war schnell."),
    N("die Ernährung", "nutrition / diet", "Gesunde Ernährung ist wichtig."),
    N("die Verletzung", "injury", "Die Verletzung ist nicht schlimm."),
  ],
  "de:Nature": [
    N("der Baum", "tree", "Der Baum ist sehr alt."),
    N("der Wald", "forest", "Wir gehen im Wald spazieren."),
    N("der Berg", "mountain", "Der Berg ist hoch."),
    N("der Fluss", "river", "Der Fluss ist tief."),
    N("das Meer", "sea", "Das Meer ist ruhig."),
    N("die Blume", "flower", "Die Blume riecht gut."),
    N("das Tier", "animal", "Das Tier ist wild."),
    N("die Insel", "island", "Die Insel ist klein."),
    N("die Landschaft", "landscape", "Die Landschaft ist schön."),
    N("der Vogel", "bird", "Der Vogel singt."),
  ],
};

// Old German topics from the earlier single-level attempt — remove them so the
// course is clean (their content now lives in level cores and the grammar guide).
const OBSOLETE = [
  "German Alphabet", "German Articles", "German Basics", "German Numbers", "German Verbs",
];

async function main() {
  await prisma.wordGroup.deleteMany({ where: { key: { in: OBSOLETE } } });

  let order = 100;
  for (const [key, words] of Object.entries(CORES)) {
    await prisma.wordGroup.deleteMany({ where: { key } });
    await prisma.wordGroup.create({
      data: {
        key, category: "level", language: "de", order: order++,
        words: { create: words.map((w, i) => ({ ...w, order: i })) },
      },
    });
    console.log(`Core ${key}: ${words.length} words`);
  }

  order = 900;
  for (const [key, words] of Object.entries(TOPICS)) {
    await prisma.wordGroup.deleteMany({ where: { key } });
    await prisma.wordGroup.create({
      data: {
        key, category: "topic", language: "de", order: order++,
        words: { create: words.map((w, i) => ({ ...w, order: i })) },
      },
    });
    console.log(`Topic ${key}: ${words.length} words`);
  }
  console.log("German course seeded.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
