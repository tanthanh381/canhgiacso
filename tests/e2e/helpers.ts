import type { Page } from "@playwright/test";

// Chế độ khách chấm điểm trên máy chủ (RPC evaluate_guest_choice): dữ liệu công khai của trình duyệt
// không còn đáp án. Kiểm thử giả lập đúng hợp đồng phản hồi của RPC để không phụ thuộc Supabase thật.
export function mockGuestScoring(page: Page) {
  return page.route("**/rest/v1/rpc/evaluate_guest_choice", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "POST, OPTIONS",
        },
      });
    }
    const request = route.request().postDataJSON() as { scenario_id: number; choice_index: number };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        scenarioId: request.scenario_id,
        choiceIndex: request.choice_index,
        correct: true,
        moneyDelta: 0,
        awarenessDelta: 5,
        feedback: "Phản hồi giả lập từ máy chủ.",
      }),
    });
  });
}

// Banner đồng ý cookie là lớp cố định ở đáy màn hình; lưu trước lựa chọn "từ chối" để nó không che thao tác kiểm thử.
export function rejectConsentUpfront(page: Page) {
  return page.addInitScript(() => {
    try {
      window.localStorage.setItem("cgs-consent-v1", JSON.stringify({ analytics: false, ts: Date.now(), v: 1 }));
    } catch {
      /* storage bị chặn */
    }
  });
}
