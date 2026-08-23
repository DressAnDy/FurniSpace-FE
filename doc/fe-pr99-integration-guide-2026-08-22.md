# FE Integration Guide - Merge PR #99

**Ngày:** 2026-08-22  
**Nguồn nhanh:** `docs/fe-integration-changelog-2026-08-22.md`  
**Mục tiêu:** tài liệu này viết chi tiết hơn changelog để FE biết API nào cần thêm/sửa, payload/response shape, flow nghiệp vụ, role permission và các error cần map message.

> Tất cả route bên dưới đang đi qua `BaseApiController` với prefix global `api/[controller]`, nhưng nhiều controller override route bằng absolute route như `/projects/...`. Nếu FE hiện đã cấu hình base URL là `/api`, giữ cách gọi hiện tại. Ví dụ trong tài liệu ghi `/orders/{orderId}/delivery-tracking` thì FE thường gọi `${API_BASE}/orders/{orderId}/delivery-tracking`.

---

## 1. Tổng quan thay đổi FE cần ưu tiên

### P0 - cần sửa ngay để không gãy flow

1. **Delivery flow chuyển sang multi-schedule / partial delivery.**
   - Không dùng normal flow cũ `start-delivery`, `complete-delivery`, `prepare-final-payment`.
   - FE phải tạo `DELIVERY` schedule trước, customer confirm schedule, production tạo delivery batch gắn đúng `projectScheduleId`, rồi complete batch.
   - Customer chỉ final confirm delivery khi đã giao đủ 100%.

2. **Tạo delivery batch bắt buộc có `projectScheduleId`.**
   - Request cũ không gắn schedule sẽ bị `PROJECT_SCHEDULE_ID_REQUIRED`.
   - Một schedule delivery chỉ được dùng cho tối đa một batch.

3. **Room Planner v3 là breaking change.**
   - `schemaVersion` phải là `3`.
   - Root `layout` cũ không còn là source of truth.
   - Source of truth là `blueprintLayout.floors[]`.
   - Object scene giờ có thêm nhóm layout asset, không phải object nào cũng có `productVersionId`.

4. **Sales không còn là người thực hiện delivery.**
   - Sales có thể xem tracking và điều phối.
   - Production assigned hoặc Admin mới tạo/sửa delivery schedule và tạo/complete batch theo business rule.

### P1 - nên làm trong cùng đợt

1. Thêm màn tracking delivery bằng `GET /orders/{orderId}/delivery-tracking`.
2. Thêm gallery measurement images và link ảnh vào project area.
3. Thêm admin layout asset catalog cho Room Planner.
4. Thêm showcase CMS và public portfolio.
5. Update UI phase deadlines với `startedAt`, `completedAt`, `status`, `overdueDays`.

---

## 2. Quy ước response/error

Backend vẫn trả envelope `ServiceResult`, không đổi auth/JWT/cookie.

FE nên unwrap theo shape quen thuộc:

```ts
type ServiceResult<T> = {
  status: number;
  success?: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    code?: string;
    message?: string;
    field?: string;
  }>;
};
```

Khi map lỗi, ưu tiên `errors[].code`. Một số service trả `403` không kèm code riêng, FE vẫn nên hiện message chung theo role.

---

## 3. Project phase timelines / deadlines

### API

| Method | Path | Role | Ghi chú |
| --- | --- | --- | --- |
| GET | `/projects/{projectId}/phase-deadlines` | CUSTOMER, SALES, DESIGNER, PRODUCTION, ADMIN | Lấy timeline phase |
| PUT | `/projects/{projectId}/phase-deadlines` | SALES, ADMIN | Upsert deadline nội bộ |

Route giữ nguyên tên `phase-deadlines`, nhưng BE đã đổi storage sang timeline. FE không cần biết table.

### Response cần render

Mỗi item trong `phaseDeadlines[]` hoặc response của API deadline có thêm:

```ts
type ProjectPhaseDeadline = {
  phase: "REQUEST" | "DESIGN" | "QUOTATION" | "PRODUCTION" | "DELIVERY" | string;
  deadlineAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  status?: "PLANNED" | "ON_TRACK" | "OVERDUE" | "COMPLETED_ON_TIME" | "COMPLETED_LATE";
  overdueDays?: number;
};
```

### FE cần chỉnh

- `status`, `startedAt`, `completedAt`, `overdueDays` là read-only.
- Không gửi `status` trong `PUT`.
- Timeline UI nên tách:
  - chưa bắt đầu: `PLANNED`;
  - đang chạy đúng hạn: `ON_TRACK`;
  - đang chạy trễ: `OVERDUE`;
  - xong đúng hạn: `COMPLETED_ON_TIME`;
  - xong trễ: `COMPLETED_LATE`.

---

## 4. Project schedules

### API

