# FurniSpace — Remaining Backlog

> **Updated:** 2026-08-14 (re-scan after merge develop / PR #55 FixQuotationFlow + customize/reopen handover)  
> **Branch checked:** `Optimize-UI-UX` @ `3961946`  
> **Rule:** Chỉ giữ **chưa làm**, **Product chưa chốt**, hoặc **cần chỉnh/verify runtime**.  
> **Important:** Planning-only.

---

## 0. Đã xác nhận trong code — bỏ khỏi backlog mở

### Handover + quotation merge (đã có trong repo)

| Module | Evidence |
|---|---|
| Customize API/hooks + Designer create/upload version | `customizationRequests.ts`, `CustomizationTab.tsx`, `useUploadProductVersionFile` |
| Customer Custom Versions Review + Accept + View 3D | `CustomerProjectProposalAccordion.tsx` — `Accept Custom Version`, feasibility gate |
| Production customization queue | `ProductionCustomizationRequests.tsx` — `/api/production/customization-versions` |
| Reopen Proposal trên Project Detail | `reopenProjectProposal` + Customer/Sale Project Detail buttons |
| Customer 3D chat modal | `Customer3dPreviewPage.tsx` — chat modal |
| Room Planner `Catalog \| Custom` | `ThreeDTestPage.tsx`, `BuildingThreeDTestPage.tsx` |
| Quotation `depositAmount` DTO + Sale UI | `quotations.ts`, `SaleQuotations.tsx` (validate trước send) |
| Customer quotation hiện deposit + tạo/pay deposit | `CustomerQuotationsPage.tsx` |
| Update Project Area | `updateProjectArea` + edit form trong `ProjectAreasTab.tsx` |
| Area cards có metrics + details | floor, dimensions, notes, status, Update button |
| Quotation discount-only UI | qty/unit price read-only; Save Discounts |
| Production Complete / Start Delivering gates | giữ nguyên (regression only) |
| Realtime listeners | `RealtimeSyncProvider` + hubs (còn **runtime E2E**) |

### Không làm lại (đã khóa)

- Endpoint recreate payment riêng → gọi lại create
- Restore enum `BLOCKED`
- Multipart create-project
- Enum schedule `PRODUCTION` (trừ Product yêu cầu)

---

## 1. PRODUCT OPEN

| ID | Câu hỏi | Default tạm | Impact |
|---|---|---|---|
| P1 | Start fee có formula tự động? | Default 2,000,000 + Sale override | Config/service BE |
| P2 | Auto-complete order khi remaining paid? | Không — Sale Complete thủ công | Ẩn/bỏ nút Complete |
| P3 | Deselect proposal trước quotation? | Chỉ có reopen sau accept | BE endpoint mới |
| P4 | Deposit UX amount hay %? | Amount (đã wire) | Optional % UI |
| P5 | Expiration default/cap 3 ngày? | Manual | BE default + FE max |
| P6 | Date ≤ `targetCompletionDate`? | Chưa enforce production/schedule | BE + FE |
| P7 | Clone/reuse design? | Không API | BE clone |
| P8 | Customer reschedule + Sale duyệt? | Không | BE workflow |
| P9 | Dedicated production timeline/type? | Schedule chung | BE type/DTO |
| P10 | “Last Delivered” copy? | `lastDeliveredAt` | FE rename (`ReadyForDelivery.tsx`) |
| P11 | Mark Blocked redesign? | Không còn enum `BLOCKED` | Product → BE → FE |
| P12 | Customer Reject custom version? | Không reject API; gần nhất cancel request | Product chốt |

---

## 2. Follow-ups còn lại (sau merge)

| ID | Hạng mục | Owner | Status |
|---|---|---|---|
| H1 | Customer Reject custom version | PRODUCT | Chờ P12 |
| H2 | Accept customization → proposal/quotation E2E | BOTH | Runtime: accept có refetch; verify quotation line items |
| H3 | Custom tab chỉ hiện version có `MODEL_3D` | FE / process | UX note hoặc bắt buộc model khi submit |
| H4 | Draft visibility theo role | QA | Contract đúng; regression |
| H5 | Area label `m2` vs `m²` | FE | Nhỏ — label đã có unit, có thể chuẩn hóa typography |

---

## 3. Backlog còn mở

### 3.1 Reliability — P0

| ID | Hạng mục | Owner | Việc |
|---|---|---|---|
| R1 | Shared validation mọi form | BOTH | Mirror BE (budget, dates, money) đều các form |
| R2 | Global toast host | FE | `notifyError`/`app:toast` chưa có UI listener |
| R3 | Payment error race sau PAID | FE | Modal đã suppress khi `!isPaid`; rà Panel + parent toast |
| R4 | Amount > 1 tỷ fail | BOTH | Reproduce payload/endpoint/provider |
| R5 | Past dates + (nếu P6) target ceiling | BOTH | Áp dụng đều; BE production dates |
| R6 | Realtime 13-flow E2E | BOTH | Test 2 browser |

### 3.2 Proposal / planner UX — P1–P2

| ID | Hạng mục | Owner | Việc |
|---|---|---|---|
| S1 | Floor-by-floor trên Customer Project Detail | FE | Group/filter theo tầng ngoài 3D preview |
| S2 | Select Proposal action rõ hơn | FE | Canonical ngoài panel nếu còn trùng |
| S3 | Legacy planner cleanup | FE | Gate `legacy-room-planner` khỏi flow chính |
| S4 | Proposal scene lag / product panel | FE | Profile + layout |
| S5 | Assignment Details cleanup | FE | Gọn; tách start-fee |
| S6 | Deselect sớm / clone | PRODUCT+BE | Chờ P3/P7 |

### 3.3 Quotation / payment / order — P1

| ID | Hạng mục | Owner | Việc |
|---|---|---|---|
| Q2 | Retry expired payment UI | FE | Nút Create again → create start-fee/deposit/remaining |
| Q3 | Strip qty/unitPrice khỏi financial payload | BOTH | FE vẫn gửi qty/unitPrice từ server; strip + BE reject |
| Q4 | Cột Delivery/Confirmation trên Customer Orders | FE / PRODUCT | Adjustment đã bỏ; Delivery còn vì Confirm Delivery — chốt có giữ không |
| Q5 | Discount grouping theo room/area | FE | Optional |
| Q6 | Label “Customer Note” đang bind `salesNote` | FE | Đổi thành Sales Note hoặc bind đúng field |
| Q7 | Final payment / manual Complete | PRODUCT | Giữ đến P2 |
| Q8 | Money rounding / large amount acceptance | BOTH | quotation(14,2) vs order/payment(12,2) |

### 3.4 Schedule / production / tracking — P1

| ID | Hạng mục | Owner | Việc |
|---|---|---|---|
| T1 | Customer reschedule + Sale approve | PRODUCT+BE→FE | Chờ P8 |
| T2 | Production calendar UI | FE | Trên schedule types hiện có |
| T3 | Update estimated dates ProductionRequest | PRODUCT+BE | Khác appointment |
| T4 | Mark Blocked structured | PRODUCT→BE→FE | Chờ P11 |
| T5 | Product grouping thống nhất | FE | Production / Ready / Tracking / Sale |
| T6 | Tracking status ≠ Production item | BOTH | Không invent status |
| T7 | Production mock → API | FE | Dashboard / My Tasks / Blocked Issues |
| T8 | Last Delivered copy | PRODUCT+FE | Chờ P10 |

### 3.5 UI polish — P2

| ID | Hạng mục | Owner |
|---|---|---|
| U1 | Product Detail image scroll | FE |
| U2 | Customer Project Detail (files, floor, actions polish) | FE |
| U3 | Production Request Queue layout | FE |

---

## 4. Realtime còn lại

### Runtime test (code đã có)

Start fee create/pay → schedule → proposal selected → quotation → deposit → production assign/complete → delivered qty → delivery confirm → remaining create/pay → order complete.

### BE gaps

1. Deposit paid thiếu `order.updated` (FE có thể dựa `payment.updated`).
2. Production start thiếu `order.updated` / `project.status.changed`.
3. `project_schedule.completed` thiếu reference metadata.

---

## 5. Roadmap còn lại

| Phase | Focus |
|---|---|
| 0 | Product P1–P12 |
| 1 P0 | R1–R6 + realtime E2E + BE event gaps |
| 2 P1 | S1–S5, H2–H3, H5 |
| 3 P1 | Q2–Q8 |
| 4 P1 | T1–T8 |
| 5 P2 | U1–U3, S4 |

---

## 6. Release gates

Done chỉ khi: FE+BE cùng rule, lỗi hiện UI, cross-role không refresh, BE enforce transition, happy+unhappy pass.

Unhappy còn liên quan:

- Retry payment expired
- Amount overflow (khi reproduce)
- Reopen bị chặn khi deposit paid / production created
- Accept custom khi feasibility PENDING → disabled
- Custom không MODEL_3D → không vào planner
- Production incomplete → không Complete
- Duplicate realtime/webhook

---

## 7. Tóm tắt sau re-scan

**Merge đã đóng:** customize full loop, reopen, deposit quotation, update area, Custom planner tab, chat modal, customer accept custom version.

**Còn làm chính:** toast/validation, payment retry UI, salesNote label, realtime E2E, schedule/reschedule Product, Mark Blocked redesign, production calendar/grouping/tracking, UI polish.

**Còn Product:** P1–P12.
