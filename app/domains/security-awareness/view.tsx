import type { SiteContent } from "../../data";
import { BadgeIcon } from "../../shared/ui-primitives";
import { securityChecklistGroups, securityChecklistItemIds } from "./checklist";

export function KnowledgeView({
  copy,
  knowledgeCards,
  completedChecklistIds,
  onToggleChecklistItem,
}: {
  copy: SiteContent["copy"];
  knowledgeCards: SiteContent["knowledgeCards"];
  completedChecklistIds: string[];
  onToggleChecklistItem: (id: string) => void;
}) {
  const checklistCompleted = completedChecklistIds.length;
  const checklistTotal = securityChecklistItemIds.size;
  const checklistProgress = Math.round((checklistCompleted / checklistTotal) * 100);

  return (
    <section className="content-page knowledge-page">
      <div className="page-hero knowledge-hero">
        <div><span className="eyebrow">{copy.knowledgeEyebrow}</span><h1>{copy.knowledgeTitle}</h1></div>
        <p>{copy.knowledgeIntro}</p>
      </div>

      <div className="knowledge-section-heading">
        <div><span className="eyebrow">NỘI DUNG THAM KHẢO</span><h2>Cẩm nang thực hành</h2></div>
        <p>Các nguyên tắc ngắn gọn để nhận diện, xác minh và xử lý tình huống có dấu hiệu lừa đảo.</p>
      </div>
      <div className="knowledge-grid">
        {knowledgeCards.map((card, index) => (
          <article key={card.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <BadgeIcon>{card.icon}</BadgeIcon>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </div>

      <section className="security-checklist" aria-labelledby="security-checklist-title">
        <div className="checklist-heading">
          <div>
            <span className="eyebrow">TỰ KIỂM TRA AN TOÀN SỐ</span>
            <h2 id="security-checklist-title">Danh sách kiểm tra</h2>
            <p>Ưu tiên hoàn thành các mục “Thiết yếu”, sau đó tiếp tục với các mục “Nên làm”. Tiến độ được lưu riêng trên thiết bị này.</p>
          </div>
          <div className="checklist-overall" aria-label={`Đã hoàn thành ${checklistCompleted} trên ${checklistTotal} mục`}>
            <strong>{checklistProgress}%</strong>
            <span>{checklistCompleted}/{checklistTotal} hoàn thành</span>
            <div className="checklist-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={checklistProgress}>
              <i style={{ width: `${checklistProgress}%` }} />
            </div>
          </div>
        </div>
        <div className="checklist-groups">
          {securityChecklistGroups.map((group) => {
            const completed = group.items.filter((item) => completedChecklistIds.includes(item.id)).length;
            const progress = Math.round((completed / group.items.length) * 100);
            return (
              <details className="checklist-group" key={group.id}>
                <summary>
                  <span className="checklist-icon" aria-hidden="true">{group.icon}</span>
                  <span className="checklist-group-copy"><strong>{group.title}</strong><small>{group.description}</small></span>
                  <span className="checklist-group-progress"><b>{progress}%</b><small>{completed}/{group.items.length} mục</small></span>
                </summary>
                <div className="checklist-items">
                  {group.items.map((item) => {
                    const checked = completedChecklistIds.includes(item.id);
                    return (
                      <label aria-label={item.title} className={checked ? "completed" : ""} htmlFor={`security-check-${item.id}`} key={item.id}>
                        <input
                          id={`security-check-${item.id}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleChecklistItem(item.id)}
                        />
                        <span>
                          <em className={`checklist-priority ${item.priority === "Thiết yếu" ? "essential" : "recommended"}`}>{item.priority}</em>
                          <strong>{item.title}</strong>
                          <small>{item.description}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </section>
  );
}