| Method | Path | Role | Ghi chú |
| --- | --- | --- | --- |
| POST | `/projects/{projectId}/schedules` | SALES, PRODUCTION, ADMIN | Tạo schedule. Production chỉ được tạo một số type, đặc biệt DELIVERY |
| POST | `/project-schedules/{projectId}` | SALES, PRODUCTION, ADMIN | Alias cũ |
| GET | `/project-schedules?projectId=...` | CUSTOMER, SALES, DESIGNER, PRODUCTION, ADMIN | List schedule theo project |
| GET | `/project-schedules/my-assigned` | SALES, DESIGNER, PRODUCTION, ADMIN | Lịch của user hiện tại |
| GET | `/project-schedules/{scheduleId}` | CUSTOMER, SALES, DESIGNER, PRODUCTION, ADMIN | Detail |
| PATCH | `/project-schedules/{scheduleId}` | SALES, PRODUCTION, ADMIN | Update thông tin/thời gian |
| PATCH | `/project-schedules/{scheduleId}/status` | CUSTOMER, SALES, DESIGNER, PRODUCTION, ADMIN | Confirm/cancel/complete theo role rule |
| DELETE | `/project-schedules/{scheduleId}` | SALES, PRODUCTION, ADMIN | Delete/cancel logic tùy trạng thái |

### Query list

```ts
type ProjectScheduleListQuery = {
  projectId?: string; // required for GET /project-schedules
  scheduleType?: "MEASUREMENT" | "DELIVERY" | "HANDOVER" | "OTHER" | string;
  status?: "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | string;
  from?: string;
  to?: string;
  page?: number;  // default 1
  limit?: number; // default 20
};
```

### Create request

```ts
type CreateProjectScheduleRequest = {
  scheduleType: "MEASUREMENT" | "DELIVERY" | "HANDOVER" | "OTHER" | string;
  title?: string | null;
  description?: string | null;
  assignedStaffId?: string | null;
  scheduledStart: string;
  scheduledEnd?: string | null;
  location?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
};
```

### Schedule response fields

```ts
type ProjectSchedule = {
  scheduleId: string;
  projectId: string;
  projectAreaId?: string | null;
  createdBy?: string | null;
  assignedStaffId?: string | null;
  scheduleType?: string | null;
  title?: string | null;
  description?: string | null;
  scheduledStart: string;
  scheduledEnd?: string | null;
  location?: string | null;
  status?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null; // mới
  canMoveToProposalConsulting?: boolean | null;
};
```

### Rule chung FE cần handle

- `scheduledEnd` nếu có phải sau `scheduledStart`.
- Complete schedule trước `scheduledStart` sẽ lỗi `SCHEDULE_COMPLETE_BEFORE_START`.
- Overlap staff sẽ lỗi `STAFF_SCHEDULE_OVERLAP`.
- Với schedule `DELIVERY`, BE cho `scheduledStart >= now - 1 phút`.
- Với schedule khác, `scheduledStart` vẫn phải ở tương lai.
- Khi production update thời gian schedule `CONFIRMED`, BE reset về `PENDING_CONFIRMATION`; FE phải yêu cầu customer confirm lại.
- `completedAt` được set khi schedule chuyển `COMPLETED`.

### Rule riêng DELIVERY schedule

Production assigned hoặc Admin được tạo/sửa delivery schedule khi:

- project/order đang `READY_FOR_DELIVERY` hoặc `DELIVERING`;
- production request đã `COMPLETED`;
- còn số lượng cần giao;
- customer chưa final confirm full delivery;
- delivery schedule chưa bị batch in-progress chặn cancel.

Sales không nên thấy nút tạo delivery schedule. Nếu cố gọi có thể nhận `403`.

---

## 5. Measurement images

### API

| Method | Path | Role | Mục đích |
| --- | --- | --- | --- |
| POST | `/project-schedules/{scheduleId}/measurement-images` | DESIGNER, ADMIN | Register metadata sau khi upload Firebase |
| GET | `/project-schedules/{scheduleId}/measurement-images` | CUSTOMER, SALES, DESIGNER, ADMIN | Gallery theo schedule |
| GET | `/projects/{projectId}/measurement-images` | CUSTOMER, SALES, DESIGNER, ADMIN | Gallery toàn project |
| GET | `/project-areas/{projectAreaId}/measurement-images` | CUSTOMER, SALES, DESIGNER, ADMIN | Gallery theo area |
| POST | `/project-areas/{projectAreaId}/measurement-images/{fileId}/link` | SALES, DESIGNER, ADMIN | Link ảnh vào area |
| DELETE | `/project-areas/{projectAreaId}/measurement-images/{fileId}/link` | SALES, DESIGNER, ADMIN | Unlink ảnh khỏi area |

### Register request

```ts
type RegisterMeasurementImageRequest = {
  storagePath: string;
  publicUrl: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  visibility?: "PRIVATE" | "PROJECT" | "PUBLIC" | string | null;
  note?: string | null;
};
```

### Gallery query

```ts
type MeasurementImageGalleryQuery = {
  projectAreaId?: string; // chỉ có ở GET by schedule
  assigned?: boolean;     // true: đã link area, false: chưa link area
  page?: number;
  limit?: number;
};
```

### Gallery response

```ts
type MeasurementImageGalleryResponse = {
  items: MeasurementImageGalleryItem[];
  page: number;
  limit: number;
  total: number;
};

type MeasurementImageGalleryItem = {
  fileId: string;
  url: string;
  uploadedAt: string;
  measurementSchedule: {
    scheduleId: string;
    scheduledStart: string;
  };
  areas: Array<{
    projectAreaId: string;
    areaName: string;
  }>;
};
```

### FE flow đề xuất

