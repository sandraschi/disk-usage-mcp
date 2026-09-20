import { useEffect, useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import { getSkillContent, listSkills, type SkillRef } from "../lib/api";

export default function Skills() {
  const [skills, setSkills] = useState<SkillRef[]>([]);
  const [active, setActive] = useState<string>("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listSkills()
      .then((data) => {
        setSkills(data.skills);
        if (data.skills.length > 0) setActive(data.skills[0].name);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    setContent("");
    getSkillContent(active)
      .then((data) => setContent(data.content ?? data.error ?? ""))
      .catch((e: unknown) => setContent(e instanceof Error ? e.message : "Failed"));
  }, [active]);

  return (
    <div data-testid="skills-page" className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Skills</h2>

      {loading && (
        <div className="flex items-center py-12 text-zinc-300" data-testid="skills-loading">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading skills...
        </div>
      )}
      {error && (
        <div className="text-center py-12" data-testid="skills-error">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      {!loading && !error && skills.length === 0 && (
        <p className="text-center py-12 text-zinc-400" data-testid="skills-empty">No skills registered.</p>
      )}

      {skills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ul className="space-y-2" data-testid="skills-list">
            {skills.map((s) => (
              <li key={s.name}>
                <button
                  onClick={() => setActive(s.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    active === s.name ? "bg-amber-500/10 text-amber-300" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <BookOpen className="h-4 w-4 flex-shrink-0" />
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
          <pre className="md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 overflow-auto max-h-[60vh] whitespace-pre-wrap" data-testid="skills-content">
            {content || "Loading..."}
          </pre>
        </div>
      )}
    </div>
  );
}
