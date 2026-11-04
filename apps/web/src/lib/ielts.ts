import type { Word } from "../types";

// IELTS preparation: topic vocabulary that comes up again and again in
// Writing Task 2 and Speaking, plus Task 1 graph language and linking words.
// Fixed reference content for the English course (like phrasal verbs), so it
// lives in the app. Each topic studies as a deck via an "ielts:<Topic>" key.
// NOTE: keep in sync with apps/mobile/src/ielts.ts.

export interface IeltsTopic {
  topic: string;
  emoji: string;
  hint: string; // where it helps in the exam
  items: Word[];
}

const w = (word: string, pos: string, def: string, example: string): Word => ({ word, pos, def, example });

export const IELTS_TOPICS: IeltsTopic[] = [
  {
    topic: "Environment", emoji: "🌍", hint: "Writing Task 2 · Speaking",
    items: [
      w("deforestation", "noun", "the cutting down of large areas of forest", "Deforestation is destroying the habitats of countless species."),
      w("emissions", "noun", "gases released into the air, e.g. by cars or factories", "Governments must cut carbon emissions drastically."),
      w("renewable", "adj", "(of energy) coming from sources that do not run out", "Renewable energy such as wind and solar is becoming cheaper."),
      w("sustainable", "adj", "able to continue without harming the environment", "We need a more sustainable approach to farming."),
      w("biodiversity", "noun", "the variety of plant and animal life in an area", "Pollution poses a serious threat to biodiversity."),
      w("depletion", "noun", "the reduction of a resource until little is left", "The depletion of fossil fuels is a growing concern."),
      w("mitigate", "verb", "to make something bad less severe", "Planting trees can help mitigate the effects of climate change."),
      w("landfill", "noun", "a place where waste is buried under the ground", "Most plastic waste ends up in landfill."),
      w("carbon footprint", "noun", "the amount of CO₂ a person or activity produces", "Flying less is the easiest way to reduce your carbon footprint."),
      w("detrimental", "adj", "causing harm or damage", "Car fumes have a detrimental effect on air quality."),
      w("conservation", "noun", "the protection of nature and natural resources", "Wildlife conservation should be funded by the state."),
      w("irreversible", "adj", "impossible to change back", "Some damage to the ozone layer may be irreversible."),
    ],
  },
  {
    topic: "Education", emoji: "🎓", hint: "Writing Task 2 · Speaking Part 3",
    items: [
      w("curriculum", "noun", "the subjects taught in a school or course", "Coding should be part of the national curriculum."),
      w("tuition fees", "noun", "money paid for being taught, especially at university", "High tuition fees discourage many students from applying."),
      w("vocational", "adj", "relating to skills needed for a particular job", "Vocational training prepares young people for the job market."),
      w("rote learning", "noun", "memorising things by repetition without understanding", "Rote learning does little to develop critical thinking."),
      w("literacy", "noun", "the ability to read and write", "Adult literacy rates have risen sharply in the last decade."),
      w("compulsory", "adj", "required by law or a rule", "Education is compulsory until the age of sixteen."),
      w("academic performance", "noun", "how well a student does at school", "Lack of sleep can harm academic performance."),
      w("distance learning", "noun", "studying from home, usually online", "Distance learning gives working adults more flexibility."),
      w("critical thinking", "noun", "the ability to analyse information and judge it", "Universities aim to foster critical thinking."),
      w("well-rounded", "adj", "having a wide range of skills and experience", "Sport and art help children become well-rounded individuals."),
      w("mentor", "noun", "an experienced person who advises someone less experienced", "Every new teacher is assigned a mentor."),
    ],
  },
  {
    topic: "Technology", emoji: "💻", hint: "Writing Task 2 · Speaking",
    items: [
      w("automation", "noun", "the use of machines instead of people to do work", "Automation may replace many low-skilled jobs."),
      w("cutting-edge", "adj", "the newest and most advanced", "The lab uses cutting-edge equipment."),
      w("obsolete", "adj", "no longer used because something newer exists", "Fax machines have become largely obsolete."),
      w("innovation", "noun", "a new idea, method or invention", "Innovation drives economic growth."),
      w("privacy", "noun", "the right to keep personal information private", "Social media raises serious privacy concerns."),
      w("screen time", "noun", "time spent looking at phones, computers or TVs", "Parents should limit their children's screen time."),
      w("digital divide", "noun", "the gap between people with and without internet access", "The digital divide widened during the pandemic."),
      w("breakthrough", "noun", "an important new discovery", "The vaccine was a major medical breakthrough."),
      w("reliance", "noun", "the state of depending on something", "Our reliance on smartphones is growing every year."),
      w("cybercrime", "noun", "crime committed using computers or the internet", "Banks invest heavily to fight cybercrime."),
      w("artificial intelligence", "noun", "computer systems that can perform tasks needing human intelligence", "Artificial intelligence is transforming healthcare."),
    ],
  },
  {
    topic: "Health", emoji: "🩺", hint: "Writing Task 2 · Speaking",
    items: [
      w("sedentary", "adj", "involving a lot of sitting and little exercise", "A sedentary lifestyle increases the risk of heart disease."),
      w("obesity", "noun", "the condition of being very overweight", "Childhood obesity has doubled in twenty years."),
      w("life expectancy", "noun", "the average number of years a person is expected to live", "Life expectancy has risen thanks to better healthcare."),
      w("preventive", "adj", "intended to stop something bad happening", "Preventive medicine is cheaper than treatment."),
      w("well-being", "noun", "the state of being healthy and happy", "Exercise improves both physical and mental well-being."),
      w("epidemic", "noun", "a fast spread of a disease among many people", "Smoking-related illness has reached epidemic levels."),
      w("balanced diet", "noun", "food containing the right amounts of all nutrients", "A balanced diet includes plenty of fruit and vegetables."),
      w("public health", "noun", "the health of the population as a whole", "Taxes on sugar could benefit public health."),
      w("chronic", "adj", "(of an illness) lasting a long time", "Millions live with chronic back pain."),
      w("access to healthcare", "noun", "being able to get medical treatment when needed", "Rural areas often lack access to healthcare."),
    ],
  },
  {
    topic: "Society", emoji: "🏛️", hint: "Writing Task 2 · Speaking Part 3",
    items: [
      w("inequality", "noun", "an unfair difference between groups of people", "Income inequality has widened in many countries."),
      w("urbanisation", "noun", "the movement of people from the countryside to cities", "Rapid urbanisation puts pressure on housing."),
      w("ageing population", "noun", "a population with a rising share of older people", "An ageing population means higher pension costs."),
      w("welfare", "noun", "help given by the state to people in need", "The welfare system supports the unemployed."),
      w("legislation", "noun", "laws, or the process of making them", "New legislation bans smoking in public places."),
      w("crime rate", "noun", "the number of crimes in an area over a period", "The crime rate has fallen for five years in a row."),
      w("rehabilitation", "noun", "helping someone return to normal life, e.g. after prison", "Prisons should focus on rehabilitation, not just punishment."),
      w("community", "noun", "the people living in one area or sharing interests", "Volunteering strengthens the local community."),
      w("allocate", "verb", "to give money or resources for a purpose", "The government should allocate more funds to schools."),
      w("deterrent", "noun", "something that discourages people from doing something", "Heavy fines act as a deterrent to speeding."),
    ],
  },
  {
    topic: "Work & Economy", emoji: "💼", hint: "Writing Task 2 · Speaking",
    items: [
      w("unemployment", "noun", "the state of not having a job", "Youth unemployment remains a serious problem."),
      w("work-life balance", "noun", "the balance between time at work and personal life", "Remote work can improve work-life balance."),
      w("job security", "noun", "the likelihood of keeping your job", "Many young people value job security over salary."),
      w("productivity", "noun", "the rate at which work is done", "A four-day week could actually raise productivity."),
      w("entrepreneur", "noun", "a person who starts their own business", "The government offers loans to young entrepreneurs."),
      w("income", "noun", "money received from work or investments", "Household income has stagnated."),
      w("consumerism", "noun", "the idea that buying more goods is good", "Advertising fuels consumerism."),
      w("globalisation", "noun", "the growing connection of economies and cultures worldwide", "Globalisation has created jobs but also inequality."),
      w("recession", "noun", "a period when the economy shrinks", "Many firms closed during the recession."),
      w("labour market", "noun", "the supply of and demand for workers", "Graduates face a competitive labour market."),
    ],
  },
  {
    topic: "Culture & Media", emoji: "💬", hint: "Writing Task 2 · Speaking",
    items: [
      w("cultural identity", "noun", "the feeling of belonging to a culture", "Tourism can threaten a nation's cultural identity."),
      w("heritage", "noun", "traditions and buildings passed down from the past", "Historic sites are part of our national heritage."),
      w("mass media", "noun", "TV, newspapers and the internet that reach many people", "The mass media shapes public opinion."),
      w("censorship", "noun", "the control of what people can read, see or say", "Online censorship limits free speech."),
      w("stereotype", "noun", "a fixed, oversimplified idea about a group", "Films often reinforce gender stereotypes."),
      w("multicultural", "adj", "including people of many cultures", "London is a vibrant multicultural city."),
      w("influential", "adj", "having a strong effect on people's ideas", "Celebrities are highly influential among teenagers."),
      w("misinformation", "noun", "false information spread, often unintentionally", "Social media allows misinformation to spread quickly."),
      w("preserve", "verb", "to keep something in its original state", "Governments should preserve minority languages."),
      w("assimilate", "verb", "to become part of a new culture", "Immigrants may find it hard to assimilate."),
    ],
  },
  {
    topic: "Graphs (Task 1)", emoji: "📈", hint: "Writing Task 1 — describing charts",
    items: [
      w("surge", "verb/noun", "to increase suddenly and strongly", "Sales surged to 5 million in 2020."),
      w("plummet", "verb", "to fall very quickly", "The number of visitors plummeted in winter."),
      w("fluctuate", "verb", "to go up and down irregularly", "Prices fluctuated between $20 and $30."),
      w("plateau", "verb/noun", "to stay at the same level after rising", "Unemployment plateaued at around 6%."),
      w("peak", "verb/noun", "to reach the highest point", "Energy use peaked at 8 p.m."),
      w("steady", "adj", "changing gradually and regularly", "There was a steady rise in car ownership."),
      w("marginal", "adj", "very small", "There was only a marginal decrease in 2015."),
      w("account for", "verb", "to form a particular part of a total", "Coal accounted for 40% of electricity production."),
      w("respectively", "adverb", "in the same order as the things already mentioned", "Men and women spent 3 and 5 hours respectively."),
      w("overall", "adverb", "considering the whole picture — used to start a summary", "Overall, renewable energy grew the fastest."),
      w("dip", "noun/verb", "a small, short fall", "After a slight dip in May, figures recovered."),
      w("double", "verb", "to become twice as large", "The population doubled over the period."),
    ],
  },
  {
    topic: "Linking words", emoji: "🧩", hint: "Coherence & cohesion score",
    items: [
      w("furthermore", "linker", "in addition (formal)", "Furthermore, public transport reduces pollution."),
      w("nevertheless", "linker", "despite what has just been said", "The plan is expensive. Nevertheless, it is worth it."),
      w("consequently", "linker", "as a result", "Rents rose; consequently, many people moved out."),
      w("whereas", "linker", "used to compare two contrasting facts", "Some prefer cities, whereas others like the countryside."),
      w("in contrast", "linker", "showing a difference from what came before", "In contrast, the number of cyclists fell."),
      w("for instance", "linker", "used to give an example", "Many jobs, for instance cashiers, may disappear."),
      w("to a certain extent", "phrase", "partly, not completely", "To a certain extent, I agree with this view."),
      w("it is widely believed that", "phrase", "many people think that", "It is widely believed that exercise reduces stress."),
      w("on the other hand", "linker", "introducing the opposite point", "On the other hand, online shopping hurts local shops."),
      w("in conclusion", "linker", "used to start the final paragraph", "In conclusion, the advantages outweigh the drawbacks."),
      w("thereby", "adverb", "as a result of this action", "Cities banned cars, thereby reducing pollution."),
      w("albeit", "linker", "although (formal, before a phrase)", "The policy worked, albeit slowly."),
    ],
  },
  {
    topic: "Opinion & Speaking", emoji: "💡", hint: "Task 2 opinion · Speaking fluency",
    items: [
      w("from my perspective", "phrase", "in my opinion", "From my perspective, schools should teach finance."),
      w("I'm inclined to think", "phrase", "I tend to believe (softer opinion)", "I'm inclined to think that cities are safer now."),
      w("outweigh", "verb", "to be more important than", "The benefits clearly outweigh the drawbacks."),
      w("drawback", "noun", "a disadvantage", "The main drawback of remote work is isolation."),
      w("a double-edged sword", "idiom", "something with both good and bad effects", "Social media is a double-edged sword."),
      w("that's a tricky question", "phrase", "buys thinking time in Speaking", "That's a tricky question, but I'd say yes."),
      w("by and large", "phrase", "generally, on the whole", "By and large, people are more health-conscious now."),
      w("it depends on", "phrase", "used to show a nuanced answer", "It depends on the age of the child."),
      w("I couldn't agree more", "phrase", "I completely agree", "I couldn't agree more with that idea."),
      w("pros and cons", "noun", "advantages and disadvantages", "There are pros and cons to living abroad."),
    ],
  },
];

export const IELTS_PREFIX = "ielts:";
export function isIeltsKey(key: string): boolean {
  return key.startsWith(IELTS_PREFIX);
}
export function ieltsKey(topic: string): string {
  return IELTS_PREFIX + topic;
}
export function ieltsWordsForKey(key: string): Word[] {
  const t = key.slice(IELTS_PREFIX.length);
  return IELTS_TOPICS.find(x => x.topic === t)?.items ?? [];
}
export function ieltsLabelForKey(key: string): string {
  return "IELTS · " + key.slice(IELTS_PREFIX.length);
}
export function ieltsEmojiForKey(key: string): string {
  const t = key.slice(IELTS_PREFIX.length);
  return IELTS_TOPICS.find(x => x.topic === t)?.emoji ?? "🎓";
}
