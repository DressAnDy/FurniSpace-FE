# FurniSpace Customer AI Chat Assistant

Tài liệu thiết kế (plan + contract) cho **AI Chat Box** trên customer app.  
**Chưa implement code.** Form Create Project Request hiện tại vẫn là nguồn sự thật cho intake thủ công.

Liên quan:

- Form hiện tại: `src/features/CustomerPages/customerProjectRequest/CustomerProjectRequestPage.tsx`
- API create: `CreateProjectInput` + `createProject()` trong `src/services/api/projects.ts`
- Validation: `src/shared/utils/projectRequestValidation.ts`
- Chuẩn FE: [`TECHNICAL_CODEBASE.md`](./TECHNICAL_CODEBASE.md)

---

## 1. Mục tiêu sản phẩm

1. **Support chat:** trả lời câu hỏi về quy trình FurniSpace, điều hướng trang customer, giải thích trạng thái dự án cơ bản.
2. **Guided Create Project Request:** AI hỏi thông tin theo lượt → user trả lời → gom draft → user **xác nhận** → FE gọi `createProject` (và upload file nếu có).
3. **An toàn:** không auto-submit khi thiếu field bắt buộc hoặc user chưa confirm. Không thay Project Chat với sales/designer.

AI là lối tắt song song với form `/customer/project-request`, không thay thế form.

---

## 2. Quyết định thiết kế đã chốt

| Hạng mục | Quyết định |
| --- | --- |
| UI | Floating widget góc phải trên mọi trang `/customer/*` |
| AI runtime | Backend FurniSpace orchestrate LLM + tools (FE không giữ API key) |
| MVP sớm (nếu BE chưa sẵn) | Scripted slot-filling trên FE để validate UX, sau đó nối BE |
| Submit project | FE gọi `useCreateProject` / `useUploadProjectFile` sau confirm |
| Branding | “FurniSpace Assistant” — tách biệt Project Chat nhân sự |

---

## 3. Luồng Create Project bằng AI

```text
Open widget
  → Detect intent (support | create_project | navigate | clarify)
  → create_project: slot-filling (1–2 field / turn)
  → Update draft
  → Required fields đủ?
       no  → hỏi tiếp
       yes → Review card
  → User Confirm?
       edit → quay lại slot
       yes  → createProject (+ optional file upload)
  → Navigate /customer/projects
```

### 3.1 Field mapping

Dựa trên `CreateProjectInput`:

| Nhóm hỏi | Fields | Bắt buộc |
| --- | --- | --- |
| Cơ bản | `projectName`, `businessType` | Yes |
| Nhu cầu | `furnitureRequirement`, `businessPurpose`, `description` | `furnitureRequirement` yes |
| Không gian | `projectAddress`, `totalAreaSqm`, `numberOfFloors` | No |
| Ngân sách / deadline | `budgetMin`, `budgetMax`, `targetCompletionDate` | No (validate nếu có) |
| File | upload sau khi có `projectId` | No |

Validation tái dùng `projectRequestValidation` + `validateOptionalFutureDate` như form hiện tại.

### 3.2 UX hỏi đáp

- Mỗi turn hỏi 1–2 field; quick-reply cho enum (`Cafe`, `Retail`, `Office`, `Restaurant`, `Showroom`).
- Panel **Draft Project Request** cạnh chat: field đã điền / còn thiếu.
- Cuối flow: card **Review & Submit** → `Gửi yêu cầu` / `Sửa`.
- File: step riêng sau review (kéo thả trong widget).

---

## 4. Kiến trúc đề xuất

```text
CustomerAiAssistantWidget
  → aiAssistantStore (Zustand: open, messages, draft, mode)
  → services/api/aiAssistant → POST /ai/assistant/chat
       → BE LLM + tool whitelist
  → (sau confirm) useCreateProject / useUploadProjectFile
```

### 4.1 FE (khi implement)

Feature đề xuất: `src/features/CustomerPages/customerAiAssistant/`

| File | Vai trò |
| --- | --- |
| `CustomerAiAssistantWidget.tsx` | Floating button + panel |
| `AiChatThread.tsx` | Danh sách message |
| `AiDraftCard.tsx` | Draft + review/submit |
| `AiQuickReplies.tsx` | Suggested replies |
| `customerAiI18n.ts` | EN/VI (đồng bộ `useLang`) |
| `aiAssistant.types.ts` | Message, intent, draft, actions |

