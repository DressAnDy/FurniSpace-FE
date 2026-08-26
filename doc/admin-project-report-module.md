# Admin Project Report Module

Spec sản phẩm + API contract + quy tắc dữ liệu cho module báo cáo dự án dành cho **ADMIN**.

> **Phạm vi tài liệu:** chỉ thiết kế / contract. Không mô tả implementation code.  
> **Nguyên tắc:** chi tiết trước tổng quát · khớp flow · lean data · ưu tiên tín hiệu hành động hơn chỉ số thuần.

---

## Related docs

| Doc | Vai trò |
| --- | --- |
| [`docs/backend-api-dev-guide.md`](backend-api-dev-guide.md) §5.1 | Project lifecycle kỹ thuật, lớp Application/Infrastructure |
| [`docs/api-reference.md`](api-reference.md) §4b | Admin Reports aggregate (`/admin/reports/*`) — **không thay** |
| [`docs/api-reference.md`](api-reference.md) §20a | Admin Financial Dashboard (`/admin/financial/*`) — deep-link tiền |
| [`docs/FurniSpace_System_Flow_Integration_Test_Context_Updated.md`](FurniSpace_System_Flow_Integration_Test_Context_Updated.md) | Flow nghiệp vụ, Project Status, actor transitions |
| [`docs/payment-service-guide.md`](payment-service-guide.md) | Start fee / deposit / remaining semantics |

API sẵn có liên quan (giữ nguyên, module này **bổ sung**):

| Endpoint | Dùng khi |
| --- | --- |
| `GET /admin/reports/*` | KPI tổng hợp domain (funnel, capacity, catalog…) |
| `GET /admin/financial/projects` / `{projectId}` | Đào sâu tài chính 1 project |
| `GET /admin/projects/{projectId}/workflow` | Stage UI + facts chi tiết cho màn theo dõi tiến độ |
| Role dashboards (`/api/dashboard/sales\|designer\|production/*`) | Queue hằng ngày của Sales / Designer / Production |

---

## 1. Mục đích & persona

### Mục đích

Giúp Admin **nhìn từng dự án đang tắc ở đâu trong flow**, vì sao, và **nên làm gì tiếp** — không phải màn tổng hợp vanity metrics.

Primary journey:

```text
Attention queue (danh sách cần chú ý)
  → mở Project report detail
    → đọc CurrentStageHealth + suggestedAction
    → deep-link sang workflow / financial / production khi cần đào sâu
```

### Persona

| Ai | Dùng module này? |
| --- | --- |
| **ADMIN** | Có — giám sát tắc nghẽn, escalate, reassign, kiểm tra ngoại lệ tiền/tiến độ trên từng project |
| Sales / Designer / Production | Không — dùng role dashboards / workload boards sẵn có |
| Customer | Không |

---

## 2. Phạm vi IN / OUT

### IN

- Attention queue (paged list có filter hành động)
- Project report detail (1 project)
- Stage health + blockers + aging theo stage hiện tại
- Flow progress 6 stage (lean)
- Commercial snapshot tối thiểu (start fee / order / active payment)
- Export CSV 1 project (**Phase 2**)

### OUT

- KPI vanity: GMV tổng, accounts-by-role, catalog health, bestsellers
- Mongo room-planner scene analytics
- Chat volume / message dump
- Full proposal items, full production item list, full file list
- Cohort / retention / marketing attribution / BI warehouse
- Mutating workflow, payment, assign (module **read-only**)

---

## 3. Khớp flow dự án

Stages tái sử dụng catalog hiện có (`ProjectWorkflowStageCatalog`):

```text
INTAKE
  → DESIGNER_ASSIGNMENT
  → DESIGN_REVIEW
  → QUOTATION_ORDER
  → PRODUCTION
  → DELIVERY
Terminal: COMPLETED | REJECTED
```

