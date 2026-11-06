import { useT } from "../i18n";
import type { BasicsLesson } from "../lib/basics";
import { pronounceWord, speakWord } from "../lib/dict";
import { Prompt } from "./ExerciseRunner";
import Emoji from "./Emoji";

// One word → the real recording (louder and clearer); a phrase → the voice.
// "Hello / Hi" → "Hello, Hi".
export const say = (en: string) => {
  const text = en.replace(/ \/ /g, ", ").replace(/\*\*/g, "");
  if (/^[A-Za-z']+$/.test(text)) pronounceWord(text); else speakWord(text);
};

// The tree: "to be" on top, arrows to am / is / are, and under each the
// words it goes with — the way you'd draw it in a notebook.
function RuleTree({ tree }: { tree: NonNullable<BasicsLesson["tree"]> }) {
  return (
    <div className="rule-tree" style={{ "--n": tree.branches.length } as React.CSSProperties}>
      <button className="rule-tree-root" onClick={() => say(tree.root)}>{tree.root}</button>
      <div className="rule-tree-branches">
        {tree.branches.map((b, i) => (
          <div key={b.word} className="rule-tree-branch" style={{ animationDelay: `${250 + i * 220}ms` }}>
            <span className="rule-tree-arrow" />
            <button className="rule-tree-word" onClick={() => say(b.word)}>{b.word}</button>
            <span className="rule-tree-arrow small" />
            <div className="rule-tree-subjects">
              {b.subjects.map(s => (
                <button key={s} className="rule-tree-subject" onClick={() => say(`${s} ${b.word}`)}>{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Everything a Basics lesson explains: shown before the practice and in the notes.
export default function BasicsRule({ lesson, compact }: { lesson: BasicsLesson; compact?: boolean }) {
  const t = useT();
  return (
    <>
      <p className="basics-intro">{lesson.intro}</p>

      {lesson.tree && <RuleTree tree={lesson.tree} />}

      <div className="basics-table">
        {lesson.pairs.map(([en, ru], i) => (
          <button key={en} className="basics-row" style={{ animationDelay: `${i * 55}ms` }} onClick={() => say(en)}>
            <b>{en}</b>
            <span>{ru}</span>
          </button>
        ))}
      </div>
      {!compact && <p className="basics-tap">{t.basicsTapHint}</p>}

      {lesson.schemes && (
        <div className="basics-schemes">
          <h3 className="basics-sub">{t.basicsSchemes}</h3>
          {lesson.schemes.map((sc, i) => (
            <div key={sc.from} className="basics-scheme" style={{ animationDelay: `${300 + i * 150}ms` }}>
              <span className="basics-scheme-label">{sc.label}</span>
              <button className="basics-scheme-line" onClick={() => say(sc.from)}><Prompt text={sc.from} /></button>
              <span className="basics-scheme-arrow">↓</span>
              <button className="basics-scheme-line to" onClick={() => say(sc.to)}><Prompt text={sc.to} /></button>
              {sc.note && <span className="basics-scheme-note">{sc.note}</span>}
            </div>
          ))}
        </div>
      )}

      {lesson.tip && <div className="basics-tip"><Emoji char="💡" /> <span>{lesson.tip}</span></div>}

      {lesson.examples.length > 0 && (
        <>
          <h3 className="basics-sub">{t.basicsExamples}</h3>
          <div className="basics-examples">
            {lesson.examples.map(([en, ru]) => (
              <button key={en} className="basics-example" onClick={() => say(en)}>
                <Emoji char="🔊" className="basics-sound" />
                <span><b>{en}</b><small>{ru}</small></span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
