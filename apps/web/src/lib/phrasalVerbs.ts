import type { Word } from "../types";

// Curated common English phrasal verbs, grouped by their base verb. This is a
// fixed reference (English course only), so it lives in the app rather than the
// database. Each group studies like any deck via a "pv:<Verb>" key that
// wordsForKey()/keyLabel() understand.
export interface PhrasalGroup {
  verb: string;
  items: Word[];
}

const pv = (word: string, def: string, example: string): Word => ({ word, pos: "phrasal verb", def, example });

export const PHRASAL_VERBS: PhrasalGroup[] = [
  {
    verb: "Get",
    items: [
      pv("get up", "to rise from bed / stand up", "I get up at seven every morning."),
      pv("get on", "to board a bus/train / make progress", "How are you getting on at work?"),
      pv("get over", "to recover from", "It took her weeks to get over the flu."),
      pv("get along", "to have a good relationship", "I get along well with my colleagues."),
      pv("get by", "to manage with what you have", "We can get by on very little money."),
      pv("get back", "to return", "I got back home late last night."),
    ],
  },
  {
    verb: "Look",
    items: [
      pv("look after", "to take care of", "Can you look after my dog this weekend?"),
      pv("look for", "to search for", "I'm looking for my keys."),
      pv("look forward to", "to feel excited about a future event", "I look forward to seeing you."),
      pv("look up", "to search for information", "Look up the word in a dictionary."),
      pv("look out", "to be careful", "Look out! There's a car coming."),
      pv("look into", "to investigate", "The police are looking into the case."),
    ],
  },
  {
    verb: "Take",
    items: [
      pv("take off", "to remove / (of a plane) leave the ground", "The plane takes off at noon."),
      pv("take up", "to start a new hobby or activity", "She took up painting last year."),
      pv("take after", "to resemble a family member", "He takes after his father."),
      pv("take over", "to gain control of", "A larger company took over the firm."),
      pv("take back", "to return / to retract", "I take back what I said."),
    ],
  },
  {
    verb: "Put",
    items: [
      pv("put on", "to wear / to switch on", "Put on your coat, it's cold."),
      pv("put off", "to postpone", "They put off the meeting until Friday."),
      pv("put up with", "to tolerate", "I can't put up with the noise."),
      pv("put out", "to extinguish", "Firefighters put out the fire."),
      pv("put away", "to store in its place", "Put away your toys, please."),
    ],
  },
  {
    verb: "Come",
    items: [
      pv("come across", "to find by chance", "I came across an old photo."),
      pv("come up with", "to think of an idea", "She came up with a great plan."),
      pv("come back", "to return", "Come back soon!"),
      pv("come over", "to visit someone's home", "Come over for dinner tonight."),
      pv("come along", "to make progress / to accompany", "The project is coming along nicely."),
    ],
  },
  {
    verb: "Go",
    items: [
      pv("go on", "to continue", "Please go on with your story."),
      pv("go off", "to explode / (of an alarm) ring", "My alarm went off at six."),
      pv("go over", "to review carefully", "Let's go over the plan again."),
      pv("go out", "to leave home for an activity", "We went out for dinner."),
      pv("go through", "to experience / to examine", "She went through a hard time."),
    ],
  },
  {
    verb: "Turn",
    items: [
      pv("turn on", "to start a device", "Turn on the light, please."),
      pv("turn off", "to stop a device", "Don't forget to turn off the TV."),
      pv("turn up", "to arrive / to increase", "He turned up an hour late."),
      pv("turn down", "to refuse / to lower", "She turned down the job offer."),
      pv("turn into", "to become", "The caterpillar turned into a butterfly."),
    ],
  },
  {
    verb: "Break",
    items: [
      pv("break down", "to stop working / to lose control emotionally", "My car broke down on the way."),
      pv("break up", "to end a relationship", "They broke up after two years."),
      pv("break in", "to enter by force", "Thieves broke in through the window."),
      pv("break out", "to begin suddenly", "A fire broke out in the kitchen."),
    ],
  },
  {
    verb: "Give",
    items: [
      pv("give up", "to stop trying / to quit", "Don't give up on your dreams."),
      pv("give in", "to surrender / to yield", "He finally gave in to their demands."),
      pv("give back", "to return", "Please give back my pen."),
      pv("give away", "to donate / to reveal", "She gave away all her old clothes."),
      pv("give out", "to distribute", "They gave out free samples."),
    ],
  },
  {
    verb: "Run",
    items: [
      pv("run out of", "to have no more of", "We ran out of milk."),
      pv("run into", "to meet by chance", "I ran into an old friend today."),
      pv("run away", "to escape / flee", "The dog ran away from home."),
      pv("run over", "to hit with a vehicle", "A car nearly ran over the cat."),
    ],
  },
];

export const PV_PREFIX = "pv:";
export function isPhrasalKey(key: string): boolean {
  return key.startsWith(PV_PREFIX);
}
export function pvKey(verb: string): string {
  return PV_PREFIX + verb;
}
export function phrasalWordsForKey(key: string): Word[] {
  const verb = key.slice(PV_PREFIX.length);
  return PHRASAL_VERBS.find(g => g.verb === verb)?.items ?? [];
}
export function phrasalLabelForKey(key: string): string {
  return `${key.slice(PV_PREFIX.length)} — phrasal verbs`;
}