1. Designer mở schedule `MEASUREMENT` đã `CONFIRMED`.
2. Chỉ cho upload/register khi thời gian hiện tại đã >= `scheduledStart`.
3. FE upload file lên Firebase như flow hiện tại.
4. Gọi `POST /project-schedules/{scheduleId}/measurement-images` để BE lưu metadata.
5. Gọi `POST /project-areas/{projectAreaId}/measurement-images/{fileId}/link` để gắn vào area.
6. Khi xem project/area, dùng gallery endpoint tương ứng.

### Error nên map

| Code | Khi nào |
| --- | --- |
| `MEASUREMENT_IMAGE_SCHEDULE_NOT_ELIGIBLE` | Schedule không phải measurement, chưa confirmed hoặc không đủ điều kiện register ảnh |
| `MEASUREMENT_IMAGE_CAPTURE_BEFORE_START` | Chưa tới giờ đo |
| `MEASUREMENT_IMAGE_INVALID_FILE_METADATA` | Metadata file thiếu/sai |
| `MEASUREMENT_IMAGE_STORAGE_PATH_INVALID` | `storagePath` không hợp lệ |
| `MEASUREMENT_IMAGE_STORAGE_PATH_DUPLICATE` | `storagePath` đã được register |
| `MEASUREMENT_IMAGE_NOT_FOUND` | File không phải measurement image hoặc không tìm thấy |
| `MEASUREMENT_IMAGE_AREA_LINK_EXISTS` | Ảnh đã link area |
| `MEASUREMENT_IMAGE_AREA_LINK_NOT_FOUND` | Unlink ảnh chưa link |
| `MEASUREMENT_IMAGE_SCHEDULE_PROJECT_MISMATCH` | Schedule không thuộc project/area đang thao tác |

---

## 6. Delivery multi-schedule / partial delivery

Đây là thay đổi quan trọng nhất của PR #99.

### Normal flow mới

```text
Production request COMPLETED
-> Production/Admin tạo 1 hoặc nhiều DELIVERY schedules
-> Customer confirm từng schedule
-> Production assigned tạo delivery batch với projectScheduleId
   -> Batch đầu tiên tự chuyển Order/Project sang DELIVERING
-> Production complete batch
   -> BE cộng deliveredQuantity vào order items
   -> BE set linked schedule COMPLETED
-> Lặp lại cho tới khi remainingQuantity = 0
-> BE auto-cancel future delivery schedules chưa dùng
-> Customer gọi confirm-delivery cuối cùng
-> BE tạo/reuse remaining payment nếu còn công nợ
```

### API delivery

| Method | Path | Role attribute | Permission thực tế | Ghi chú |
| --- | --- | --- | --- | --- |
| GET | `/orders/{orderId}/delivery-tracking` | CUSTOMER, SALES, PRODUCTION, ADMIN | Các role thuộc project/viewable PR | Màn tracking chính |
| GET | `/orders/{orderId}/deliveries` | CUSTOMER, SALES, PRODUCTION, ADMIN | Các role thuộc project/viewable PR | List batch |
| GET | `/orders/{orderId}/deliveries/{deliveryId}` | CUSTOMER, SALES, PRODUCTION, ADMIN | Các role thuộc project/viewable PR | Detail batch |
| POST | `/orders/{orderId}/deliveries` | SALES, PRODUCTION, ADMIN | PRODUCTION assigned completed PR hoặc ADMIN | Tạo batch; Sales sẽ bị 403 ở service |
| PATCH | `/orders/{orderId}/deliveries/{deliveryId}/complete` | SALES, PRODUCTION, ADMIN | PRODUCTION assigned completed PR hoặc ADMIN | Complete batch; Sales sẽ bị 403 ở service |
| PATCH | `/orders/{orderId}/confirm-delivery` | CUSTOMER | Customer của project | Final confirm khi đã giao đủ |

### Deprecated / không dùng trong normal FE

| Method | Path | Hiện trạng |
| --- | --- | --- |
| PATCH | `/orders/{orderId}/start-delivery` | `[Obsolete]`, ADMIN only |
| PATCH | `/orders/{orderId}/complete-delivery` | `[Obsolete]`, ADMIN only |
| PATCH | `/orders/{orderId}/prepare-final-payment` | `[Obsolete]`, ADMIN only |

### Create delivery batch request

```ts
type CreateDeliveryBatchRequest = {
  projectScheduleId: string; // required
  note?: string | null;
  items: Array<{
    orderItemId: string;
    quantity: number; // > 0, không vượt remainingDeliveryQuantity
    note?: string | null;
  }>;
};
```

### Batch response

```ts
type DeliveryDetail = {
  deliveryId: string;
  orderId: string;
  projectScheduleId?: string | null;
  schedule?: {
    projectScheduleId: string;
    scheduledStart: string;
    scheduledEnd?: string | null;
    completedAt?: string | null;
    status?: "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | string | null;
    assignedStaffId?: string | null;
  } | null;
  status?: "IN_PROGRESS" | "COMPLETED" | null;
  createdBy?: string | null;
  completedBy?: string | null;
  note?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  itemCount: number;
  items: Array<{
    deliveryItemId: string;
    deliveryId: string;
    orderItemId: string;
    quantity: number;
    note?: string | null;
    productNameSnapshot?: string | null;
    itemName?: string | null;
  }>;
};
```

Batch cũ trước migration có thể có `projectScheduleId: null`; FE nên render read-only lịch sử, không cho complete nếu không có schedule.

### Delivery tracking response

FE nên ưu tiên endpoint này cho màn delivery progress thay vì tự join order items + schedules + deliveries.

