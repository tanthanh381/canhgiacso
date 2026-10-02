import type { Difficulty } from "../../data";
import { Icon } from "../../shared/icons";
import { difficulties } from "./presentation";

type DifficultyFilter = "Tất cả" | Difficulty;

/** Difficulty filter and "random scenario" button at the top of the scenario library. */
export function ScenarioTools({ difficulty, unlocked, canPickRandom, onSelectDifficulty, onPickRandom }: {
  difficulty: DifficultyFilter;
  unlocked: ReadonlySet<Difficulty>;
  canPickRandom: boolean;
  onSelectDifficulty: (value: DifficultyFilter) => void;
  onPickRandom: () => void;
}) {
  return (
    <div className="ux-scenario-tools">
      <label>
        <span>Lọc độ khó</span>
        <select value={difficulty} onChange={(event) => onSelectDifficulty(event.target.value as DifficultyFilter)}>
          {difficulties.map((item) => {
            const locked = item !== "Tất cả" && !unlocked.has(item);
            return <option key={item} value={item} disabled={locked}>{locked ? `${item} (đang khóa)` : item}</option>;
          })}
        </select>
      </label>
      <button type="button" className="ux-random" aria-label="Chọn ngẫu nhiên một tình huống đã mở" disabled={!canPickRandom} onClick={onPickRandom}><Icon name="dice" size={18} /><span>Ngẫu nhiên</span></button>
    </div>
  );
}

/** Fourth tile of the status strip: how many scenarios the player has attempted. */
export function ProgressStat({ completed, total }: { completed: number; total: number }) {
  return (
    <div className="ux-status-progress">
      <span className="ux-status-progress-icon" aria-hidden="true"><Icon name="check" size={18} /></span>
      <span><small>Tiến trình</small><strong>{completed}/{total || "—"}</strong></span>
    </div>
  );
}

/** Buttons that open the scenario library and the tips panel as slide-overs; only shown where those panels are drawers (see game.css). */
export function StageActions({ onOpenScenarios, onOpenInsight }: { onOpenScenarios: () => void; onOpenInsight: () => void }) {
  return (
    <div className="ux-stage-actions">
      <button type="button" className="ux-scenario-trigger" onClick={onOpenScenarios}><Icon name="list" size={18} /> Danh sách tình huống</button>
      <button type="button" className="ux-insight-trigger" onClick={onOpenInsight}><Icon name="bulb" size={18} /> Mẹo &amp; tiến trình</button>
    </div>
  );
}

/** Guests who solved this many scenarios are invited to create an account. */
export const GUEST_CONVERSION_THRESHOLD = 3;

/** Invitation for guests who already solved a few scenarios to create an account (the page decides when to show it). */
export function GuestConversion({ onSave, onDismiss }: { onSave: () => void; onDismiss: () => void }) {
  return (
    <aside className="ux-guest-conversion" role="note">
      <div className="ux-guest-conversion-body">
        <span className="ux-guest-conversion-icon" aria-hidden="true"><Icon name="target" size={24} /></span>
        <span>
          <strong>Bạn đã có tiến trình đáng để lưu</strong>
          <small>Tạo tài khoản để giữ kết quả trên nhiều thiết bị và nhận chứng nhận khi hoàn thành.</small>
        </span>
      </div>
      <div className="ux-guest-conversion-actions">
        <button type="button" className="ux-primary" onClick={onSave}>Lưu tiến trình</button>
        <button type="button" className="ux-text-button" onClick={onDismiss}>Tiếp tục với tư cách khách</button>
      </div>
    </aside>
  );
}

/** Recap inside the answer feedback: the red flags to remember (a wrong choice) or why the choice was safe, plus the real-life rule. */
export function LearningMoment({ safe, redFlags, tip }: { safe: boolean; redFlags: readonly string[]; tip: string }) {
  const flags = redFlags.slice(0, 3);
  return (
    <div className="ux-learning-moment">
      <div className="ux-learning-heading">
        <span aria-hidden="true"><Icon name={safe ? "check" : "warning"} size={20} /></span>
        <strong>{safe ? "Vì sao cách xử lý này an toàn" : "Dấu hiệu bạn cần ghi nhớ"}</strong>
      </div>
      {flags.length > 0 && <ul>{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul>}
      {tip && <div className="ux-principle"><b>Nguyên tắc áp dụng ngoài đời</b><span>{tip}</span></div>}
    </div>
  );
}
