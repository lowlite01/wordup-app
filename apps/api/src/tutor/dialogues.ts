// Dialogue lessons: a short role-play where the learner types the answers.
// The tutor plays a character, fixes mistakes and ticks off the tasks.
export interface DialogueTask { ru: string; en: string; goal: string }
export interface Dialogue {
  id: string;
  emoji: string;
  level: "A1" | "A2" | "B1";
  title: { ru: string; en: string };
  role: string;    // who the tutor plays and where (for the prompt)
  opener: string;  // the character's first line, shown without a request
  tasks: DialogueTask[];
}

export const DIALOGUES: Dialogue[] = [
  {
    id: "how-are-you", emoji: "👋", level: "A1",
    title: { ru: "Как дела?", en: "How are you?" },
    role: "Sam, a friendly neighbour, meeting the learner in the street in the morning",
    opener: "Oh, hi! Good morning!",
    tasks: [
      { ru: "Поздоровайся и спроси, как дела", en: "Say hello and ask how Sam is", goal: "greets Sam and asks how he is" },
      { ru: "Расскажи, как у тебя дела", en: "Say how you are", goal: "says how they are feeling" },
      { ru: "Попрощайся", en: "Say goodbye", goal: "says goodbye" },
    ],
  },
  {
    id: "meet", emoji: "🤝", level: "A1",
    title: { ru: "Знакомство", en: "Meeting someone" },
    role: "Emma, a new classmate at an English course, meeting the learner for the first time",
    opener: "Hi there! I'm Emma. I think we're in the same class.",
    tasks: [
      { ru: "Назови своё имя", en: "Tell her your name", goal: "says their name" },
      { ru: "Скажи, откуда ты", en: "Say where you are from", goal: "says where they are from" },
      { ru: "Спроси, чем она занимается", en: "Ask what she does", goal: "asks Emma what she does (job or study)" },
    ],
  },
  {
    id: "cafe", emoji: "☕", level: "A1",
    title: { ru: "В кафе", en: "At a café" },
    role: "a barista in a small London café taking the learner's order",
    opener: "Hello! What can I get you today?",
    tasks: [
      { ru: "Закажи напиток", en: "Order a drink", goal: "orders a drink" },
      { ru: "Закажи что-нибудь поесть", en: "Order something to eat", goal: "orders some food" },
      { ru: "Спроси, сколько это стоит", en: "Ask how much it is", goal: "asks about the price" },
    ],
  },
  {
    id: "directions", emoji: "🧭", level: "A2",
    title: { ru: "Как пройти?", en: "Asking the way" },
    role: "a local person on a street in a city centre; the learner is a tourist who is lost",
    opener: "You look a bit lost. Can I help you?",
    tasks: [
      { ru: "Спроси, как дойти до вокзала", en: "Ask how to get to the station", goal: "asks how to get to the train station" },
      { ru: "Уточни, далеко ли это", en: "Ask if it is far", goal: "asks how far it is or how long it takes" },
      { ru: "Поблагодари", en: "Say thank you", goal: "thanks the person" },
    ],
  },
  {
    id: "shop", emoji: "👕", level: "A2",
    title: { ru: "В магазине одежды", en: "Clothes shop" },
    role: "a shop assistant in a clothes shop",
    opener: "Hi! Are you looking for anything special?",
    tasks: [
      { ru: "Скажи, что ищешь", en: "Say what you are looking for", goal: "says what clothes they want" },
      { ru: "Спроси про свой размер", en: "Ask about your size", goal: "asks for a size or says their size" },
      { ru: "Спроси, можно ли примерить", en: "Ask to try it on", goal: "asks if they can try it on" },
    ],
  },
  {
    id: "hotel", emoji: "🏨", level: "A2",
    title: { ru: "В отеле", en: "At a hotel" },
    role: "a receptionist at a hotel; the learner is checking in",
    opener: "Good evening, welcome to the Park Hotel! How can I help?",
    tasks: [
      { ru: "Скажи, что у тебя бронь", en: "Say you have a booking", goal: "says they have a reservation and gives a name" },
      { ru: "Спроси, во сколько завтрак", en: "Ask what time breakfast is", goal: "asks about breakfast time" },
      { ru: "Спроси про Wi-Fi", en: "Ask about the Wi-Fi", goal: "asks about Wi-Fi or the password" },
    ],
  },
  {
    id: "weekend", emoji: "🎉", level: "B1",
    title: { ru: "Планы на выходные", en: "Weekend plans" },
    role: "Alex, a friend, chatting with the learner on Friday afternoon",
    opener: "Finally Friday! Got any plans for the weekend?",
    tasks: [
      { ru: "Расскажи о своих планах", en: "Tell your plans", goal: "describes their weekend plans (future form)" },
      { ru: "Спроси о его планах", en: "Ask about his plans", goal: "asks Alex about his plans" },
      { ru: "Предложи встретиться", en: "Suggest meeting up", goal: "suggests doing something together" },
    ],
  },
  {
    id: "doctor", emoji: "🩺", level: "B1",
    title: { ru: "У врача", en: "At the doctor's" },
    role: "a GP (family doctor) seeing the learner in a clinic",
    opener: "Hello, please take a seat. What seems to be the problem?",
    tasks: [
      { ru: "Опиши, что болит", en: "Describe what hurts", goal: "describes their symptoms" },
      { ru: "Скажи, как давно это началось", en: "Say how long it has lasted", goal: "says how long they have had it" },
      { ru: "Спроси, что делать", en: "Ask what to do", goal: "asks for advice or medicine" },
    ],
  },
];

export const dialogueList = () =>
  DIALOGUES.map(d => ({
    id: d.id, emoji: d.emoji, level: d.level, title: d.title, opener: d.opener,
    tasks: d.tasks.map(t => ({ ru: t.ru, en: t.en })),
  }));