| Stage key | ProjectStatus thuộc stage |
| --- | --- |
| `INTAKE` | `SUBMITTED`, `IN_CONSULTATION`, `NEED_BASIC_INFORMATION` |
| `DESIGNER_ASSIGNMENT` | `WAITING_FOR_DESIGNER_ASSIGNMENT`, `MEASUREMENT_REQUIRED`, `SPACE_VERIFIED` |
| `DESIGN_REVIEW` | `PROPOSAL_CONSULTING`, `PROPOSAL_SELECTED` |
| `QUOTATION_ORDER` | `QUOTATION_SENT`, `QUOTATION_REVISION_REQUESTED`, `ORDER_CONFIRMED` |
| `PRODUCTION` | `IN_PRODUCTION`, `PRODUCTION_BLOCKED`, `READY_FOR_DELIVERY` |
| `DELIVERY` | `DELIVERING`, `DELIVERED`, `COMPLETED` |

`REJECTED` không thuộc stage progress; detail vẫn trả header + `isRejected` + `rejectionReason` (nếu có).

State mỗi stage trong report:

| State | Ý nghĩa |
| --- | --- |
| `NOT_STARTED` | Chưa tới stage |
| `ACTIVE` | Đang ở stage |
| `BLOCKED` | Đang ở stage và có blocker nghiệp vụ |
| `COMPLETED` | Đã qua stage |

---

## 4. Attention queue

Danh sách **project cần chú ý** — đây là list chi tiết có lý do + hành động, **không** phải dashboard tổng.

### Attention reasons (map flow)

| `attentionReason` | Điều kiện gợi ý | `ownerRole` mặc định | `severity` mặc định |
| --- | --- | --- | --- |
| `UNASSIGNED_INTAKE` | Status `SUBMITTED` / `IN_CONSULTATION` và thiếu `assignedSalesId` | `SALES` / `ADMIN` | `ACTION` |
| `WAITING_CUSTOMER_INFO` | `NEED_BASIC_INFORMATION` và `ageInStatusDays` ≥ `N` (default **3**) | `SALES` | `WATCH` → `ACTION` nếu ≥ 7 |
| `START_FEE_BLOCKING` | Cần approve/assign designer nhưng latest `PROJECT_START_FEE` chưa `PAID` | `SALES` | `ACTION` |
| `WAITING_DESIGNER` | `WAITING_FOR_DESIGNER_ASSIGNMENT` | `SALES` / `ADMIN` | `ACTION` |
| `MEASUREMENT_OVERDUE` | `MEASUREMENT_REQUIRED` + schedule đo đạc quá hạn | `DESIGNER` / `SALES` | `ACTION` |
| `PROPOSAL_STALLED` | `PROPOSAL_CONSULTING` và `ageInStatusDays` ≥ `N` (default **7**) | `DESIGNER` | `WATCH` → `ACTION` nếu ≥ 14 |
| `QUOTATION_REVISION_LOOP` | `QUOTATION_REVISION_REQUESTED` và số lần revision ≥ **2** (hoặc aging ≥ 7) | `SALES` | `ACTION` |
| `PAYMENT_EXCEPTION` | Active collectible payment `EXPIRED` / stuck `PENDING|PROCESSING` quá lâu / cancelled gần đây ảnh hưởng tiến độ | `SALES` / `ADMIN` | `ESCALATE` nếu expired blocking; else `ACTION` |
| `PRODUCTION_BLOCKED` | Project `PRODUCTION_BLOCKED` hoặc production request/item blocked | `PRODUCTION` | `ESCALATE` |
| `DELIVERY_OVERDUE` | Schedule delivery/handover quá hạn trong khi project `READY_FOR_DELIVERY` / `DELIVERING` | `SALES` / `PRODUCTION` | `ACTION` |
| `FINAL_PAYMENT_PENDING` | Project `DELIVERED` + remaining chưa `PAID` | `SALES` | `ACTION` |
| `READY_TO_COMPLETE` | Đủ điều kiện explicit complete (order/payment terminal) nhưng project chưa `COMPLETED` | `SALES` / `ADMIN` | `WATCH` |

Một project có thể match nhiều reason; **list item chỉ hiển thị reason ưu tiên cao nhất** (severity: `ESCALATE` > `ACTION` > `WATCH`, rồi theo thứ tự bảng trên). Detail có thể liệt kê `allAttentionReasons[]` (tối đa các reason đang active).

