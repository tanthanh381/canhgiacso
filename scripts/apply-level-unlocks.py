from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Expected patch anchor not found in {path}: {old[:80]!r}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "app/page.tsx",
    'import { supabase } from "./supabase";\n',
    'import { supabase } from "./supabase";\nimport { difficultyOrder, getLevelProgress, getUnlockedDifficulties } from "./progression";\n',
)

replace_once(
    "app/page.tsx",
    '''  const selected = scenarios.find((item) => item.id === selectedId) ?? scenarios[0];
  const completedIds = new Set(results.map((result) => result.scenarioId));
  const safeIds = new Set(results.filter((result) => result.correct).map((result) => result.scenarioId));
  const evidence = scenarios.filter((item) => safeIds.has(item.id));
''',
    '''  const completedIds = new Set(results.map((result) => result.scenarioId));
  const safeIds = new Set(results.filter((result) => result.correct).map((result) => result.scenarioId));
  const unlockedDifficulties = getUnlockedDifficulties(scenarios, completedIds);
  const availableScenarios = scenarios.filter((item) => unlockedDifficulties.has(item.difficulty));
  const selectedCandidate = scenarios.find((item) => item.id === selectedId);
  const selected = selectedCandidate && unlockedDifficulties.has(selectedCandidate.difficulty)
    ? selectedCandidate
    : availableScenarios[0] ?? scenarios[0];
  const levelProgress = getLevelProgress(scenarios, completedIds, unlockedDifficulties);
  const incompleteUnlockedScenarios = availableScenarios.filter((item) => !completedIds.has(item.id));
  const randomCandidates = incompleteUnlockedScenarios.length ? incompleteUnlockedScenarios : availableScenarios;
  const evidence = scenarios.filter((item) => safeIds.has(item.id));
''',
)

replace_once(
    "app/page.tsx",
    '''  function chooseScenario(id: number) {
    setSelectedId(id);
    setAnswer(null);
    navigateTo("game");
    if (window.innerWidth < 1050) document.querySelector(".stage")?.scrollIntoView({ behavior: "smooth" });
  }
''',
    '''  function chooseScenario(id: number) {
    const target = scenarios.find((item) => item.id === id);
    if (!target) return;
    if (!unlockedDifficulties.has(target.difficulty)) {
      const targetIndex = difficultyOrder.indexOf(target.difficulty);
      const blockingDifficulty = difficultyOrder.slice(0, targetIndex).find((level) =>
        scenarios.some((item) => item.difficulty === level && !completedIds.has(item.id)),
      ) ?? difficultyOrder[Math.max(0, targetIndex - 1)];
      const blockingScenarios = scenarios.filter((item) => item.difficulty === blockingDifficulty);
      const blockingCompleted = blockingScenarios.filter((item) => completedIds.has(item.id)).length;
      setDataStatus(`Cấp ${target.difficulty} đang khóa. Hoàn thành ${blockingCompleted}/${blockingScenarios.length} thử thách ${blockingDifficulty} để mở khóa.`);
      window.setTimeout(() => setDataStatus(""), 3200);
      return;
    }
    setSelectedId(id);
    setAnswer(null);
    navigateTo("game");
    if (window.innerWidth < 1050) document.querySelector(".stage")?.scrollIntoView({ behavior: "smooth" });
  }
''',
)

replace_once(
    "app/page.tsx",
    '''  function nextScenario() {
    const remaining = scenarios.find((item) => !completedIds.has(item.id));
    chooseScenario(remaining?.id ?? scenarios[0].id);
  }
''',
    '''  function nextScenario() {
    const remaining = availableScenarios.find((item) => !completedIds.has(item.id));
    const fallback = availableScenarios[0] ?? scenarios[0];
    if (remaining || fallback) chooseScenario((remaining ?? fallback).id);
  }
''',
)