```ts
type OrderDeliveryTracking = {
  orderId: string;
  orderStatus?: "READY_FOR_DELIVERY" | "DELIVERING" | "COMPLETED" | string | null;
  summary: {
    totalOrderedQuantity: number;
    totalDeliveredQuantity: number;
    remainingQuantity: number;
    deliveryProgressPercent: number;
    completedDeliveryCount: number;
    upcomingDeliveryCount: number;
    nextDeliveryAt?: string | null;
  };
  items: Array<{
    orderItemId: string;
    productName?: string | null;
    orderedQuantity: number;
    deliveredQuantity: number;
    remainingQuantity: number;
    status?: "READY" | "PARTIALLY_DELIVERED" | string | null;
  }>;
  timeline: Array<{
    projectScheduleId: string;
    deliveryId?: string | null;
    scheduledStart: string;
    scheduledEnd?: string | null;
    scheduleStatus?: string | null;
    deliveryStatus?: "IN_PROGRESS" | "COMPLETED" | null;
    completedAt?: string | null;
    cancelReason?: string | null;
    items: Array<{
      orderItemId: string;
      productName?: string | null;
      deliveredQuantity: number;
    }>;
  }>;
};
```

### FE rule khi tạo batch

Schedule được chọn phải thỏa:

- cùng project với order;
- `scheduleType = DELIVERY`;
- `status = CONFIRMED`;
- `now >= scheduledStart - 1 phút`;
- chưa có batch khác;
- `assignedStaffId` là production user hiện tại, trừ Admin;
- order đang `READY_FOR_DELIVERY` hoặc `DELIVERING`;
- production request đã `COMPLETED`;
- `items[].quantity` không vượt remaining của từng item.

### FE rule khi complete batch

- Chỉ show nút complete khi batch `IN_PROGRESS`.
- Complete batch tự:
  - set batch `COMPLETED`;
  - cộng `deliveredQuantity`;
  - set item status `PARTIALLY_DELIVERED` nếu chưa đủ, `READY` nếu đủ;
  - set linked schedule `COMPLETED`;
  - nếu hết remaining, auto-cancel future unused delivery schedules với `cancelReason/internalNote = ALL_ITEMS_ALREADY_DELIVERED`.

### FE rule final confirm

Customer gọi `PATCH /orders/{orderId}/confirm-delivery` chỉ khi:

- `summary.remainingQuantity = 0`;
- không còn batch `IN_PROGRESS`;
- không còn delivery schedule `CONFIRMED` chưa có batch.

Nếu còn công nợ, BE vẫn xử lý remaining payment theo flow hiện tại.

### Field mới trên order/project

Order item có:

```ts
type OrderItemDeliveryFields = {
  deliveredQuantity: number;
  remainingDeliveryQuantity: number;
  status?: "PARTIALLY_DELIVERED" | string;
};
```

Project detail có:

```ts
type ProjectDeliverySummary = {
  status?: string | null;
  deliveredQuantity: number;
  totalQuantity: number;
  remainingQuantity: number;
  deliveryProgressPercent: number;
  nextDeliveryAt?: string | null;
};
```

### Error delivery cần map

| Code | HTTP thường gặp | FE message gợi ý |
| --- | --- | --- |
| `PROJECT_SCHEDULE_ID_REQUIRED` | 400 | Vui lòng chọn lịch giao hàng đã được khách xác nhận. |
| `DELIVERY_BATCH_EMPTY` | 400 | Vui lòng chọn ít nhất một sản phẩm để giao. |
| `DELIVERY_SCHEDULE_INVALID` | 400/404 | Lịch giao hàng không hợp lệ cho đơn này. |
| `DELIVERY_SCHEDULE_NOT_CONFIRMED` | 400 | Khách hàng chưa xác nhận lịch giao hàng. |
| `DELIVERY_SCHEDULE_NOT_STARTED` | 400 | Chưa tới thời gian bắt đầu giao hàng. |
| `DELIVERY_SCHEDULE_ALREADY_USED` | 409 | Lịch này đã được dùng cho batch khác. |
| `DUPLICATE_ORDER_ITEM_IN_BATCH` | 400 | Một sản phẩm chỉ được chọn một lần trong cùng batch. |
| `ORDER_ITEM_NOT_DELIVERABLE` | 400 | Có sản phẩm không đủ điều kiện giao. |
| `INVALID_DELIVERY_QUANTITY` | 409 | Số lượng giao vượt quá số lượng còn lại. |
| `PRODUCTION_NOT_COMPLETED` | 409 | Production request chưa hoàn tất. |
| `DELIVERY_BATCH_IN_PROGRESS` | 409 | Còn batch đang giao. |
| `UNRESOLVED_DELIVERY_SCHEDULE` | 409 | Còn lịch giao đã confirm nhưng chưa thực hiện. |
| `DELIVERABLE_ITEMS_NOT_DELIVERED` | 409 | Chưa giao đủ toàn bộ sản phẩm. |

---

## 7. Layout assets catalog

Layout asset là catalog mới phục vụ Room Planner v3: vật liệu tường/sàn, cửa, cửa sổ, cầu thang, cột, dầm, đồ trang trí...

### Admin API

