import { shuffle } from "./groups";

// Placement test question bank, written by hand. Each level mixes:
//   gap       — grammar: fill the gap
//   correct   — which sentence has no mistakes?
//   translate — the right Russian translation of a sentence
//   meaning   — what a phrase / phrasal verb / idiom means
// The right option is always first here; options are shuffled when asked.

export type PlacementKind = "gap" | "correct" | "translate" | "meaning";

export interface BankQ {
  kind: PlacementKind;
  prompt: string;     // empty for "correct" (the options are the sentences)
  options: string[];  // options[0] is right
}

export interface PlacementQ {
  level: string;
  kind: PlacementKind;
  prompt: string;
  options: string[];
  answer: number;
}

const g = (prompt: string, ...options: string[]): BankQ => ({ kind: "gap", prompt, options });
const c = (...options: string[]): BankQ => ({ kind: "correct", prompt: "", options });
const tr = (prompt: string, ...options: string[]): BankQ => ({ kind: "translate", prompt, options });
const m = (prompt: string, ...options: string[]): BankQ => ({ kind: "meaning", prompt, options });

export const BANK: Record<string, BankQ[]> = {
  A1: [
    g("She ___ a teacher.", "is", "am", "are", "be"),
    g("I ___ two brothers.", "have", "has", "am", "having"),
    g("___ you like coffee?", "Do", "Does", "Are", "Is"),
    g("There ___ three cats in the garden.", "are", "is", "be", "am"),
    c("He lives in London.", "He live in London.", "He living in London.", "He is live in London."),
    c("My sister doesn't work.", "My sister don't work.", "My sister not works.", "My sister doesn't works."),
    tr("Where is the station?", "Где вокзал?", "Где был вокзал?", "Когда вокзал?", "Это вокзал?"),
    tr("I don't like milk.", "Я не люблю молоко.", "Я люблю молоко.", "Мне не понравилось молоко.", "Я не пью молоко."),
    m("What time is it?", "Который час?", "Сколько это стоит?", "Как долго ждать?", "Какой сегодня день?"),
  ],
  A2: [
    g("Yesterday we ___ to the cinema.", "went", "go", "gone", "were go"),
    g("She is ___ than her sister.", "taller", "more tall", "tallest", "the tallest"),
    g("Look! It ___.", "is raining", "rains", "rained", "rain"),
    g("How ___ money do you have?", "much", "many", "lot", "few"),
    c("I didn't see him yesterday.", "I didn't saw him yesterday.", "I not saw him yesterday.", "I don't saw him yesterday."),
    c("She usually gets up at seven.", "She gets usually up at seven.", "She usually get up at seven.", "Usually she get up at seven."),
    tr("We have to leave now.", "Нам нужно уходить сейчас.", "Мы уходим сейчас.", "Мы ушли только что.", "Мы можем уйти сейчас."),
    m("Can you turn off the light?", "Можешь выключить свет?", "Можешь включить свет?", "Можешь повернуть лампу?", "Можешь принести фонарик?"),
    m("I'm looking for my keys.", "Я ищу свои ключи.", "Я смотрю на свои ключи.", "Я нашёл свои ключи.", "Я потерял свои ключи вчера."),
  ],
  B1: [
    g("I ___ in this city since 2019.", "have lived", "live", "am living", "lived"),
    g("If it rains tomorrow, we ___ at home.", "will stay", "would stay", "stayed", "are staying to"),
    g("While I ___ dinner, the phone rang.", "was cooking", "cooked", "am cooking", "have cooked"),
    g("You ___ smoke here — it's not allowed.", "mustn't", "don't have to", "needn't", "may"),
    c("I've already finished my homework.", "I've already finish my homework.", "I already have finish my homework.", "I've finished my homework already yesterday."),
    c("She asked me where I lived.", "She asked me where did I live.", "She asked me where do I live.", "She asked me where I am live."),
    tr("I haven't seen him for ages.", "Я не видел его целую вечность.", "Я никогда его не видел.", "Я не увижу его ещё долго.", "Я не видел его в его возрасте."),
    m("It's up to you.", "Решать тебе.", "Это над тобой.", "Это зависит от погоды.", "Ты обязан это сделать."),
    m("She gave up smoking.", "Она бросила курить.", "Она начала курить.", "Она отдала сигареты.", "Она стала курить больше."),
  ],
  B2: [
    g("If I ___ more time, I would travel more.", "had", "have", "would have", "will have"),
    g("By the time we arrived, the film ___.", "had already started", "already started", "has already started", "was already start"),
    g("I'm not used to ___ up so early.", "getting", "get", "got", "have got"),
    g("She's been working here ___ three years.", "for", "since", "during", "from"),
    c("I wish I had studied harder at school.", "I wish I studied harder at school last year.", "I wish I would study harder at school last year.", "I wish I have studied harder at school."),
    c("The report must be finished by Friday.", "The report must finished by Friday.", "The report must be finish by Friday.", "The report must being finished by Friday."),
    tr("You should have told me earlier.", "Тебе следовало сказать мне раньше.", "Ты должен сказать мне раньше.", "Ты сказал мне раньше.", "Тебе стоит сказать мне позже."),
    m("We ran out of milk.", "У нас закончилось молоко.", "Мы выбежали за молоком.", "Мы пролили молоко.", "Мы купили много молока."),
    m("I can't put up with this noise.", "Я не могу терпеть этот шум.", "Я не могу убрать этот шум.", "Я не могу сделать шум громче.", "Я не слышу этот шум."),
  ],
  C1: [
    g("Had I known about the problem, I ___ you.", "would have helped", "would help", "had helped", "will have helped"),
    g("Not only ___ late, but he also forgot the tickets.", "was he", "he was", "he is", "did he be"),
    g("It's high time we ___ a decision.", "made", "make", "will make", "have made"),
    g("She denied ___ the money.", "taking", "to take", "take", "to have take"),
    c("Hardly had we sat down when the lights went out.", "Hardly we had sat down when the lights went out.", "Hardly had we sat down than the lights went out.", "Hardly did we sat down when the lights went out."),
    c("The more you practise, the better you get.", "The more you practise, better you get.", "More you practise, the better you get.", "The more you practise, the more better you get."),
    tr("He is bound to find out sooner or later.", "Он рано или поздно обязательно узнает.", "Он связан и узнает позже.", "Он должен был узнать раньше.", "Он вряд ли когда-нибудь узнает."),
    m("Let's not beat around the bush.", "Давай говорить прямо.", "Давай не будем гулять по кустам.", "Давай не будем спешить.", "Давай не будем ссориться."),
    m("The proposal was met with scepticism.", "К предложению отнеслись скептически.", "Предложение встретили с восторгом.", "Предложение приняли без вопросов.", "Предложение отложили на потом."),
  ],
  C2: [
    g("She insisted that he ___ present at the meeting.", "be", "is", "was", "will be"),
    g("I'd rather you ___ anyone about this yet.", "didn't tell", "don't tell", "won't tell", "not to tell"),
    g("___ the circumstances, the decision was understandable.", "Given", "Giving", "Having given", "To give"),
    g("Scarcely ___ the house when it started to pour.", "had I left", "I had left", "did I leave", "I left"),
    c("Little did he realise what was about to happen.", "Little he realised what was about to happen.", "Little did he realised what was about to happen.", "Little realised he what was about to happen."),
    c("Were it not for your help, I would have failed.", "Was it not for your help, I would have failed.", "Were it not for your help, I would fail yesterday.", "If it were not for your help, I would failed."),
    tr("I couldn't care less what they think.", "Мне совершенно всё равно, что они думают.", "Мне не очень важно, что они думают.", "Я не могу перестать думать о них.", "Мне стоит меньше думать о них."),
    m("She has a chip on her shoulder.", "Она обижена и держится с вызовом.", "У неё травма плеча.", "Ей во всём везёт.", "Она за всё отвечает."),
    m("The plan fell through.", "План провалился.", "План перевыполнили.", "План приняли единогласно.", "План отложили на потом."),
    m("He was taken aback by her answer.", "Её ответ застал его врасплох.", "Он отступил после её ответа.", "Он вернул ей ответ.", "Он согласился с её ответом."),
  ],
};

/** Levels the test walks through, easiest first. */
export const PLACEMENT_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const PER_LEVEL = 5;
// 0–1 mistakes on a level: it's yours; 2: you're between levels; 3: too hard.
export const LEVEL_PARTIAL = 2;
export const LEVEL_FAIL = 3;
// slips add up: the 4th mistake in the whole test ends it
export const TOTAL_WRONG_LIMIT = 4;

// 6 questions for a level: one of each kind, the rest grammar gaps / random.
export function placementQuestions(level: string): PlacementQ[] {
  const bank = BANK[level] ?? [];
  const picked: BankQ[] = [];
  for (const kind of ["correct", "translate", "meaning"] as PlacementKind[]) {
    const one = shuffle(bank.filter(q => q.kind === kind))[0];
    if (one) picked.push(one);
  }
  for (const q of shuffle(bank.filter(q => !picked.includes(q)))) {
    if (picked.length >= PER_LEVEL) break;
    picked.push(q);
  }
  return shuffle(picked).map(q => {
    const options = shuffle([...q.options]);
    return { level, kind: q.kind, prompt: q.prompt, options, answer: options.indexOf(q.options[0]) };
  });
}