replace_once(
    "app/page.tsx",
    '''            <div className="difficulty-filter" aria-label="Lọc độ khó">
              {difficulties.map((item) => <button key={item} aria-pressed={difficulty === item} className={difficulty === item ? "active" : ""} onClick={() => setDifficulty(item)}>{item}</button>)}
            </div>
            <div className="scenario-list">
              {filtered.map((item) => (
                <button key={item.id} aria-pressed={selected.id === item.id} onClick={() => chooseScenario(item.id)} className={`scenario-item ${selected.id === item.id ? "selected" : ""}`}>
                  <span className={`scenario-number ${safeIds.has(item.id) ? "done" : ""}`}>{safeIds.has(item.id) ? "✓" : String(item.id).padStart(2, "0")}</span>
                  <span className="scenario-copy"><strong>{item.title}</strong><small>{item.channel} · {item.category}</small></span>
                  <span className={`difficulty-dot ${difficultyTone[item.difficulty]}`} title={item.difficulty}></span>
                </button>
              ))}
              {!filtered.length && <p className="empty-state">Không tìm thấy tình huống phù hợp.</p>}
            </div>
            <button className="random-button" onClick={() => chooseScenario(scenarios[Math.floor(Math.random() * scenarios.length)].id)}>⤨ Chọn tình huống ngẫu nhiên</button>
''',
    '''            <div className="difficulty-filter" aria-label="Lọc độ khó">
              {difficulties.map((item) => {
                const locked = item !== "Tất cả" && !unlockedDifficulties.has(item);
                return <button key={item} aria-pressed={difficulty === item} className={difficulty === item ? "active" : ""} disabled={locked} title={locked ? `Hoàn thành cấp thấp hơn để mở ${item}` : undefined} onClick={() => setDifficulty(item)}>{locked ? "🔒 " : ""}{item}</button>;
              })}
            </div>
            <div className="unlock-progress" role="status" aria-live="polite">
              <div><span aria-hidden="true">{levelProgress.nextDifficulty ? "🔓" : "🏆"}</span><strong>Cấp đang mở: {levelProgress.currentDifficulty}</strong></div>
              <small>{levelProgress.nextDifficulty
                ? `Hoàn thành ${levelProgress.completed}/${levelProgress.total} thử thách ${levelProgress.currentDifficulty} để mở ${levelProgress.nextDifficulty}.`
                : "Bạn đã mở khóa toàn bộ cấp độ."}</small>
              <div className="unlock-progress-bar"><i style={{ width: `${levelProgress.total ? Math.round((levelProgress.completed / levelProgress.total) * 100) : 100}%` }} /></div>
            </div>
            <div className="scenario-list">
              {filtered.map((item) => {
                const unlocked = unlockedDifficulties.has(item.difficulty);
                const completed = completedIds.has(item.id);
                const correct = safeIds.has(item.id);
                return (
                  <button key={item.id} aria-pressed={selected.id === item.id} aria-disabled={!unlocked} disabled={!unlocked} onClick={() => chooseScenario(item.id)} className={`scenario-item ${selected.id === item.id ? "selected" : ""} ${!unlocked ? "locked" : ""}`}>
                    <span className={`scenario-number ${correct ? "done" : completed ? "attempted" : !unlocked ? "locked" : ""}`}>{correct ? "✓" : completed ? "•" : !unlocked ? "🔒" : String(item.id).padStart(2, "0")}</span>
                    <span className="scenario-copy"><strong>{item.title}</strong><small>{unlocked ? `${item.channel} · ${item.category}` : `Cấp ${item.difficulty} · Hoàn thành cấp thấp hơn để mở khóa`}</small></span>
                    <span className={`difficulty-dot ${difficultyTone[item.difficulty]}`} title={unlocked ? item.difficulty : `${item.difficulty} · Đang khóa`}></span>
                  </button>
                );
              })}
              {!filtered.length && <p className="empty-state">Không tìm thấy tình huống phù hợp.</p>}
            </div>
            <button className="random-button" disabled={!randomCandidates.length} onClick={() => {
              const item = randomCandidates[Math.floor(Math.random() * randomCandidates.length)];
              if (item) chooseScenario(item.id);
            }}>⤨ Chọn tình huống đã mở ngẫu nhiên</button>
''',
)