### Severity

| `severity` | Ý nghĩa UX |
| --- | --- |
| `WATCH` | Theo dõi; chưa cần can thiệp ngay |
| `ACTION` | Cần người phụ trách xử lý trong ngày/tuần |
| `ESCALATE` | Admin nên can thiệp / reassign / mở financial exception |

### List item shape (lean)

Chỉ các field sau — không kèm KPI phụ:

| Field | Type | Notes |
| --- | --- | --- |
| `projectId` | guid | |
| `projectCode` | string | |
| `projectName` | string | |
| `projectStatus` | enum | |
| `stage` | string | stage key hiện tại; null nếu rejected |
| `customerId` / `customerName` | | |
| `assignedSalesId` / `assignedSalesName` | | nullable |
| `assignedDesignerId` / `assignedDesignerName` | | nullable |
| `ageDays` | int | tuổi project từ `submitted_at` (fallback `created_at`) |
| `ageInStatusDays` | int | ngày ở status hiện tại |
| `attentionReason` | enum string | reason ưu tiên |
| `suggestedAction` | string | câu hành động ngắn (VI hoặc EN thống nhất theo FE) |
| `ownerRole` | string | `SALES` \| `DESIGNER` \| `PRODUCTION` \| `ADMIN` |
| `severity` | string | `WATCH` \| `ACTION` \| `ESCALATE` |
| `submittedAt` | datetime | |

`suggestedAction` examples:

- `UNASSIGNED_INTAKE` → `"Assign Sales and move project into consultation."`
- `START_FEE_BLOCKING` → `"Follow up Project Start Fee payment before designer assignment."`
- `PRODUCTION_BLOCKED` → `"Open production request and clear blocked items."`
- `READY_TO_COMPLETE` → `"Explicitly complete order and project."`

---

## 5. Project report detail (primary)

Một response gọn gồm **4 khối**. Không dump entity trees.

### 5.1 Header

| Field | Notes |
| --- | --- |
| `projectId`, `projectCode`, `projectName` | |
| `projectStatus`, `stage` | `stage` null nếu `REJECTED` |
| `isRejected`, `rejectionReason` | |
| `businessType`, `projectAddress` | context ngắn; không trả full description dài nếu không cần |
| `customerId`, `customerName` | |
| `assignedSalesId`, `assignedSalesName` | |
| `assignedDesignerId`, `assignedDesignerName` | |
| `submittedAt`, `salesAssignedAt`, `designerAssignedAt`, `completedAt`, `rejectedAt` | timestamps có thì trả |
| `ageDays`, `ageInStatusDays` | |
| `primaryAttention` | `{ reason, severity, ownerRole, suggestedAction }` hoặc null nếu healthy |
| `allAttentionReasons` | string[] các reason đang active (có thể rỗng) |

### 5.2 CurrentStageHealth

Chỉ mô tả stage đang `ACTIVE` hoặc `BLOCKED`. Nếu terminal (`COMPLETED` / `REJECTED`) → `currentStageHealth = null` và dùng `terminalSummary`.

| Field | Notes |
| --- | --- |
| `stage` | key |
| `state` | `ACTIVE` \| `BLOCKED` |
| `statusInStage` | ProjectStatus hiện tại |
| `title` | ngắn, 1 dòng |
| `summary` | 1–2 câu tình trạng |
| `ageInStageDays` | ngày kể từ khi vào stage (xem §7) |
| `blockers` | `[{ code, message }]` — tối đa ~5 |
| `nextAction` | `{ ownerRole, suggestedAction }` |
| `links` | deep-link tối thiểu: `{ type, id, label }[]` |

`links.type` gợi ý: `QUOTATION`, `ORDER`, `PAYMENT`, `PRODUCTION_REQUEST`, `SCHEDULE`, `WORKFLOW` (pseudo — FE route tới API/màn có sẵn).

**Không** nhúng full metrics mỗi stage (tránh trùng `GET .../workflow`).

### 5.3 FlowProgress

Mảng đúng 6 stage theo thứ tự catalog:

