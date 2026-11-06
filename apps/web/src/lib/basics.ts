import { choice, type Exercise } from "./exercises";

// "Basics" — the very first unit of the path for learners starting from zero.
// Each lesson: a short rule in Russian with examples, then practice.
// (Russian on purpose: a true beginner can't read an English explanation yet.)

export interface BasicsLesson {
  id: string;
  title: string;
  emoji: string;
  intro: string;                 // the idea in one or two plain sentences
  pairs: [string, string][];     // the key words / patterns: [English, Russian]
  tip?: string;                  // one thing to remember
  examples: [string, string][];  // whole sentences: [English, Russian]
  exercises: () => Exercise[];   // built fresh each time (options get shuffled)
}

export const BASICS: BasicsLesson[] = [
  {
    id: "hello", title: "Привет! Знакомимся", emoji: "🗣️",
    intro: "Самые нужные фразы, чтобы поздороваться и представиться.",
    pairs: [
      ["Hello / Hi", "Привет"], ["Goodbye / Bye", "Пока"], ["I'm Anna", "Я Анна"],
      ["My name is Anna", "Меня зовут Анна"], ["Nice to meet you!", "Приятно познакомиться!"],
      ["How are you?", "Как дела?"], ["I'm fine, thanks", "Хорошо, спасибо"],
    ],
    tip: "I'm — это короткое I am («я есть»). Так говорят почти всегда.",
    examples: [],
    exercises: () => [
      choice("Как сказать «Привет»?", ["Hello", "Goodbye", "Thanks", "Sorry"]),
      choice("Nice to meet you!", ["Приятно познакомиться!", "Как дела?", "До встречи!", "Спасибо!"], { task: "Что это значит?" }),
      { type: "build", hint: "Меня зовут Анна.", answer: "My name is Anna", extra: ["I", "are"] },
      choice("— How are you?\n— ___", ["I'm fine, thanks.", "I'm Anna.", "Nice to meet you.", "Goodbye."], { task: "Выбери ответ", full: ["How are you? — I'm fine, thanks.", "Как дела? — Хорошо, спасибо."] }),
      { type: "build", hint: "Я Том.", answer: "I am Tom", extra: ["is", "my"] },
      { type: "type", prompt: "___ to meet you!", hint: "Приятно познакомиться!", answer: "Nice", full: ["Nice to meet you!", "Приятно познакомиться!"] },
    ],
  },
  {
    id: "pronouns", title: "Я, ты, он, она", emoji: "👤",
    intro: "Этими словами заменяем людей и предметы, чтобы не повторять имена.",
    pairs: [
      ["I", "я"], ["you", "ты / вы"], ["he", "он"], ["she", "она"],
      ["it", "он / она / оно (предмет, животное)"], ["we", "мы"], ["they", "они"],
    ],
    tip: "I всегда пишется с большой буквы. О предметах говорим it: the table → it.",
    examples: [["She is my friend.", "Она моя подруга."], ["They are students.", "Они студенты."]],
    exercises: () => [
      choice("она", ["she", "he", "it", "we"], { task: "Как по-английски?" }),
      choice("мы", ["we", "they", "you", "I"], { task: "Как по-английски?" }),
      choice("the table (стол) → ___", ["it", "he", "she", "they"], { task: "Какое слово заменит?", explain: "О предметах говорим it, даже если по-русски «он»." }),
      choice("Tom and Anna → ___", ["they", "we", "he", "you"], { task: "Какое слово заменит?" }),
      choice("Anna → ___", ["she", "he", "it", "they"], { task: "Какое слово заменит?" }),
      { type: "type", prompt: "«они» по-английски: ___", answer: "they" },
    ],
  },
  {
    id: "to-be", title: "am / is / are", emoji: "💡",
    intro: "По-русски говорим «Я студент». В английском между «я» и «студент» обязательно нужно слово-связка: am, is или are.",
    pairs: [
      ["I am", "я"],
      ["he is", "он"], ["she is", "она"], ["it is", "оно (предмет)"],
      ["you are", "ты / вы"], ["we are", "мы"], ["they are", "они"],
    ],
    tip: "Коротко: I'm, he's, she's, it's, you're, we're, they're.",
    examples: [["I am happy.", "Я счастлив."], ["She is a doctor.", "Она врач."], ["They are at home.", "Они дома."]],
    exercises: () => [
      choice("I ___ hungry.", ["am", "is", "are"], { task: "Вставь пропущенное", explain: "С I всегда am.", full: ["I am hungry.", "Я голоден."] }),
      choice("She ___ my sister.", ["is", "am", "are"], { task: "Вставь пропущенное", explain: "С he, she и it — is.", full: ["She is my sister.", "Она моя сестра."] }),
      choice("We ___ friends.", ["are", "is", "am"], { task: "Вставь пропущенное", explain: "С you, we и they — are.", full: ["We are friends.", "Мы друзья."] }),
      choice("It ___ cold today.", ["is", "are", "am"], { task: "Вставь пропущенное", full: ["It is cold today.", "Сегодня холодно."] }),
      { type: "build", hint: "Он врач.", answer: "He is a doctor", extra: ["are", "am"] },
      { type: "build", hint: "Мы дома.", answer: "We are at home", extra: ["is"] },
      { type: "type", prompt: "They ___ from Kyiv.", hint: "Они из Киева.", answer: "are", full: ["They are from Kyiv.", "Они из Киева."] },
    ],
  },
  {
    id: "to-be-neg", title: "«Не» и вопросы", emoji: "❓",
    intro: "Чтобы сказать «не», добавь not после am / is / are. Чтобы спросить — поставь am / is / are в самое начало.",
    pairs: [
      ["I am not tired", "Я не устал"], ["She is not here", "Её здесь нет"],
      ["Are you OK?", "Ты в порядке?"], ["Is he at work?", "Он на работе?"], ["Yes, he is", "Да"], ["No, he isn't", "Нет"],
    ],
    tip: "isn't = is not, aren't = are not. Но «я не» — только I'm not.",
    examples: [],
    exercises: () => [
      choice("Я не устал.", ["I am not tired.", "I not am tired.", "I am tired not.", "Not I am tired."], { task: "Как правильно?" }),
      choice("___ you a student?", ["Are", "Is", "Am", "Do"], { task: "Вставь пропущенное", full: ["Are you a student?", "Ты студент?"] }),
      choice("— Is she your sister?\n— Yes, ___", ["she is.", "she's.", "is she.", "she are."], {
        task: "Выбери ответ", explain: "В конце фразы сокращать нельзя: Yes, she is (не she's).", full: ["Is she your sister? — Yes, she is.", "Она твоя сестра? — Да."],
      }),
      { type: "build", hint: "Он дома?", answer: "Is he at home", extra: ["are"] },
      { type: "build", hint: "Они не здесь.", answer: "They are not here", extra: ["is"] },
      { type: "type", prompt: "It ___ not expensive.", hint: "Это не дорого.", answer: "is", full: ["It is not expensive.", "Это не дорого."] },
    ],
  },
  {
    id: "a-an", title: "a / an", emoji: "🍎",
    intro: "Перед одним предметом или человеком ставим маленькое слово a или an. В русском такого нет, поэтому его легко забыть.",
    pairs: [["a cat", "кошка"], ["a book", "книга"], ["an apple", "яблоко"], ["an egg", "яйцо"], ["I am a teacher", "Я учитель"]],
    tip: "an — если слово начинается с гласного звука: an apple, an hour.",
    examples: [["I have a dog.", "У меня есть собака."], ["She is an engineer.", "Она инженер."]],
    exercises: () => [
      choice("___ apple", ["an", "a"], { task: "a или an?", explain: "apple начинается с гласного звука, поэтому an.", full: ["an apple", "яблоко"] }),
      choice("___ dog", ["a", "an"], { task: "a или an?", full: ["a dog", "собака"] }),
      choice("She is ___ engineer.", ["an", "a"], { task: "a или an?", full: ["She is an engineer.", "Она инженер."] }),
      choice("Я студент.", ["I am a student.", "I am student.", "I a student.", "I am an student."], {
        task: "Как правильно?", explain: "Нужны и am, и a: I am a student.",
      }),
      { type: "build", hint: "Это яблоко.", answer: "It is an apple", extra: ["a"] },
      { type: "type", prompt: "He is ___ actor.", hint: "Он актёр.", answer: "an", full: ["He is an actor.", "Он актёр."] },
    ],
  },
  {
    id: "this-that", title: "this / that", emoji: "📋",
    intro: "this — про то, что рядом с тобой. that — про то, что далеко.",
    pairs: [["this", "это / этот (рядом)"], ["that", "то / тот (далеко)"], ["these", "эти"], ["those", "те"], ["What is this?", "Что это?"]],
    examples: [["This is my bag.", "Это моя сумка."], ["That car is new.", "Та машина новая."], ["These are my friends.", "Это мои друзья."]],
    exercises: () => [
      choice("Это моя книга (она у меня в руках).", ["This is my book.", "That is my book.", "These is my book.", "This are my book."], { task: "Как правильно?" }),
      choice("___ are my shoes. (эти)", ["These", "This", "That", "Those"], { task: "Вставь пропущенное", full: ["These are my shoes.", "Это мои туфли."] }),
      choice("Look at ___ bird over there! (вон та)", ["that", "this", "these", "those"], { task: "Вставь пропущенное", full: ["Look at that bird over there!", "Посмотри на ту птицу вон там!"] }),
      { type: "build", hint: "Что это?", answer: "What is this", extra: ["are"] },
      { type: "build", hint: "Те машины новые.", answer: "Those cars are new", extra: ["is", "that"] },
      { type: "type", prompt: "___ is my house.", hint: "Это мой дом.", answer: "This", full: ["This is my house.", "Это мой дом."] },
    ],
  },
  {
    id: "my-your", title: "my, your, his, her", emoji: "🏠",
    intro: "Слова «мой, твой, его…» ставим прямо перед предметом.",
    pairs: [["my", "мой"], ["your", "твой / ваш"], ["his", "его (хозяин — он)"], ["her", "её (хозяйка — она)"], ["our", "наш"], ["their", "их"]],
    tip: "Сумка Тома → his bag. Сумка Анны → her bag.",
    examples: [["This is my room.", "Это моя комната."], ["What's your name?", "Как тебя зовут?"], ["Her brother is tall.", "Её брат высокий."]],
    exercises: () => [
      choice("Это его машина.", ["This is his car.", "This is her car.", "This is he car.", "This is him car."], { task: "Как правильно?" }),
      choice("Anna and ___ brother", ["her", "his", "she", "its"], { task: "Вставь пропущенное", explain: "Брат Анны — это её брат, поэтому her.", full: ["Anna and her brother", "Анна и её брат"] }),
      choice("We love ___ city.", ["our", "we", "us", "their"], { task: "Вставь пропущенное", full: ["We love our city.", "Мы любим наш город."] }),
      { type: "build", hint: "Как тебя зовут?", answer: "What is your name", extra: ["you"] },
      { type: "build", hint: "Их дом большой.", answer: "Their house is big", extra: ["they", "are"] },
      { type: "type", prompt: "Tom and ___ dog", hint: "Том и его собака", answer: "his", full: ["Tom and his dog", "Том и его собака"] },
    ],
  },
  {
    id: "have-has", title: "have / has", emoji: "🎁",
    intro: "«У меня есть…» по-английски звучит как «я имею»: I have…",
    pairs: [
      ["I have", "у меня есть"], ["you have", "у тебя есть"], ["we have", "у нас есть"], ["they have", "у них есть"],
      ["he has", "у него есть"], ["she has", "у неё есть"], ["it has", "у него / неё есть (предмет)"],
    ],
    tip: "has — только с he, she, it. Со всеми остальными — have.",
    examples: [["I have a sister.", "У меня есть сестра."], ["He has a new phone.", "У него новый телефон."], ["We have a big family.", "У нас большая семья."]],
    exercises: () => [
      choice("She ___ two sisters.", ["has", "have", "is", "are"], { task: "Вставь пропущенное", explain: "С she — has.", full: ["She has two sisters.", "У неё две сестры."] }),
      choice("We ___ a big family.", ["have", "has", "are", "is"], { task: "Вставь пропущенное", full: ["We have a big family.", "У нас большая семья."] }),
      choice("У него есть велосипед.", ["He has a bike.", "He have a bike.", "He is a bike.", "He has bike."], { task: "Как правильно?" }),
      { type: "build", hint: "У меня есть собака.", answer: "I have a dog", extra: ["has", "am"] },
      { type: "build", hint: "У них есть машина.", answer: "They have a car", extra: ["has"] },
      { type: "type", prompt: "My brother ___ a new phone.", hint: "У моего брата новый телефон.", answer: "has", full: ["My brother has a new phone.", "У моего брата новый телефон."] },
    ],
  },
];