| Method | Path | Role | Mục đích |
| --- | --- | --- | --- |
| POST | `/layout-assets` | ADMIN | Tạo asset metadata |
| GET | `/layout-assets` | ADMIN | List toàn bộ asset, mọi status |
| GET | `/layout-assets/{layoutAssetId}` | ADMIN, DESIGNER | Detail |
| PATCH | `/layout-assets/{layoutAssetId}` | ADMIN | Update metadata |
| PATCH | `/layout-assets/{layoutAssetId}/status` | ADMIN | ACTIVE/INACTIVE/ARCHIVED |
| POST | `/layout-assets/{layoutAssetId}/files` | ADMIN | Upload file multipart |
| GET | `/layout-assets/{layoutAssetId}/files` | ADMIN | List file |
| PATCH | `/layout-assets/{layoutAssetId}/files/{fileId}/primary` | ADMIN | Set primary file |
| DELETE | `/layout-assets/{layoutAssetId}/files/{fileId}` | ADMIN | Delete/unlink file |

### Designer Room Planner catalog

| Method | Path | Role | Ghi chú |
| --- | --- | --- | --- |
| GET | `/room-planner/layout-assets` | DESIGNER, ADMIN | Catalog cho editor. Designer chỉ nên thấy ACTIVE |

### Query

```ts
type LayoutAssetQuery = {
  assetType?: LayoutAssetType;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  search?: string;
  page?: number;
  pageSize?: number;
};
```

### Create/update request

```ts
type CreateLayoutAssetRequest = {
  assetCode: string;
  assetName: string;
  assetType: LayoutAssetType;
  description?: string | null;
};

type UpdateLayoutAssetRequest = {
  assetName: string;
  assetType: LayoutAssetType;
  description?: string | null;
};
```

### Response

```ts
type LayoutAsset = {
  layoutAssetId: string;
  assetCode: string;
  assetName: string;
  assetType: LayoutAssetType;
  description?: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  files: LayoutAssetFile[];
  primaryModel?: LayoutAssetPrimaryFile | null;
  primaryTexture?: LayoutAssetPrimaryFile | null;
  primaryPreview?: LayoutAssetPrimaryFile | null;
};

type LayoutAssetFile = {
  fileId: string;
  fileType?: "MODEL_3D" | "TEXTURE" | "PREVIEW" | string | null;
  url: string;
  fileName: string;
  mimeType: string;
  isPrimary: boolean;
  displayOrder?: number | null;
  status: string;
};

type LayoutAssetPrimaryFile = {
  fileId: string;
  url: string;
};
```

### Enum LayoutAssetType

```ts
type LayoutAssetType =
  | "WALL_MATERIAL"
  | "FLOOR_MATERIAL"
  | "STAIR"
  | "DOOR"
  | "WINDOW"
  | "COLUMN"
  | "BEAM"
  | "DECORATIVE_WALL"
  | "DECORATIVE_FLOOR"
  | "DECORATIVE_OBJECT"
  | "OTHER";
```

### FE cần chỉnh

- Admin CMS: form create/update/status/files.
- Room Planner editor: fetch `/room-planner/layout-assets`, filter asset type theo tool đang dùng.
- Khi asset inactive nhưng scene cũ đang dùng, BE vẫn trả scene và add warning; FE nên render được nhưng báo asset đã inactive.

---

## 8. Room Planner schema v3

### API

| Method | Path | Role | Ghi chú |
| --- | --- | --- | --- |
| GET | `/proposal-scenes/{sceneId}/room-planner` | CUSTOMER, DESIGNER, SALES, ADMIN | Load scene |
| PUT | `/proposal-scenes/{sceneId}/room-planner` | DESIGNER, ADMIN | Save scene |
| POST | `/proposal-scenes/{sceneId}/room-planner/resolve-products` | CUSTOMER, DESIGNER, SALES, ADMIN | Resolve product detail cho furniture objects |
| GET | `/room-planner/layout-assets` | DESIGNER, ADMIN | Catalog layout asset |

### Payload root

```ts
type RoomPlannerScenePayloadV3 = {
  schemaVersion: 3;
  editorVersion?: string | null;
  unit: "meter" | string;
  blueprintLayout: RoomPlannerBlueprintLayout;
  objects: RoomPlannerObject[];
  layers: RoomPlannerLayer[];
  stylePreset?: string | null;
  camera: RoomPlannerCamera;
  lighting: RoomPlannerLighting;
  validation: RoomPlannerValidation;
  editorState?: RoomPlannerEditorState | null;
};
```

`layout` root cũ không còn được dùng làm source of truth. FE nên bỏ gửi `layout` trong payload mới hoặc không phụ thuộc vào nó khi load.

### Load response thêm context SQL

```ts
type RoomPlannerSceneResponse = RoomPlannerScenePayloadV3 & {
  sceneId: string;
  mongoSceneId?: string | null;
  proposalId?: string | null;
  projectId?: string | null;
  projectAreaIds: string[];
  areas: Array<{
    projectAreaId: string;
    areaName?: string | null;
    areaType?: string | null;
    floorNumber?: number | null;
  }>;
  areaBlueprints: Array<{
    projectAreaId: string;
    fileId: string;
    fileLinkId: string;
    fileType?: string | null;
    originalFileName: string;
    publicUrl: string;
    mimeType: string;
    displayOrder?: number | null;
    isPrimary: boolean;
  }>;
  lastSavedAt?: string | null;
};
```

### Blueprint layout là source of truth