```json
{
  "stages": [
    {
      "key": "INTAKE",
      "label": "Intake",
      "state": "COMPLETED",
      "completedAt": "2026-07-02T10:00:00Z"
    },
    {
      "key": "DESIGNER_ASSIGNMENT",
      "label": "Designer assignment",
      "state": "ACTIVE",
      "completedAt": null
    }
  ]
}
```

Mỗi phần tử chỉ: `key`, `label`, `state`, `completedAt?`. Không metrics / facts / links trong mảng này.

### 5.4 CommercialSnapshot

Reuse semantics financial (không nhân đôi dashboard):

| Field | Semantics |
| --- | --- |
| `projectStartFeeAmount` | Latest `PROJECT_START_FEE` amount |
| `projectStartFeeStatus` | Latest start-fee payment status; null nếu chưa tạo |
| `projectStartFeePaidAt` | |
| `orderId`, `orderCode`, `orderStatus` | Latest order (cùng rule financial overview); null nếu chưa có |
| `orderFinalTotal`, `orderPaidAmount`, `orderRemainingAmount` | Từ Order |
| `activePaymentId`, `activePaymentType`, `activePaymentAmount`, `activePaymentStatus` | Active collectible: `PENDING`/`PROCESSING`, chưa expired, chưa có successful transaction |
| `totalProjectCashCollected` | Sum canonical `PAID` payments trên project (cùng rule §20a) |
| `lastPaidAt` | |

**Không** trả full payment history, transaction attempts, provider payloads.

### 5.5 Terminal summary (khi COMPLETED / REJECTED)

```json
{
  "terminalSummary": {
    "outcome": "COMPLETED",
    "completedAt": "2026-08-01T00:00:00Z",
    "durationDays": 42,
    "note": "Project completed after final payment and explicit complete."
  }
}
```

Với `REJECTED`: `outcome = REJECTED`, kèm `rejectionReason`, không ép commercial đầy đủ.

### 5.6 Những gì detail **không** trả

- Proposal item lines / scene Mongo
- Production item rows đầy đủ (chỉ `productionRequestId` trong links nếu có)
- Chat messages / unread counts chi tiết
- File metadata list
- Catalog / bestsellers
- Trend charts / period comparisons

FE cần đào sâu → deep-link:

- Workflow UI facts: `GET /admin/projects/{projectId}/workflow`
- Tiền chi tiết: `GET /admin/financial/projects/{projectId}` (+ payments/exceptions nếu cần)

---

## 6. API contract (đề xuất)

Auth: **`ADMIN` only** trên mọi endpoint.  
Envelope: `ServiceResult<T>` / `PagedResult<T>` theo backend convention.  
JSON enums: `SCREAMING_SNAKE` (`JsonStringEnumConverter`).  
Read-only: không mutate Project / Order / Payment / Production.

