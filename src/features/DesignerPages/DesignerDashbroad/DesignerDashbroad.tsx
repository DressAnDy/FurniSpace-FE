import { IconArrowRight, IconBriefcase, IconCalendarEvent, IconMessageCircle, IconPencilCog, IconStack2, IconTrendingUp } from '@tabler/icons-react';

import { DesignerLayout } from '@/features/DesignerPages/designercomponents';

import './DesignerDashbroad.css';

const metrics = [
  { label: 'Assigned Projects', value: '7', note: '+2 this week', icon: IconBriefcase },
  { label: 'Waiting for Design', value: '2', note: '1 urgent', icon: IconPencilCog },
  { label: 'Proposals In Progress', value: '5', note: '3 need review', icon: IconStack2 },
  { label: 'Feedback Pending', value: '3', note: '2 open', icon: IconMessageCircle },
  { label: 'Upcoming Schedules', value: '4', note: '1 today', icon: IconCalendarEvent },
  { label: 'Completed Designs', value: '28', note: '+5 this month', icon: IconTrendingUp },
];

const activeProjects = [
  { title: 'Milano Café Interior', client: 'PT Kopi Nusantara · PRJ-2024-081', type: 'Café', target: '2024-08-15', status: 'In Design', progress: 45 },
  { title: 'Luxe Fashion Showroom', client: 'CV Mode Elegan · PRJ-2024-076', type: 'Fashion Store', target: '2024-08-22', status: 'Revision', progress: 62 },
  { title: 'Meridian Office HQ', client: 'PT Meridian Solusi · PRJ-2024-069', type: 'Office', target: '2024-09-10', status: 'Proposal Sent', progress: 80 },
  { title: 'Urban Furniture Gallery', client: 'PT Mebel Urban · PRJ-2024-058', type: 'Showroom', target: '2024-09-28', status: 'In Design', progress: 28 },
];

const feedback = [
  { text: 'Counter placement blocks natural light. Move to east wall.', project: 'Luxe Fashion Showroom · Minimalist Gold v2.1 · 2024-07-20', status: 'OPEN' },
  { text: 'Lighting too bright. Prefer warmer accent-based lighting.', project: 'Luxe Fashion Showroom · Minimalist Gold v2.1 · 2024-07-19', status: 'IN_REVIEW' },
  { text: 'Meeting pods on L2 need acoustic panels.', project: 'Meridian Office HQ · Executive Suite v1.4 · 2024-07-18', status: 'IN_REVIEW' },
];

export function DesignerDashbroad() {
  return (
    <DesignerLayout activeLabel="Dashboard">
      <div className="space-y-7">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">Welcome back, David</h2>
            <p className="mt-2 text-sm text-zinc-500">Thursday, 24 July 2024 · You have 3 feedback items and 2 projects waiting for design.</p>
          </div>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#c7a15f] px-5 text-sm font-semibold text-[#171717] transition hover:bg-[#b58f4d]" type="button">
            View Assigned Projects
            <IconArrowRight size={16} />
          </button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map(({ icon: MetricIcon, label, note, value }) => (
            <article className="designer-card p-5" key={label}>
              <div className="mb-5 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4ead8] text-[#9a713b]">
                  <MetricIcon size={20} />
                </span>
                <strong className="text-4xl font-semibold tracking-tight">{value}</strong>
              </div>
              <p className="text-sm font-semibold text-zinc-900">{label}</p>
              <span className="mt-1 block text-xs text-zinc-500">{note}</span>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <article className="designer-card overflow-hidden">
            <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
              <h3 className="text-base font-semibold">Active Projects</h3>
              <button className="text-xs font-semibold text-[#9a713b]" type="button">All Projects</button>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Project</th>
                    <th className="px-4 py-4 font-semibold">Type</th>
                    <th className="px-4 py-4 font-semibold">Target</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Progress</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {activeProjects.map((project) => (
                    <tr className="align-middle" key={project.title}>
                      <td className="px-6 py-5">
                        <p className="font-semibold text-zinc-950">{project.title}</p>
                        <span className="text-xs text-zinc-500">{project.client}</span>
                      </td>
                      <td className="px-4 py-5 text-zinc-600">{project.type}</td>
                      <td className="px-4 py-5 text-zinc-600">{project.target}</td>
                      <td className="px-4 py-5"><span className="designer-pill px-3 py-1 text-xs font-semibold">{project.status}</span></td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-zinc-100"><span className="block h-full rounded-full bg-[#c7a15f]" style={{ width: `${project.progress}%` }} /></div>
                          <span className="text-xs font-semibold">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-5"><button className="text-xs font-semibold text-[#9a713b]" type="button">Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="designer-card">
            <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
              <h3 className="text-base font-semibold">Recent Feedback</h3>
              <button className="text-xs font-semibold text-[#9a713b]" type="button">Review All</button>
            </header>
            <div className="divide-y divide-zinc-100">
              {feedback.map((item) => (
                <div className="px-6 py-5" key={item.text}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-zinc-900">{item.text}</p>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">{item.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{item.project}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </DesignerLayout>
  );
}
