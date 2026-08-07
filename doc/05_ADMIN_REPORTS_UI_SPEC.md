# FurniSpace — Admin Reports Page UI Specification


> Purpose: Give Codex a concrete UI implementation brief for an existing FurniSpace dashboard page.
>
> Source of truth:
> - Use the existing project structure and existing APIs first.
> - Use the current Figma design, shared layout, sidebar, navbar, typography, spacing, and components as the visual source.
> - Do not redesign the entire application or replace the current architecture.
> - Do not remove existing API integration, business logic, routes, guards, or reusable components.
> - Dashboard data may use realistic mock values only when a required endpoint is not available.
> - Clearly mark mocked sections in code so they can be replaced later.
> - Do not add legacy roles or flows such as Delivery Staff, deliveries, delivery_items, consultation_requests, partial payment, automatic Production Request creation, or automatic Project completion.


## 1. Page objective

Build a separate Admin Reports page for historical analysis, trend review, drill-down, and export.

The distinction must remain clear:

- `Admin Dashboard` = current operational state and urgent actions.
- `Admin Reports` = historical trends, performance analysis, comparison, and downloadable results.

## 2. Recommended page header

Display:

- Title: `Reports`
- Subtitle: `Business, project, commercial, production, delivery, and catalog analysis`
- Report date range
- Compare with previous period toggle
- Business type filter
- Project type/status filter
- Sales filter
- Designer filter
- Production filter
- Export action
- Last generated time

## 3. Report navigation

Recommended tabs or left-side report navigation:

1. Overview
2. Projects
3. Sales
4. Designer
5. Production
6. Quotations
7. Orders & Payments
8. Delivery
9. Schedules
10. Catalog
11. Customer Experience

Keep one shared filter bar across report tabs.

## 4. Overview Report

Recommended summary:

- Projects created
- Projects completed
- Completion rate
- Average lifecycle duration
- Quotation acceptance rate
- Accepted quotation value
- Order final total
- Amount collected
- Outstanding amount
- Production on-time rate
- Delivery on-time rate
- Average customer rating

Recommended visualizations:

- Project creation/completion trend
- Project pipeline distribution
- Commercial trend
- Production and Delivery status summary
- Top operational risks

Use no more than 3 major charts on the Overview tab.

## 5. Project Performance Report

Metrics:

- Projects created
- Projects approved/rejected
- Projects completed
- Completion rate
- Rejection rate
- Average lifecycle duration
- Average time per major phase
- Status distribution
- Projects by business type
- Projects by Sales
- Projects by Designer
- Overdue rate
- Proposal revision rate

Table fields:

- Project
- Customer
- Business type
- Sales
- Designer
- Created date
- Current/final status
- Duration
- Delay
- Completion date

## 6. Sales Performance Report

Operational metrics:

- Requests handled
- Request approval rate
- Average first-response time
- Active Projects
- Quotations created/sent
- Quotation acceptance rate
- Average quotation value
- Payment follow-ups
- Projects completed
- Average managed Project duration
- At-risk Project count

Do not measure Sales only by commercial value.

## 7. Designer Performance Report

Metrics:

- Projects assigned
- Measurements completed
- Proposals created
- Proposals published
- First-draft turnaround
- Average revisions
- Proposal selection rate
- Room Planner scenes completed
- Customization Requests resolved
- Overdue design tasks

Only calculate metrics supported by current timestamps and ownership data.

## 8. Production Performance Report

Metrics:

- Production Requests received
- Requests started
- Requests completed
- Average production duration
- On-time completion rate
- Production Items completed
- Blocked rate
- Unavailable rate
- Average blocked duration
- Customization feasibility turnaround
- Workload by Production staff
- Production by category/material

Recommended detail table:

- Production Request
- Project
- Assigned staff
- Item count
- Blocked count
- Started date
- Due date
- Completed date
- Duration
- Status

## 9. Quotation Report

Metrics:

- Draft
- Sent
- Accepted
- Rejected
- Expired
- Revision requested
- Acceptance rate
- Average quotation value
- Average customer decision time
- Revision count
- Discount total
- Tax total
- Manual fee total
- Customization additional cost total

Detail table:

- Quotation code
- Project
- Customer
- Sales
- Sent date
- Valid until
- Total
- Revision
- Status
- Decision date

## 10. Orders and Payments Report

Metrics:

- Orders created
- Original total
- Adjustment total
- Final total
- Amount paid
- Outstanding amount
- Start Fee paid/pending
- Deposit paid/pending
- Remaining Payment paid/pending
- Payment success rate
- Failed transaction count
- Average payment completion time
- Orders ready for completion
- Orders not completed despite payment readiness

Payment flow must not be represented as partial payment support.

## 11. Production and Delivery Report

Metrics:

- Production status distribution
- Production duration
- Blocked/unavailable causes
- Delivery Schedules created
- Delivery on-time rate
- Delivered quantity
- Customer confirmation pending
- Time from Production completion to Delivery
- Time from Delivery completion to Remaining Payment
- Delivery exception count

Canonical data source note:

- There is no Delivery Staff role.
- There are no deliveries or delivery_items tables.
- Delivery reporting must be derived from Orders, Order Items, and Project Schedules.

## 12. Schedule Report

Metrics:

- Total Schedules
- Schedule type distribution
- Confirmed
- Awaiting confirmation
- Overdue
- Cancelled/rescheduled when supported
- Average confirmation time
- Measurement Schedule count
- Delivery Schedule count
- Workload by staff

## 13. Catalog Report

Metrics:

- Products by status
- Product Versions by type
- Standard / Custom / Project-specific
- Missing preview
- Missing 3D model
- Missing dimensions/material
- Product usage in Proposals
- Product selection frequency
- Products most frequently customized
- Product Versions linked to Production issues
- Category utilization

## 14. Customer Experience Report

Metrics supported by current data:

- Proposal revision frequency
- Quotation revision frequency
- Quotation rejection rate
- Delivery confirmation delay
- Project review count
- Average rating
- Rating distribution
- Repeat Customer count when identity data supports it
- Average Project duration by Customer/business type

Do not fabricate complaint metrics unless a complaint/support entity exists.

## 15. Drill-down behavior

Every aggregate should support one of:

- open a filtered detail table in the same tab;
- navigate to the corresponding management page;
- open a side panel with entity details.

Drill-down tables should support:

- pagination;
- sorting;
- search;
- column visibility;
- export current result;
- empty/error/loading state.

## 16. Export behavior

Recommended export options:

- CSV for raw table data
- PDF for summary report
- Print-friendly view

Do not claim export is functional if no backend or client export implementation exists. A visual prototype may use disabled or clearly marked mock actions.

## 17. Data freshness and metric definitions

Every report should show:

- selected period;
- comparison period;
- generated time;
- data freshness;
- metric tooltip/formula;
- applied filters.

Avoid silent assumptions in calculations.

## 18. Suggested reusable components

- `ReportHeader`
- `ReportFilterBar`
- `ReportNavigation`
- `MetricCard`
- `TrendSummary`
- `ComparisonBadge`
- `ReportChart`
- `ReportTable`
- `DrilldownDrawer`
- `ExportMenu`
- `MetricDefinitionTooltip`
- `ReportSkeleton`
- `ReportEmptyState`


## Codex execution workflow

Before coding:

1. Inspect the current project structure, route configuration, role guards, dashboard page, shared layout, shared chart/table/card components, API services, hooks, DTOs, and styling conventions.
2. Read the current dashboard implementation and list the sections already present.
3. Identify which displayed values can come from existing APIs and which values require temporary mock data.
4. List every file that will be created or modified.
5. Preserve existing routes, imports, naming conventions, API calls, authentication, authorization, and responsive layout.
6. Use the current Figma design as the primary visual source. Do not manually redesign outside that design system.
7. Implement the dashboard.
8. Run the available build, type-check, lint, and tests.
9. Report:
   - created files;
   - modified files;
   - route/import changes;
   - reused APIs;
   - mocked data;
   - build/type-check/lint/test results;
   - remaining integration gaps.

## Global UX rules

- The dashboard must be action-oriented, not a collection of decorative charts.
- Put urgent and actionable information above general analytics.
- Every KPI card and dashboard list should navigate to a relevant filtered management page when possible.
- Do not provide a generic status dropdown. Use explicit business actions only.
- Use loading skeletons, empty states, error states, retry behavior, and permission-safe rendering.
- Use accessible labels, tooltips, readable status text, keyboard-friendly controls, and responsive layouts.
- Do not rely only on color to communicate a status.
- Keep charts limited and meaningful.
- Desktop target: 12-column grid.
- Tablet and mobile: stack sections without horizontal page overflow.
- Prefer reusable components over page-specific duplication.

## Shared page structure

Recommended order:

1. Page header
2. Date and scope filters
3. Critical alerts
4. KPI summary
5. Main action queue
6. Workflow or operational overview
7. Upcoming schedules
8. Recent activity or notifications

## Shared filters

Use only filters supported by available data:

- date range;
- project status;
- assigned staff;
- project/business type;
- customer;
- overdue / due soon / on track;
- has issue / no issue.

Do not fabricate filter behavior if the backend cannot support it. A temporary client-side filter is acceptable for mock data and must be marked clearly.


## Final Codex instruction

Implement a visual Admin Reports prototype as a separate page from the Admin Dashboard. Reuse existing design components and APIs. Use realistic mock time-series and aggregate data only where reporting endpoints are unavailable. Keep mock data isolated and document every metric that cannot yet be calculated from the backend.