| Method | Path | Phase | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/admin/project-reports` | P1 | Attention / searchable list |
| `GET` | `/admin/project-reports/{projectId}` | P1 | Detail report 1 project |
| `GET` | `/admin/project-reports/{projectId}/export` | P2 | CSV 1 project |

### 6.1 `GET /admin/project-reports`

#### Query

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `keyword` | string? | null | `projectCode`, `projectName`, customer name |
| `stage` | string? | null | `INTAKE` \| `DESIGNER_ASSIGNMENT` \| … \| `DELIVERY` |
| `projectStatus` | ProjectStatus? | null | |
| `attentionReason` | string? | null | filter đúng 1 reason |
| `severity` | string? | null | `WATCH` \| `ACTION` \| `ESCALATE` |
| `ownerRole` | string? | null | |
| `salesId` | guid? | null | |
| `designerId` | guid? | null | |
| `attentionOnly` | bool | `true` | `true` = chỉ project đang có ≥1 attention reason; `false` = mọi non-filtered project (vẫn lean list shape) |
| `minAgeDays` | int? | null | filter `ageDays >=` |
| `from` / `to` | datetime? | null | filter `submitted_at` (fallback `created_at`); `from <= to` |
| `page` | int | 1 | `> 0` |
| `pageSize` | int | 20 | `1..100` |
| `sortBy` | string | `severityDesc` | `severityDesc`, `ageDaysDesc`, `submittedAtAsc`, `submittedAtDesc` |
| `sortDirection` | string | `desc` | áp dụng khi sort không tự mang chiều |

#### Success (rút gọn)

```json
{
  "status": 200,
  "message": "Admin project reports retrieved successfully.",
  "data": {
    "items": [
      {
        "projectId": "11111111-1111-1111-1111-111111111111",
        "projectCode": "PRJ-2026-0001",
        "projectName": "Cafe District 1",
        "projectStatus": "PRODUCTION_BLOCKED",
        "stage": "PRODUCTION",
        "customerId": "...",
        "customerName": "Customer Alpha",
        "assignedSalesId": "...",
        "assignedSalesName": "Sales Alpha",
        "assignedDesignerId": "...",
        "assignedDesignerName": "Designer Beta",
        "ageDays": 28,
        "ageInStatusDays": 5,
        "attentionReason": "PRODUCTION_BLOCKED",
        "suggestedAction": "Open production request and clear blocked items.",
        "ownerRole": "PRODUCTION",
        "severity": "ESCALATE",
        "submittedAt": "2026-07-01T03:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

#### Errors

| HTTP | Trigger |
| --- | --- |
| 400 | Invalid paging, date range, enum filter |
| 401 / 403 | Unauthenticated / non-admin |

### 6.2 `GET /admin/project-reports/{projectId}`

#### Success message

`Admin project report retrieved successfully.`

#### Response shape (rút gọn)

```json
{
  "status": 200,
  "message": "Admin project report retrieved successfully.",
  "data": {
    "header": {
      "projectId": "...",
      "projectCode": "PRJ-2026-0001",
      "projectName": "Cafe District 1",
      "projectStatus": "IN_PRODUCTION",
      "stage": "PRODUCTION",
      "isRejected": false,
      "rejectionReason": null,
      "businessType": "Cafe",
      "projectAddress": "Q1, HCMC",
      "customerId": "...",
      "customerName": "Customer Alpha",
      "assignedSalesId": "...",
      "assignedSalesName": "Sales Alpha",
      "assignedDesignerId": "...",
      "assignedDesignerName": "Designer Beta",
      "submittedAt": "2026-07-01T03:00:00Z",
      "salesAssignedAt": "2026-07-01T06:00:00Z",
      "designerAssignedAt": "2026-07-03T02:00:00Z",
      "completedAt": null,
      "rejectedAt": null,
      "ageDays": 28,
      "ageInStatusDays": 4,
      "primaryAttention": {
        "reason": "PRODUCTION_BLOCKED",
        "severity": "ESCALATE",
        "ownerRole": "PRODUCTION",
        "suggestedAction": "Open production request and clear blocked items."
      },
      "allAttentionReasons": ["PRODUCTION_BLOCKED"]
    },
    "currentStageHealth": {
      "stage": "PRODUCTION",
      "state": "BLOCKED",
      "statusInStage": "PRODUCTION_BLOCKED",
      "title": "Production blocked",
      "summary": "At least one production item is blocked; project cannot move to ready-for-delivery.",
      "ageInStageDays": 6,
      "blockers": [
        { "code": "PRODUCTION_ITEM_BLOCKED", "message": "1 production item marked blocked." }
      ],
      "nextAction": {
        "ownerRole": "PRODUCTION",
        "suggestedAction": "Clear blocked production items or reassign staff."
      },
      "links": [
        { "type": "PRODUCTION_REQUEST", "id": "...", "label": "Open production request" },
        { "type": "ORDER", "id": "...", "label": "Open order" },
        { "type": "WORKFLOW", "id": "...", "label": "Open workflow snapshot" }
      ]
    },
    "flowProgress": {
      "stages": [
        { "key": "INTAKE", "label": "Intake", "state": "COMPLETED", "completedAt": "..." },
        { "key": "DESIGNER_ASSIGNMENT", "label": "Designer assignment", "state": "COMPLETED", "completedAt": "..." },
        { "key": "DESIGN_REVIEW", "label": "Design review", "state": "COMPLETED", "completedAt": "..." },
        { "key": "QUOTATION_ORDER", "label": "Quotation & order", "state": "COMPLETED", "completedAt": "..." },
        { "key": "PRODUCTION", "label": "Production", "state": "BLOCKED", "completedAt": null },
        { "key": "DELIVERY", "label": "Delivery", "state": "NOT_STARTED", "completedAt": null }
      ]
    },
    "commercialSnapshot": {
      "projectStartFeeAmount": 2000000,
      "projectStartFeeStatus": "PAID",
      "projectStartFeePaidAt": "2026-07-02T01:00:00Z",
      "orderId": "...",
      "orderCode": "ORD-2026-0001",
      "orderStatus": "IN_PRODUCTION",
      "orderFinalTotal": 100000000,
      "orderPaidAmount": 30000000,
      "orderRemainingAmount": 70000000,
      "activePaymentId": null,
      "activePaymentType": null,
      "activePaymentAmount": null,
      "activePaymentStatus": null,
      "totalProjectCashCollected": 32000000,
      "lastPaidAt": "2026-07-10T03:00:00Z"
    },
    "terminalSummary": null
  }
}
```

#### Errors

| HTTP | `errorCode` (đề xuất) | Trigger |
| --- | --- | --- |
| 404 | `PROJECT_NOT_FOUND` | Project không tồn tại |
| 401 / 403 | — | Auth |

### 6.3 `GET /admin/project-reports/{projectId}/export` (Phase 2)

- Success: `text/csv` attachment (`Content-Disposition`)
- Columns: flatten header + primary attention + commercial snapshot + current stage key/state/nextAction
- Errors vẫn JSON `ServiceResult`
- Không export Mongo/chat/files

---

## 7. Quy tắc tính toán & nguồn dữ liệu

### Source of truth

PostgreSQL only:

- `projects` (+ assign timestamps, status)
- `project_schedules` / phase timelines (nếu dùng cho overdue measurement/delivery)
- `quotations`, `orders`, `payments`, `payment_transactions` (chỉ để derive status/amounts — không trả raw provider)
- `production_requests` / `production_items` (counts + blocked flags + id link)
- `deliveries` / delivery-related order item states (nếu cần overdue)

**Không** đọc: Mongo room-planner scenes, Firebase binaries, Elasticsearch aggregates cho module này.

### Aging

| Metric | Định nghĩa |
| --- | --- |
| `ageDays` | `floor(now - coalesce(submitted_at, created_at))` theo ngày lịch (UTC hoặc app timezone — thống nhất với financial reports) |
| `ageInStatusDays` | Ngày kể từ lần chuyển vào **status hiện tại**. Ưu tiên `project_phase_timelines` / status history nếu có; nếu chưa có cột lịch sử đủ tin cậy → tạm dùng timestamp gần nhất có nghĩa (`sales_assigned_at`, `designer_assigned_at`, …) và ghi rõ limitation trong release note P1 |
| `ageInStageDays` | Ngày kể từ lần vào **stage hiện tại** (status đầu tiên thuộc stage đó) |

Default thresholds (configable sau, hard default P1):

| Key | Default |
| --- | --- |
| Customer info stall | 3 ngày (`WATCH`), 7 ngày (`ACTION`) |
| Proposal stall | 7 / 14 ngày |
| Quotation revision loop | revision count ≥ 2 **hoặc** ≥ 7 ngày ở `QUOTATION_REVISION_REQUESTED` |
| Payment stuck PENDING/PROCESSING | ≥ 3 ngày → `PAYMENT_EXCEPTION` |

### Commercial field rules

Giống `GET /admin/financial/projects/{projectId}`:

- Latest order by `confirmedAt`, `createdAt`, then `orderId`
- `totalProjectCashCollected` từ canonical paid Payment rows — **không** cộng `projectStartFeeAmount + orderPaidAmount` thủ công
- Active payment = collectible `PENDING`/`PROCESSING`, not expired, no successful transaction

### Read-only & side effects

- Không tạo notification
- Không đổi status / assign / payment
- Không ghi cache bắt buộc (optional short TTL read-cache được phép sau này; Postgres vẫn SoT)

---

## 8. UX guidance (FE)

1. **List** = “cần làm gì hôm nay”: sort mặc định `severityDesc`, filter `attentionOnly=true`.
2. Click row → **Detail report**: ưu tiên `primaryAttention` + `currentStageHealth.nextAction` trên fold đầu.
3. Không render lưới KPI lớn trên màn detail; commercial snapshot là 1 hàng số tiền tối thiểu.
4. Deep-link rõ ràng sang Workflow / Financial khi Admin cần đào sâu — tránh nhồi data vào report.
5. Mobile: hiện `severity`, `attentionReason`, `suggestedAction`; ẩn raw counts mặc định.

```text
[Attention list]
   severity | code | reason | action | owner
        ↓
[Project report]
   Header + primary attention
   Current stage health (blockers + next action)
   Flow progress (6 chips)
   Commercial snapshot (lean)
   Links → workflow / financial / production
```

---

## 9. Ranh giới với module hiện có

| Nhu cầu | Dùng |
| --- | --- |
| “Project nào đang tắc và phải làm gì?” | **Module này** `/admin/project-reports` |
| “Tổng funnel / capacity / catalog hôm nay?” | `/admin/reports/*` |
| “Tiền thu / receivables / payment exceptions hệ thống?” | `/admin/financial/*` |
| “Stage facts + metrics UI cho 1 project?” | `/admin/projects/{id}/workflow` |
| “Queue việc của Sales/Designer/Production?” | Role dashboards |

Nguyên tắc tránh trùng:

- Aggregate counts domain → Reports overview  
- Money depth → Financial  
- Stage narrative + action → **Project Report**  
- Stage raw facts cho UI builder → Workflow snapshot  

---

## 10. Phased delivery

### Phase 1 (MVP)

- `GET /admin/project-reports` với attention reasons cốt lõi
- `GET /admin/project-reports/{projectId}` với 4 khối (+ terminalSummary)
- Severity / ownerRole / suggestedAction
- Deep-link IDs tối thiểu

### Phase 2

- `GET .../export` CSV 1 project
- Filter nâng cao (`minAgeDays`, multi-reason nếu cần)
- Tinh chỉnh severity scoring + configurable thresholds
- Cải thiện `ageInStatusDays` / `ageInStageDays` nếu bổ sung status history đáng tin

### Phase 3 — explicit out of scope

- Cohort / retention / attribution
- BI warehouse / Excel multi-sheet
- Room-planner / chat analytics
- Thay thế `/admin/reports/overview` hoặc financial dashboard

---

## 11. Implementation notes (khi code sau này)

Chỉ hướng dẫn chỗ đặt code — **không bắt buộc trong scope docs này**:

```text
API/Controllers/Admin/AdminProjectReportsController.cs
Application/Interfaces/Reports/IAdminProjectReportService.cs
Application/Services/Reports/AdminProjectReportService.cs
Application/DTOs/Reports/  (hoặc Shared/DTOs/Reports/)
Infrastructure/Repositories/.../AdminProjectReportRepository.cs
Infrastructure/ReadModels/Reports/
```

Tuân [`docs/backend-api-dev-guide.md`](backend-api-dev-guide.md): controller mỏng → Application service → repository; `ServiceResult` / `PagedResult`; không inject `AppDbContext` vào controller.

Khi implement xong: sync contract vào [`docs/api-reference.md`](api-reference.md) (section mới cạnh §4b).

---

## 12. Checklist chấp nhận (docs / P1)

- [ ] List mặc định là attention queue, không phải KPI overview
- [ ] Detail có đủ Header + CurrentStageHealth + FlowProgress + CommercialSnapshot
- [ ] Mỗi attention item có `attentionReason` + `suggestedAction` + `ownerRole` + `severity`
- [ ] Không trả proposal/production/chat/file dumps
- [ ] Commercial fields khớp semantics financial §20a
- [ ] Stages khớp `ProjectWorkflowStageCatalog` (6 stage)
- [ ] Documented deep-links tới workflow + financial; module read-only
- [ ] OUT scope (vanity KPI, Mongo, BI) được nêu rõ
