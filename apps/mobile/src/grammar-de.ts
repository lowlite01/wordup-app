// German grammar guide (shown when the German course is active).
// Same shape as the English GRAMMAR in grammar.ts.

export const GRAMMAR_DE = [
  {
    section: "Basics",
    items: [
      {
        title: "The alphabet & sounds",
        formula: "26 letters + ä ö ü ß",
        use: [
          "Vowels can take an umlaut: ä, ö, ü",
          "ß (eszett) is a sharp 's' — never capital",
          "J = 'yot' (like y), V = 'fau' (like f), W = 'veh' (like v)",
          "Z = 'tset' (ts), and R is guttural, from the throat",
        ],
        signals: ["ä", "ö", "ü", "ß", "j", "v", "w", "z"],
        examples: [
          ["Apfel, Übung, schön, Straße", "ä/ö/ü/ß in words"],
          ["ja, Vater, Wasser, Zeit", "j/v/w/z sounds"],
        ],
      },
      {
        title: "Articles & gender (der/die/das)",
        formula: "der (m) · die (f) · das (n) · die (plural)",
        use: [
          "Every noun has a gender — learn it with the noun",
          "der = masculine, die = feminine, das = neuter",
          "The plural article is always die",
          "Indefinite: ein (m/n), eine (f)",
        ],
        examples: [
          ["der Mann, die Frau, das Kind", "the man / woman / child"],
          ["ein Hund, eine Katze", "a dog, a cat"],
        ],
      },
      {
        title: "Nouns are capitalised",
        formula: "Every noun starts with a capital letter",
        use: [
          "All nouns are capitalised, always — not just names",
          "It helps you spot the nouns in a sentence",
        ],
        examples: [
          ["Ich lese ein Buch.", "Buch = book"],
          ["Der Hund spielt im Garten.", "Hund, Garten"],
        ],
      },
    ],
  },
  {
    section: "Sentences",
    items: [
      {
        title: "Word order (Satzbau)",
        formula: "Subject + VERB (2nd position) + rest",
        use: [
          "The conjugated verb is always the second element",
          "Something else can come first, but the verb stays 2nd",
          "The rest follows Time → Manner → Place",
        ],
        examples: [
          ["Ich spiele heute Fußball.", "verb 'spiele' is 2nd"],
          ["Heute spiele ich Fußball.", "time first → verb still 2nd"],
        ],
      },
      {
        title: "Question words (W-Fragen)",
        formula: "Wer, Was, Wo, Wann, Wie, Warum, Woher, Wohin + verb …",
        use: [
          "wer = who, was = what",
          "wo = where, wohin = where to, woher = where from",
          "wann = when, wie = how, warum = why",
          "Question word first, then the verb",
        ],
        signals: ["wer", "was", "wo", "wann", "wie", "warum", "woher", "wohin"],
        examples: [
          ["Wie heißt du?", "what's your name?"],
          ["Woher kommst du?", "where are you from?"],
          ["Warum lernst du Deutsch?", "why do you learn German?"],
        ],
      },
      {
        title: "Yes/no questions",
        formula: "VERB + subject + rest?",
        use: [
          "Start with the verb — no question word needed",
          "Answer with ja (yes), nein (no) or doch",
        ],
        examples: [
          ["Sprichst du Deutsch?", "do you speak German?"],
          ["Hast du Zeit?", "do you have time?"],
        ],
      },
    ],
  },
  {
    section: "Verbs",
    items: [
      {
        title: "Present tense (Präsens)",
        formula: "stem + e / st / t / en / t / en",
        use: [
          "Regular endings for ich / du / er·sie·es / wir / ihr / sie·Sie",
          "spielen → ich spiele, du spielst, er spielt",
          "wir spielen, ihr spielt, sie spielen",
        ],
        examples: [
          ["ich lerne, du lernst, er lernt", "lernen = to learn"],
          ["wir wohnen, ihr wohnt, sie wohnen", "wohnen = to live"],
        ],
      },
      {
        title: "sein (to be)",
        formula: "ich bin · du bist · er ist · wir sind · ihr seid · sie sind",
        use: [
          "The most important irregular verb",
          "Used for states and descriptions",
        ],
        examples: [
          ["Ich bin müde.", "I am tired"],
          ["Wir sind Freunde.", "we are friends"],
        ],
      },
      {
        title: "haben (to have)",
        formula: "ich habe · du hast · er hat · wir haben · ihr habt · sie haben",
        use: [
          "The second key verb",
          "Also used to build the perfect (past) tense",
        ],
        examples: [
          ["Ich habe Zeit.", "I have time"],
          ["Hast du Hunger?", "are you hungry? (lit. have you hunger)"],
        ],
      },
    ],
  },
  {
    section: "More",
    items: [
      {
        title: "Numbers (Zahlen)",
        formula: "eins, zwei, drei … zehn, elf, zwölf … zwanzig",
        use: [
          "0 null, 1 eins, 2 zwei, 3 drei, 4 vier, 5 fünf",
          "6 sechs, 7 sieben, 8 acht, 9 neun, 10 zehn",
          "21 = einundzwanzig (literally 'one-and-twenty')",
        ],
        examples: [
          ["Ich bin zwanzig Jahre alt.", "20 years old"],
          ["Es ist drei Uhr.", "it's 3 o'clock"],
        ],
      },
      {
        title: "Plurals (Plural)",
        formula: "-e · -en · -er · -s · or umlaut (varies)",
        use: [
          "Plurals are irregular — learn them with the noun",
          "Common: -e (Tag→Tage), -en (Frau→Frauen), -er (Kind→Kinder)",
          "The plural article is always die",
        ],
        examples: [
          ["das Kind → die Kinder", "child → children"],
          ["die Frau → die Frauen", "woman → women"],
        ],
      },
      {
        title: "Cases: Nominativ & Akkusativ",
        formula: "Nom: der/die/das · Akk: den/die/das",
        use: [
          "Nominative = the subject (who does the action)",
          "Accusative = the direct object (what is affected)",
          "Only masculine changes: der → den, ein → einen",
        ],
        examples: [
          ["Der Mann sieht den Hund.", "Mann = subject, Hund = object"],
          ["Ich habe einen Apfel.", "ein → einen (masc. accusative)"],
        ],
      },
    ],
  },
];