css_path = Path("app/globals.css")
css = css_path.read_text(encoding="utf-8")
css_anchor = '.scenario-number.done { background: var(--mint); border-color: var(--mint); color: #464646; }\n'
css_addition = '''.scenario-number.attempted { background: color-mix(in srgb, var(--orange) 18%, var(--surface)); border-color: color-mix(in srgb, var(--orange) 45%, var(--line)); color: var(--orange); }
.scenario-number.locked { background: color-mix(in srgb, var(--muted) 8%, var(--surface)); color: var(--muted); font-size: 14px; }
.scenario-item.locked { opacity: .56; cursor: not-allowed; filter: saturate(.55); }
.scenario-item.locked:hover { background: transparent; }
.scenario-item:disabled { pointer-events: none; }
.difficulty-filter button:disabled { opacity: .48; cursor: not-allowed; }
.unlock-progress { margin: 0 0 12px; padding: 11px 12px; border: 1px solid color-mix(in srgb, var(--mint) 58%, var(--line)); border-radius: 11px; background: color-mix(in srgb, var(--mint) 9%, var(--surface)); }
.unlock-progress > div:first-child { display: flex; align-items: center; gap: 7px; }
.unlock-progress strong { font-size: 11px; }
.unlock-progress small { display: block; margin-top: 5px; color: var(--muted); font-size: 9px; line-height: 1.4; }
.unlock-progress-bar { height: 4px; margin-top: 8px; overflow: hidden; border-radius: 4px; background: var(--line); }
.unlock-progress-bar i { display: block; height: 100%; border-radius: inherit; background: var(--mint); transition: width .3s ease; }
.random-button:disabled { opacity: .45; cursor: not-allowed; }
'''
if ".unlock-progress {" not in css:
    if css_anchor not in css:
        raise SystemExit("CSS patch anchor not found")
    css = css.replace(css_anchor, css_anchor + css_addition, 1)
    css_path.write_text(css, encoding="utf-8")

replace_once(
    "supabase/secure_gameplay.sql",
    '''declare uid uuid := auth.uid(); p public.user_progress; s jsonb; c jsonb;
''',
    '''declare uid uuid := auth.uid(); p public.user_progress; s jsonb; c jsonb; target_rank integer;
''',
)

replace_once(
    "supabase/secure_gameplay.sql",
    '''  if s is null or s is distinct from scenario_snapshot then raise exception 'Content changed. Reload the scenario.' using errcode = '22023'; end if;
  if choice_index is null or choice_index not between 0 and 2 then raise exception 'Invalid choice' using errcode = '22023'; end if;
''',
    '''  if s is null or s is distinct from scenario_snapshot then raise exception 'Content changed. Reload the scenario.' using errcode = '22023'; end if;
  target_rank := case s->>'difficulty' when 'Dễ' then 1 when 'Trung bình' then 2 when 'Khó' then 3 when 'Rất khó' then 4 else null end;
  if target_rank is null then raise exception 'Invalid scenario difficulty' using errcode = '22023'; end if;
  if exists (
    select 1
    from public.site_content t
    cross join lateral jsonb_array_elements(t.content->'scenarios') lower_item
    where t.slug = 'main' and t.published
      and (case lower_item->>'difficulty' when 'Dễ' then 1 when 'Trung bình' then 2 when 'Khó' then 3 when 'Rất khó' then 4 else 99 end) < target_rank
      and not exists (
        select 1 from public.test_attempts completed_attempt
        where completed_attempt.user_id = uid
          and completed_attempt.scenario_id = (lower_item->>'id')::smallint
      )
  ) then
    raise exception 'Complete lower difficulty scenarios first' using errcode = '42501';
  end if;
  if choice_index is null or choice_index not between 0 and 2 then raise exception 'Invalid choice' using errcode = '22023'; end if;
''',
)

Path("tests/progression-source.test.mjs").write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("challenge levels are progressively unlocked in the UI", async () => {\n  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");\n  const progression = await readFile(new URL("../app/progression.ts", import.meta.url), "utf8");\n  assert.match(page, /getUnlockedDifficulties/);\n  assert.match(page, /disabled=\\{!unlocked\\}/);\n  assert.match(page, /Chọn tình huống đã mở ngẫu nhiên/);\n  assert.match(progression, /Dễ.*Trung bình.*Khó.*Rất khó/s);\n});\n\ntest("server-side scoring rejects skipping lower levels", async () => {\n  const sql = await readFile(new URL("../supabase/secure_gameplay.sql", import.meta.url), "utf8");\n  assert.match(sql, /Complete lower difficulty scenarios first/);\n  assert.match(sql, /completed_attempt\\.scenario_id/);\n});\n''', encoding="utf-8")

print("Level unlock progression patch applied.")