```ts
type RoomPlannerBlueprintLayout = {
  id: string;
  name?: string | null;
  unit: "meter" | string;
  scale?: number | null;
  origin?: Point2 | null;
  northDirection?: number | null;
  floors: RoomPlannerBlueprintFloor[];
  metadata: Record<string, unknown>;
};

type RoomPlannerBlueprintFloor = {
  id: string;
  projectAreaId: string;
  name?: string | null;
  levelIndex?: number | null;
  elevation?: number | null;
  floorHeight?: number | null;
  slabThickness?: number | null;
  points: Point2[];
  walls: RoomPlannerWall[];
  doors: RoomPlannerOpening[];
  windows: RoomPlannerOpening[];
  openings: RoomPlannerOpening[];
  rooms: Record<string, unknown>[];
  slabs: Record<string, unknown>[];
  stairs: Record<string, unknown>[];
  balconies: Record<string, unknown>[];
  yards: Record<string, unknown>[];
  columns: Record<string, unknown>[];
  beams: Record<string, unknown>[];
  floorStyle?: SurfaceMaterial | null;
};
```

Mỗi SQL scene `ROOM_PLANNER` map với một hoặc nhiều `ProjectArea` floor. Khi save, `blueprintLayout.floors[].projectAreaId` phải khớp đúng danh sách area của scene.

### Object trong scene

```ts
type RoomPlannerObject = {
  objectId: string;
  proposalItemId?: string | null;
  productVersionId?: string | null;
  layoutAssetId?: string | null;
  layoutAssetType?: LayoutAssetType | string | null;
  productModelId?: string | null;
  objectType: "FURNITURE" | "LAYOUT_ASSET" | "STRUCTURAL_ASSET" | "DECORATIVE_ASSET" | string;
  name?: string | null;
  floorId?: string | null;
  placement: {
    mode: "FLOOR" | "WALL" | "CEILING" | string;
    heightOffset?: number | null;
    supportObjectId?: string | null;
    mountedWallId?: string | null;
  };
  transform: {
    position: Vector3;
    rotation: Vector3;
    scale: Vector3;
  };
  dimensionsSnapshot: {
    width?: number | null;
    height?: number | null;
    depth?: number | null;
    unit: "cm" | "meter" | string;
  };
  visualSnapshot?: {
    thumbnailFileId?: string | null;
    thumbnailUrlSnapshot?: string | null;
    material?: string | null;
    color?: string | null;
    finish?: string | null;
  } | null;
  modelSnapshot?: {
    modelFileId?: string | null;
    format?: string | null;
    modelUrlSnapshot?: string | null;
  } | null;
  materialOverrides: Record<string, unknown>;
  visible: boolean;
  locked: boolean;
};
```

### Object validation rule

| Object type | Required | Không nên gửi |
| --- | --- | --- |
| `FURNITURE` | `productVersionId` | `layoutAssetId` nếu không phải asset |
| `LAYOUT_ASSET` | `layoutAssetId`, `layoutAssetType` | `productVersionId` |
| `STRUCTURAL_ASSET` | `layoutAssetId`, `layoutAssetType` | `productVersionId` |
| `DECORATIVE_ASSET` | `layoutAssetId`, `layoutAssetType` | `productVersionId` |

### Surface material

Wall style và floor style có thể gắn layout asset:

```ts
type SurfaceMaterial = {
  layoutAssetId?: string | null;
  materialId?: string | null;
  color?: string | null;
  materialCode?: string | null;
  textureFileId?: string | null;
  textureUrlSnapshot?: string | null;
  textureRotation?: number | null;
  textureScale?: number | null;
};
```

Rule:

- wall material chỉ dùng asset type `WALL_MATERIAL`;
- floor material chỉ dùng asset type `FLOOR_MATERIAL`;
- inactive asset có thể sinh warning `LAYOUT_ASSET_INACTIVE`.

### Resolve products

Chỉ gửi `productVersionId` của object `FURNITURE`.

```ts
type ResolveRoomPlannerProductsRequest = {
  productVersionIds: string[];
};
```

Response:

```ts
type ResolveRoomPlannerProductsResponse = {
  sceneId: string;
  projectId: string;
  items: Array<{
    productVersionId: string;
    productId: string;
    productName?: string | null;
    versionCode: string;
    versionName: string;
    versionType?: string | null;
    material?: string | null;
    color?: string | null;
    width?: number | null;
    height?: number | null;
    depth?: number | null;
    dimensionUnit?: string | null;
    estimatedPrice?: number | null;
    isProjectSpecific?: boolean | null;
    files: unknown[];
  }>;
};
```

### Error Room Planner cần map

| Code | Khi nào |
| --- | --- |
| `ROOM_PLANNER_SCHEMA_VERSION_UNSUPPORTED` | Không gửi `schemaVersion = 3` |
| `ROOM_PLANNER_SCENE_REQUIRED` | Scene không phải type `ROOM_PLANNER` |
| `ROOM_PLANNER_DOCUMENT_INVALID` | Payload thiếu/sai cấu trúc |
| `BLUEPRINT_LAYOUT_REQUIRED` | Thiếu `blueprintLayout` |
| `BLUEPRINT_FLOOR_REQUIRED` | Không có floor |
| `BLUEPRINT_FLOOR_MAPPING_MISMATCH` | Floors không khớp SQL scene areas |
| `ROOM_PLANNER_OBJECT_TYPE_INVALID` | Object type/required fields sai |
| `ROOM_PLANNER_LAYOUT_ASSET_FORBIDDEN` | Dùng layout asset không hợp lệ |
| `ROOM_PLANNER_SURFACE_MATERIAL_INVALID` | Gắn sai material asset |
| `LAYOUT_ASSET_NOT_FOUND` | Asset không tồn tại |
| `LAYOUT_ASSET_INACTIVE` | Asset inactive, thường xuất hiện dưới warning |

