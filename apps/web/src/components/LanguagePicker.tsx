import { useT } from "../i18n";
import type { CourseLang } from "../types";

interface Props {
  onPick: (lang: CourseLang) => void;
}

// Full-screen first-launch screen: pick which vocabulary course to study.
// Also reused inside Settings via the same onPick handler.
export default function LanguagePicker({ onPick }: Props) {
  const t = useT();
  const courses: { id: CourseLang; flag: string; name: string; sub: string }[] = [
    { id: "en", flag: "🇬🇧", name: t.courseEnglish, sub: t.courseEnglishSub },
    { id: "de", flag: "🇩🇪", name: t.courseGerman, sub: t.courseGermanSub },
  ];
  return (
    <div className="lang-picker">
      <div className="lang-picker-inner">
        <h1 className="logo lang-picker-logo">WordUp</h1>
        <h2 className="lang-picker-title">{t.chooseCourseTitle}</h2>
        <p className="lang-picker-sub">{t.chooseCourseSub}</p>
        <div className="lang-picker-cards">
          {courses.map(c => (
            <button key={c.id} className="lang-card" onClick={() => onPick(c.id)}>
              <span className="lang-flag">{c.flag}</span>
              <span className="lang-card-mid">
                <span className="lang-card-name">{c.name}</span>
                <span className="lang-card-sub">{c.sub}</span>
              </span>
              <span className="lang-card-go">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
