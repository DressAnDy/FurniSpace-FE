import { IconEye, IconFileText, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProjectStatusBadge, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';

import './ProjectRequestQueue.css';

type ProjectRequest = {
  id: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  phone: string;
  email: string;
  businessType: string;
  area: string;
  budgetRange: string;
  targetDate: string;
  status: string;
  attachments: number;
  assignedSales: string;
};

const projectRequests: ProjectRequest[] = [
  {
    id: 'prj-2024-156',
    projectCode: 'PRJ-2024-156',
    projectName: 'Luxury Cafe Interior Project',
    customerName: 'Lumiere Cafe Group',
    phone: '+84 901 234 567',
    email: 'owner@lumierecafe.vn',
    businessType: 'Cafe',
    area: '180 m2',
    budgetRange: '$25K - $50K',
    targetDate: '2024-07-15',
    status: 'SUBMITTED',
    attachments: 6,
    assignedSales: 'Sarah Johnson',
  },
  {
    id: 'prj-2024-150',
    projectCode: 'PRJ-2024-150',
    projectName: 'Fashion Store Display Upgrade',
    customerName: 'Maison Retail Co.',
    phone: '+84 902 445 091',
    email: 'design@maisonretail.vn',
    businessType: 'Fashion Store',
    area: '95 m2',
    budgetRange: '$10K - $25K',
    targetDate: '2024-07-22',
    status: 'IN_CONSULTATION',
    attachments: 4,
    assignedSales: 'Sarah Johnson',
  },
  {
    id: 'prj-2024-149',
    projectCode: 'PRJ-2024-149',
    projectName: 'Premium Product Showroom',
    customerName: 'Nova Living',
    phone: '+84 903 778 201',
    email: 'hello@novaliving.vn',
    businessType: 'Showroom',
    area: '220 m2',
    budgetRange: '$50K+',
    targetDate: '2024-08-02',
    status: 'WAITING_FOR_DESIGNER_ASSIGNMENT',
    attachments: 8,
    assignedSales: 'David Lee',
  },
  {
    id: 'prj-2024-145',
    projectCode: 'PRJ-2024-145',
    projectName: 'Modern Office Furniture Package',
    customerName: 'BrightWorks Studio',
    phone: '+84 904 112 430',
    email: 'admin@brightworks.vn',
    businessType: 'Office',
    area: '240 m2',
    budgetRange: '$50K+',
    targetDate: '2024-08-10',
    status: 'PROPOSAL_DRAFTING',
    attachments: 5,
    assignedSales: 'Sarah Johnson',
  },
];

export function ProjectRequestQueue() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('All Status');
  const [businessType, setBusinessType] = useState('All Business Types');
  const [budgetRange, setBudgetRange] = useState('All Budgets');

  const filteredRequests = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projectRequests.filter((request) => {
      const keywordFields = [request.projectName, request.projectCode, request.customerName, request.phone, request.email];
      const matchesKeyword = !normalizedKeyword || keywordFields.some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesStatus = status === 'All Status' || request.status === status;
      const matchesBusinessType = businessType === 'All Business Types' || request.businessType === businessType;
      const matchesBudget = budgetRange === 'All Budgets' || request.budgetRange === budgetRange;

      return matchesKeyword && matchesStatus && matchesBusinessType && matchesBudget;
    });
  }, [budgetRange, businessType, keyword, status]);

  return (
    <div className="flex min-h-screen bg-[#f5f5f3] text-zinc-900">
      <SaleSidebar activeLabel="Projects" />
      <div className="flex min-w-0 flex-1 flex-col">
        <SaleNavbar />
        <main className="flex-1 space-y-5 px-8 py-7">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#a17d2f]">Sales project intake</p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-950">Project Request Queue</h2>
              <p className="mt-2 text-sm text-zinc-500">Review and manage incoming project requests from customers</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">New Requests</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-950">18</p>
                </div>
                <div className="rounded-lg bg-[#fbf4df] p-4">
                  <p className="text-xs font-semibold uppercase text-[#8a6922]">Need Action</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-950">7</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase text-emerald-700">Accepted</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-950">31</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-[linear-gradient(135deg,#171717_0%,#3c3429_42%,#c9a24d_100%)] p-5 text-white shadow-sm">
              <div className="absolute inset-x-8 bottom-0 h-24 rounded-t-2xl bg-white/20 backdrop-blur-sm" />
              <div className="absolute bottom-8 left-10 h-16 w-28 rounded-lg border border-white/25 bg-white/20" />
              <div className="absolute bottom-8 right-10 h-20 w-32 rounded-lg border border-white/25 bg-white/25" />
              <div className="relative">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">FurniSpace sales</span>
                <h3 className="mt-4 max-w-xs text-2xl font-semibold">Cafe, showroom, fashion, and office requests</h3>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_190px_210px_180px]">
              <label className="flex h-11 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-zinc-500">
                <IconSearch size={18} />
                <input
                  className="w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                  placeholder="Search by project, code, customer, phone, email..."
                  type="search"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
              <select className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-700 outline-none" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All Status</option>
                <option>SUBMITTED</option>
                <option>IN_CONSULTATION</option>
                <option>WAITING_FOR_DESIGNER_ASSIGNMENT</option>
                <option>PROPOSAL_DRAFTING</option>
              </select>
              <select
                className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-700 outline-none"
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
              >
                <option>All Business Types</option>
                <option>Cafe</option>
                <option>Fashion Store</option>
                <option>Showroom</option>
                <option>Office</option>
              </select>
              <select
                className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-700 outline-none"
                value={budgetRange}
                onChange={(event) => setBudgetRange(event.target.value)}
              >
                <option>All Budgets</option>
                <option>$10K - $25K</option>
                <option>$25K - $50K</option>
                <option>$50K+</option>
              </select>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-zinc-950">Project Requests</h3>
              <p className="text-sm text-zinc-500">Open a request to review customer details, files, chat, and schedules.</p>
            </div>
            <div className="project-request-table-scroll overflow-x-auto">
              <table className="min-w-[1220px] w-full border-collapse text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    {['Project Code', 'Project Name', 'Customer', 'Business Type', 'Area', 'Budget Range', 'Target Date', 'Status', 'Attachments', 'Assigned Sales', 'Action'].map((header) => (
                      <th key={header} className="px-4 py-3 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="align-top transition hover:bg-zinc-50">
                      <td className="px-4 py-4 font-semibold text-zinc-900">{request.projectCode}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-zinc-900">{request.projectName}</p>
                        <p className="mt-1 text-xs text-zinc-500">{request.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-zinc-700">{request.customerName}</p>
                        <p className="mt-1 text-xs text-zinc-500">{request.phone}</p>
                      </td>
                      <td className="px-4 py-4 text-zinc-600">{request.businessType}</td>
                      <td className="px-4 py-4 text-zinc-600">{request.area}</td>
                      <td className="px-4 py-4 text-zinc-600">{request.budgetRange}</td>
                      <td className="px-4 py-4 text-zinc-600">{request.targetDate}</td>
                      <td className="px-4 py-4">
                        <ProjectStatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 text-zinc-600">
                          <IconFileText size={16} />
                          {request.attachments} files
                        </span>
                      </td>
                      <td className="px-4 py-4 text-zinc-600">{request.assignedSales}</td>
                      <td className="px-4 py-4">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg bg-[#c9a24d] px-3 py-2 text-xs font-semibold text-[#171717] transition hover:bg-[#b8923f]"
                          type="button"
                          onClick={() => navigate(`/sales/project-requests/${request.id}`)}
                        >
                          <IconEye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