---

## 9. Portfolio / project showcase

### Internal showcase API

| Method | Path | Role | Mục đích |
| --- | --- | --- | --- |
| POST | `/projects/{projectId}/showcase` | SALES, ADMIN | Tạo showcase cho project |
| GET | `/projects/{projectId}/showcase` | SALES, DESIGNER, ADMIN | Lấy showcase theo project |
| PATCH | `/project-showcases/{showcaseId}` | SALES, ADMIN | Update metadata |
| PATCH | `/project-showcases/{showcaseId}/submit` | SALES, ADMIN | Submit review |
| PATCH | `/project-showcases/{showcaseId}/publish` | ADMIN | Publish public |
| PATCH | `/project-showcases/{showcaseId}/archive` | ADMIN | Archive |

### Media API

| Method | Path | Role | Mục đích |
| --- | --- | --- | --- |
| POST | `/project-showcases/{showcaseId}/media` | SALES, DESIGNER, ADMIN | Add media bằng `fileId` |
| PATCH | `/project-showcases/{showcaseId}/media/reorder` | SALES, DESIGNER, ADMIN | Sắp xếp media |
| PATCH | `/project-showcases/{showcaseId}/media/{mediaId}/cover` | SALES, DESIGNER, ADMIN | Set cover |
| DELETE | `/project-showcases/{showcaseId}/media/{mediaId}` | SALES, DESIGNER, ADMIN | Remove media |

### Public API

| Method | Path | Auth | Mục đích |
| --- | --- | --- | --- |
| GET | `/public/showcases?page=1&pageSize=12` | none | List published showcase |
| GET | `/public/showcases/{slug}` | none | Detail public |

### Request/response type

```ts
type CreateProjectShowcaseRequest = {
  title?: string | null;
  summary?: string | null;
  description?: string | null;
};

type UpdateProjectShowcaseRequest = {
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  slug?: string | null;
  featuredReviewId?: string | null;
};

type AddProjectShowcaseMediaRequest = {
  fileId: string;
  mediaType: "BEFORE" | "AFTER" | "FINAL" | "DETAIL" | "OTHER";
  title?: string | null;
  caption?: string | null;
  setAsCover: boolean;
};

type ProjectShowcase = {
  projectShowcaseId: string;
  projectId: string;
  featuredReviewId?: string | null;
  featuredReviewAllowPublicDisplay: boolean;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
  createdBy?: string | null;
  approvedBy?: string | null;
  publishedBy?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  businessType?: string | null;
  projectStatus?: string | null;
  media: ProjectShowcaseMedia[];
};
```

### Publish rule

Admin publish được khi:

- project đã `COMPLETED`;
- showcase có `title`;
- showcase có `summary`;
- có ít nhất một media `isCover = true`.

Mỗi project chỉ có một showcase.

### Public list/detail shape

```ts
type PublicShowcaseListItem = {
  projectShowcaseId: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  businessType?: string | null;
  publishedAt?: string | null;
};

type PublicShowcaseDetail = {
  projectShowcaseId: string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  projectName: string;
  businessType?: string | null;
  publishedAt?: string | null;
  review?: {
    reviewId: string;
    rating?: number | null;
    designQualityRating?: number | null;
    serviceQualityRating?: number | null;
    deliveryRating?: number | null;
    comment?: string | null;
  } | null;
  media: ProjectShowcaseMedia[];
};
```

### Error showcase cần map

| Code | Khi nào |
| --- | --- |
| `PROJECT_SHOWCASE_ALREADY_EXISTS` | Project đã có showcase |
| `PROJECT_SHOWCASE_PUBLISH_REQUIREMENTS_NOT_MET` | Chưa đủ điều kiện publish |
| `PROJECT_SHOWCASE_SLUG_DUPLICATE` | Slug trùng |
| `PROJECT_SHOWCASE_ARCHIVED_READ_ONLY` | Showcase archived không cho sửa |

---

## 10. Review public consent

### API

| Method | Path | Role |
| --- | --- | --- |
| PATCH | `/project-reviews/{reviewId}/public-consent` | CUSTOMER |

Request:

```ts
type UpdateReviewPublicConsentRequest = {
  allowPublicDisplay: boolean;
};
```

FE cần thêm toggle ở màn customer review. Chỉ review có consent mới nên được dùng làm public featured review.

Error cần map: `PROJECT_REVIEW_CONSENT_FORBIDDEN`.

---

## 11. Designer capacity

BE nâng soft cap designer:

```ts
maxActiveProjects: 2 -> 3
capacityState: "AVAILABLE" | "FULL" | "OVER"
```

FE cần chỉnh:

- designer picker không hard-code 2 project;
- workload/admin dashboard hiển thị cap 3;
- `FULL`/`OVER` là cảnh báo soft cap, không phải lúc nào cũng block assign cứng.

---

## 12. Checklist chỉnh FE theo màn hình

### Production delivery screen