Mount trong customer shell (cạnh `CustomerNavbar`), chỉ role `CUSTOMER`.

State (Zustand): `idle | support | create_project`, messages, draft, sessionId (persist để resume).

### 4.2 BE contract

`POST /ai/assistant/chat`

**Request**

```ts
type AiAssistantChatRequest = {
  sessionId: string;
  message: string;
  locale: 'en' | 'vi';
  context: {
    currentPath: string;
    activeProjectId?: string | null;
  };
  draft: Partial<CreateProjectInput>;
  mode: 'idle' | 'support' | 'create_project';
};
```

**Response**

```ts
type AiAssistantAction =
  | { type: 'navigate'; path: string }
  | { type: 'ready_to_submit' }
  | { type: 'start_create_project' }
  | { type: 'ask_upload' }
  | { type: 'open_form'; path: string };

type AiAssistantChatResponse = {
  assistantMessage: string;
  intent: 'support' | 'create_project' | 'navigate' | 'clarify';
  draftPatch?: Partial<CreateProjectInput>;
  missingFields?: string[];
  suggestedReplies?: string[];
  actions?: AiAssistantAction[];
  mode?: 'idle' | 'support' | 'create_project';
};
```

**Guardrails BE**

- System prompt khóa domain FurniSpace; không hallucinate giá/SLA.
- Tool whitelist; không raw SQL / admin actions.
- Rate limit theo user; log session audit.
- Chỉ data của customer đang auth.

---

## 5. Hai mode trong cùng chat

### Support

- FAQ quy trình: request → consultation → proposal → quotation → order → delivery.
- Deep-link: Orders, Tracking, Quotations, Schedules, Project Chat.
- Phase sau: đọc status project của user (read-only) → gợi ý action theo status  
  (`NEED_BASIC_INFORMATION` → edit, `QUOTATION_SENT` → Quotations).

### Create Project

- Trigger: quick action “Tạo dự án với AI” hoặc user nói muốn tạo dự án.
- Slot-filling → review → confirm → submit.

---

## 6. Phased delivery

### Phase 0 — UX shell (FE)

- Floating widget + empty states + EN/VI.
- Scripted create-project (không LLM): checklist → draft → review → `createProject`.
- Mục tiêu: đo conversion form dài → chat.

### Phase 1 — BE AI

- Nối `/ai/assistant/chat`.
- Intent + `draftPatch` từ LLM.
- Support Q&A + navigate actions.
- Giữ confirm trước submit.

### Phase 2 — Context-aware

- Tool read-only: projects / orders / quotations của user.
- “Dự án của tôi đang ở bước nào?”
- Gợi ý action theo status.

### Phase 3 — Richer intake

- Upload file trong chat.
- Parse mô tả tự nhiên (“cafe 80m2 Q1 ngân sách 200–300tr”) → prefill nhiều field.
- Resume draft session khi đóng/mở widget.

---

## 7. Rủi ro & cách xử lý

| Rủi ro | Cách xử lý |
| --- | --- |
| AI điền sai / thiếu bắt buộc | Validate FE + review card; không auto-submit |
| Nhầm với Project Chat nhân sự | Branding “FurniSpace Assistant”, UI tách biệt |
| Chi phí LLM / latency | Slot rule-based cho field đơn giản; LLM cho câu dài + support |
| i18n | Hỏi theo `lang` hiện tại; labels EN/VI |

---

## 8. Success metrics (MVP)

- % session mở widget → bắt đầu create intent.
- % draft hoàn tất required fields.
- % confirm → project created thành công.
- So sánh thời gian hoàn tất vs form `/customer/project-request`.
- CSAT sau câu trả lời support.

---

## 9. Out of scope MVP

- AI thay sales/designer chat.
- AI sửa proposal / chấp nhận báo giá / thanh toán.
- Admin/staff assistant.
- Gọi LLM trực tiếp từ browser.

---

## 10. Checklist khi bắt đầu code (sau này)

1. `CustomerAiAssistantWidget` + store + mount customer pages.
2. Scripted create-project slot flow → submit qua hooks hiện có.
3. Contract BE `/ai/assistant/chat` + thay scripted turns bằng API response.
4. Support intents + navigate actions.
5. File upload + session resume.

**Trạng thái hiện tại:** chỉ có plan/docs này — chưa có implementation trong repo.
