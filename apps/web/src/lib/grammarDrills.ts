// Practice questions for the grammar steps on the path. Keyed by the grammar
// topic title from data/grammar.js (the rule itself is shown from there).
// Each question: a sentence with a gap, 4 options, index of the right one.

export interface DrillQ {
  q: string;
  options: string[];
  answer: number;
}

export const GRAMMAR_DRILLS: Record<string, DrillQ[]> = {
  "Present Simple": [
    { q: "She ___ in a bank.", options: ["work", "works", "working", "is work"], answer: 1 },
    { q: "They ___ coffee in the morning.", options: ["drinks", "drinking", "drink", "is drink"], answer: 2 },
    { q: "___ he play football?", options: ["Do", "Is", "Does", "Are"], answer: 2 },
    { q: "I ___ like spicy food.", options: ["doesn't", "don't", "not", "isn't"], answer: 1 },
    { q: "The train ___ at 9:00 every day.", options: ["leave", "is leaving", "leaves", "left"], answer: 2 },
  ],
  "Articles: a / an / the": [
    { q: "She is ___ engineer.", options: ["a", "an", "the", "—"], answer: 1 },
    { q: "I saw a dog. ___ dog was black.", options: ["A", "An", "The", "—"], answer: 2 },
    { q: "He has ___ new car.", options: ["a", "an", "the", "—"], answer: 0 },
    { q: "I love ___ music.", options: ["a", "an", "the", "—"], answer: 3 },
    { q: "Can you close ___ window, please?", options: ["a", "an", "the", "—"], answer: 2 },
  ],
  "Plural nouns": [
    { q: "One box, two ___.", options: ["boxs", "boxes", "boxies", "box"], answer: 1 },
    { q: "One city, three ___.", options: ["citys", "cityes", "cities", "city"], answer: 2 },
    { q: "One child, two ___.", options: ["childs", "childes", "children", "childrens"], answer: 2 },
    { q: "One foot, two ___.", options: ["foots", "feet", "feets", "footes"], answer: 1 },
    { q: "One man, five ___.", options: ["mans", "men", "mens", "manes"], answer: 1 },
  ],
  "Present Continuous": [
    { q: "Look! It ___ .", options: ["rains", "is raining", "rain", "raining"], answer: 1 },
    { q: "I ___ a book right now.", options: ["read", "am reading", "reads", "reading"], answer: 1 },
    { q: "They ___ TV at the moment.", options: ["are watching", "watch", "is watching", "watching"], answer: 0 },
    { q: "___ you listening to me?", options: ["Do", "Are", "Is", "Does"], answer: 1 },
    { q: "She ___ working today.", options: ["isn't", "doesn't", "don't", "aren't"], answer: 0 },
  ],
  "Past Simple": [
    { q: "We ___ a film yesterday.", options: ["watch", "watched", "watching", "have watched"], answer: 1 },
    { q: "She ___ to Paris last year.", options: ["go", "goes", "went", "gone"], answer: 2 },
    { q: "___ you see him last night?", options: ["Do", "Did", "Was", "Have"], answer: 1 },
    { q: "I ___ go to school on Monday.", options: ["didn't", "don't", "wasn't", "haven't"], answer: 0 },
    { q: "He ___ a new phone two days ago.", options: ["buyed", "bought", "buys", "has bought"], answer: 1 },
  ],
  "Comparatives & superlatives": [
    { q: "This street is ___ than mine.", options: ["quiet", "quieter", "quietest", "more quiet than"], answer: 1 },
    { q: "It's the ___ hotel in town.", options: ["expensivest", "more expensive", "most expensive", "expensive"], answer: 2 },
    { q: "Today is ___ than yesterday.", options: ["good", "better", "best", "gooder"], answer: 1 },
    { q: "She is the ___ student in the class.", options: ["tall", "taller", "tallest", "most tall"], answer: 2 },
    { q: "This exam was ___ than the last one.", options: ["badder", "worst", "worse", "more bad"], answer: 2 },
  ],
  "Countable & uncountable": [
    { q: "How ___ apples do we need?", options: ["much", "many", "a little", "any"], answer: 1 },
    { q: "There isn't ___ time left.", options: ["many", "much", "a few", "few"], answer: 1 },
    { q: "Is there ___ milk in the fridge?", options: ["any", "many", "a", "few"], answer: 0 },
    { q: "She gave me some good ___ .", options: ["advices", "advice", "an advice", "advicees"], answer: 1 },
    { q: "I have ___ friends in London.", options: ["a little", "much", "a few", "a"], answer: 2 },
  ],
  "Word order & adverbs of frequency": [
    { q: "Choose the correct sentence:", options: ["I get usually up at seven.", "I usually get up at seven.", "Usually I get at seven up.", "I get up usually at seven."], answer: 1 },
    { q: "He is ___ late.", options: ["never", "nevers", "not never", "no"], answer: 0 },
    { q: "Choose the correct sentence:", options: ["She speaks three languages.", "She three languages speaks.", "Speaks she three languages.", "Three languages she speak."], answer: 0 },
    { q: "We ___ go to the cinema on Fridays.", options: ["often", "oftens", "are often", "do often"], answer: 0 },
    { q: "Choose the correct sentence:", options: ["They always are happy.", "They are always happy.", "Always they are happy are.", "They are happy always are."], answer: 1 },
  ],
  "Future Simple (will)": [
    { q: "I think it ___ tomorrow.", options: ["rains", "will rain", "is raining", "rained"], answer: 1 },
    { q: "I'm tired — I ___ go to bed.", options: ["will", "am", "do", "would to"], answer: 0 },
    { q: "Don't worry, I ___ tell anyone.", options: ["won't", "don't", "am not", "willn't"], answer: 0 },
    { q: "___ you help me with this box?", options: ["Do", "Will", "Are", "Did"], answer: 1 },
    { q: "She ___ be 20 next year.", options: ["is", "will", "goes", "does"], answer: 1 },
  ],
  "Going to (future plans)": [
    { q: "We ___ buy a new car next month.", options: ["are going to", "going to", "will to", "go to"], answer: 0 },
    { q: "Look at those clouds — it ___ rain.", options: ["is going to", "goes to", "will to", "going"], answer: 0 },
    { q: "She ___ to study medicine.", options: ["is going", "going", "goes", "will going"], answer: 0 },
    { q: "___ you going to call him?", options: ["Do", "Are", "Will", "Is"], answer: 1 },
    { q: "I'm not going ___ that film.", options: ["watch", "to watch", "watching", "watched"], answer: 1 },
  ],
  "Present Perfect": [
    { q: "I ___ Japan twice.", options: ["visited", "have visited", "has visited", "visit"], answer: 1 },
    { q: "She ___ her keys, so she can't get in.", options: ["has lost", "have lost", "lost", "loses"], answer: 0 },
    { q: "We have lived here ___ 2015.", options: ["for", "since", "from", "ago"], answer: 1 },
    { q: "___ you ever been to London?", options: ["Did", "Have", "Has", "Were"], answer: 1 },
    { q: "He hasn't finished ___ .", options: ["already", "yet", "since", "ago"], answer: 1 },
  ],
  "Past Continuous": [
    { q: "At 8 pm I ___ my homework.", options: ["did", "was doing", "were doing", "am doing"], answer: 1 },
    { q: "I was cooking when the phone ___ .", options: ["was ringing", "rang", "rings", "ringed"], answer: 1 },
    { q: "They ___ playing football when it started to rain.", options: ["was", "were", "are", "did"], answer: 1 },
    { q: "What ___ you doing at midnight?", options: ["was", "were", "did", "are"], answer: 1 },
    { q: "While she ___, he cleaned the kitchen.", options: ["slept", "was sleeping", "sleeps", "has slept"], answer: 1 },
  ],
  "First conditional (real future)": [
    { q: "If it rains, we ___ at home.", options: ["stay", "will stay", "would stay", "stayed"], answer: 1 },
    { q: "If you ___ hard, you'll pass.", options: ["study", "will study", "studied", "would study"], answer: 0 },
    { q: "She'll be angry if you ___ late.", options: ["will be", "are", "were", "would be"], answer: 1 },
    { q: "If I see him, I ___ him.", options: ["tell", "told", "will tell", "would tell"], answer: 2 },
    { q: "What will you do if you ___ the job?", options: ["don't get", "won't get", "didn't get", "wouldn't get"], answer: 0 },
  ],
  "Modal verbs basics": [
    { q: "She ___ swim very well.", options: ["can", "cans", "can to", "is can"], answer: 0 },
    { q: "You ___ wear a seatbelt — it's the law.", options: ["can", "must", "might", "would"], answer: 1 },
    { q: "You look ill. You ___ see a doctor.", options: ["should", "must to", "can to", "shoulds"], answer: 0 },
    { q: "___ I open the window?", options: ["Can", "Must", "Do", "Am"], answer: 0 },
    { q: "He can ___ three languages.", options: ["speaks", "to speak", "speak", "speaking"], answer: 2 },
  ],
  "Present Perfect Continuous": [
    { q: "I ___ English for three years.", options: ["have been learning", "am learning", "learned", "have learn"], answer: 0 },
    { q: "It ___ all morning.", options: ["has been raining", "is raining", "rained", "has rain"], answer: 0 },
    { q: "How long ___ you been waiting?", options: ["did", "are", "have", "were"], answer: 2 },
    { q: "She's tired because she ___ all day.", options: ["has been working", "works", "worked", "is work"], answer: 0 },
    { q: "They have been living here ___ ten years.", options: ["since", "for", "from", "during"], answer: 1 },
  ],
  "Past Perfect": [
    { q: "The film ___ before we arrived.", options: ["started", "had started", "has started", "was start"], answer: 1 },
    { q: "She ___ never flown before that trip.", options: ["has", "had", "was", "did"], answer: 1 },
    { q: "When I got home, they ___ dinner.", options: ["had already eaten", "already eat", "have already eaten", "were already ate"], answer: 0 },
    { q: "He was nervous because he ___ an exam before.", options: ["hadn't taken", "didn't take", "hasn't taken", "wasn't taking"], answer: 0 },
    { q: "By the time we got there, the shop ___ .", options: ["closed", "had closed", "has closed", "was closing"], answer: 1 },
  ],
  "Second conditional (unreal present)": [
    { q: "If I had a million dollars, I ___ the world.", options: ["will travel", "would travel", "travel", "traveled"], answer: 1 },
    { q: "If I ___ you, I would apologise.", options: ["am", "was being", "were", "will be"], answer: 2 },
    { q: "She would help if she ___ time.", options: ["has", "had", "will have", "would have"], answer: 1 },
    { q: "What would you do if you ___ the lottery?", options: ["win", "won", "will win", "would win"], answer: 1 },
    { q: "If we lived by the sea, we ___ swim every day.", options: ["would", "will", "did", "are"], answer: 0 },
  ],
};

// Which grammar topics belong to which level on the path (in order).
export const LEVEL_GRAMMAR: Record<string, string[]> = {
  A1: ["Present Simple", "Articles: a / an / the", "Plural nouns"],
  A2: ["Present Continuous", "Past Simple", "Comparatives & superlatives", "Countable & uncountable", "Word order & adverbs of frequency"],
  B1: ["Future Simple (will)", "Going to (future plans)", "Present Perfect", "Past Continuous", "First conditional (real future)", "Modal verbs basics"],
  B2: ["Present Perfect Continuous", "Past Perfect", "Second conditional (unreal present)"],
  C1: [],
  C2: [],
};