- [ ] Load order detail và `GET /orders/{orderId}/delivery-tracking`.
- [ ] Load confirmed delivery schedules của project.
- [ ] Chỉ cho chọn schedule `DELIVERY + CONFIRMED + assignedStaffId = currentUserId + chưa có deliveryId`.
- [ ] Form tạo batch gửi `projectScheduleId`, `items[].orderItemId`, `items[].quantity`.
- [ ] Validate quantity <= `remainingQuantity` từ tracking.
- [ ] Sau create batch, refetch tracking và delivery detail.
- [ ] Complete batch bằng `/orders/{orderId}/deliveries/{deliveryId}/complete`.
- [ ] Không gọi `start-delivery` / `complete-delivery`.

### Customer schedule/delivery screen

- [ ] Customer confirm từng delivery schedule như flow schedule hiện tại.
- [ ] Tracking progress dùng `/orders/{orderId}/delivery-tracking`.
- [ ] Nút final confirm chỉ enable khi `remainingQuantity = 0`, không có batch in-progress và không có confirmed schedule chưa execute.
- [ ] Hiển thị timeline cancel reason `ALL_ITEMS_ALREADY_DELIVERED` là "Đã giao đủ, lịch sau tự hủy".

### Sales dashboard

- [ ] Ẩn action tạo delivery schedule/batch.
- [ ] Giữ read-only tracking để sales điều phối.
- [ ] Showcase CMS: create/update/submit, media CRUD.

### Room Planner editor

- [ ] Migrate local scene model lên `schemaVersion = 3`.
- [ ] Render/save theo `blueprintLayout.floors[]`.
- [ ] Object `FURNITURE` dùng `productVersionId`.
- [ ] Object asset dùng `layoutAssetId + layoutAssetType`, không cần `productVersionId`.
- [ ] Fetch `/room-planner/layout-assets` cho palette.
- [ ] Resolve products chỉ gửi furniture productVersionIds.
- [ ] Render warning `LAYOUT_ASSET_INACTIVE`.

### Admin

- [ ] Layout asset CRUD + file upload + set primary.
- [ ] Showcase publish/archive.
- [ ] Designer workload cap 3.

### Public site

- [ ] Portfolio list dùng `/public/showcases`.
- [ ] Portfolio detail dùng `/public/showcases/{slug}`.
- [ ] Không cần auth.

---

## 13. Migration/test note cho BE-dev local

Trước khi FE test delivery mới trên local/dev database, BE cần chạy migration:

```bash
dotnet ef database update --project src/FurniSpace.Infrastructure
```

Migration liên quan:

- `20260822150000_AddDeliveryBatchTables`
- `20260822170000_EnsureProjectScheduleCompletedAtColumn`
- `20260822180000_AddDeliveryProjectScheduleId`
- `20260822160000_AddProjectShowcasePortfolio`
- `20260822153000_AddFileTypePreview`

---

## 14. Danh sách endpoint mới/sửa nhanh

```text
Schedules:
GET    /project-schedules?projectId=...
GET    /project-schedules/my-assigned
POST   /projects/{projectId}/schedules
PATCH  /project-schedules/{scheduleId}
PATCH  /project-schedules/{scheduleId}/status

Measurement:
POST   /project-schedules/{scheduleId}/measurement-images
GET    /project-schedules/{scheduleId}/measurement-images
GET    /projects/{projectId}/measurement-images
GET    /project-areas/{projectAreaId}/measurement-images
POST   /project-areas/{projectAreaId}/measurement-images/{fileId}/link
DELETE /project-areas/{projectAreaId}/measurement-images/{fileId}/link

Delivery:
GET    /orders/{orderId}/delivery-tracking
GET    /orders/{orderId}/deliveries
GET    /orders/{orderId}/deliveries/{deliveryId}
POST   /orders/{orderId}/deliveries
PATCH  /orders/{orderId}/deliveries/{deliveryId}/complete
PATCH  /orders/{orderId}/confirm-delivery

Layout assets:
GET    /room-planner/layout-assets
POST   /layout-assets
GET    /layout-assets
GET    /layout-assets/{layoutAssetId}
PATCH  /layout-assets/{layoutAssetId}
PATCH  /layout-assets/{layoutAssetId}/status
POST   /layout-assets/{layoutAssetId}/files
GET    /layout-assets/{layoutAssetId}/files
PATCH  /layout-assets/{layoutAssetId}/files/{fileId}/primary
DELETE /layout-assets/{layoutAssetId}/files/{fileId}

Room Planner:
GET    /proposal-scenes/{sceneId}/room-planner
PUT    /proposal-scenes/{sceneId}/room-planner
POST   /proposal-scenes/{sceneId}/room-planner/resolve-products

Showcase:
POST   /projects/{projectId}/showcase
GET    /projects/{projectId}/showcase
PATCH  /project-showcases/{showcaseId}
PATCH  /project-showcases/{showcaseId}/submit
PATCH  /project-showcases/{showcaseId}/publish
PATCH  /project-showcases/{showcaseId}/archive
POST   /project-showcases/{showcaseId}/media
PATCH  /project-showcases/{showcaseId}/media/reorder
PATCH  /project-showcases/{showcaseId}/media/{mediaId}/cover
DELETE /project-showcases/{showcaseId}/media/{mediaId}
GET    /public/showcases
GET    /public/showcases/{slug}

Review:
PATCH  /project-reviews/{reviewId}/public-consent
```
