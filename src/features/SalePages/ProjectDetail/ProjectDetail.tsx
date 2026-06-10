import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { ProjectStatusBadge, ProjectTimeline, SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';

import { ChatTab, CustomerInfoTab, FilesAttachmentsTab, OverviewTab, SchedulesTab } from './tabs';
import './ProjectDetail.css';

type ProjectDetailTab = 'overview' | 'customer' | 'files' | 'chat' | 'schedules';

export type ProjectDetailProject = {
  id: string;
  projectName: string;
  projectCode: string;
  customerCompany: string;
  businessType: string;
  submittedDate: string;
  status: string;
  numberOfFloors: string;
  totalArea: string;
  targetCompletionDate: string;
  budgetRange: string;
  address: string;
  businessPurpose: string;
  furnitureRequirement: string;
  description: string;
  salesConsultant: string;
  interiorDesigner: string;
  designerAssignedDate: string;
  timelineDates: Partial<Record<string, string>>;
  customer: {
    initials: string;
    fullName: string;
    email: string;
    phone: string;
    accountStatus: string;
    emailStatus: string;
    businessName: string;
    businessType: string;
    address: string;
  };
  files: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    createdDate: string;
  }>;
  messages: Array<{
    id: string;
    sender: string;
    role: string;
    avatar: string;
    time: string;
    text: string;
    isSystem?: boolean;
  }>;
  schedules: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    scheduledTime: string;
    location: string;
    status: string;
  }>;
};

const tabs: Array<{ id: ProjectDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'customer', label: 'Customer Info' },
  { id: 'files', label: 'Files & Attachments' },
  { id: 'chat', label: 'Chat' },
  { id: 'schedules', label: 'Schedules' },
];

const timelineSteps = [
  'Submitted',
  'In Consultation',
  'Waiting For Designer Assignment',
  'Measurement Required',
  'Proposal Drafting',
  'Quotation Sent',
  'Order Confirmed',
  'Completed',
];

const statusStepMap: Record<string, string> = {
  SUBMITTED: 'Submitted',
  IN_CONSULTATION: 'In Consultation',
  WAITING_FOR_DESIGNER_ASSIGNMENT: 'Waiting For Designer Assignment',
  MEASUREMENT_REQUIRED: 'Measurement Required',
  PROPOSAL_DRAFTING: 'Proposal Drafting',
  QUOTATION_SENT: 'Quotation Sent',
  ORDER_CONFIRMED: 'Order Confirmed',
  COMPLETED: 'Completed',
};

const projects: ProjectDetailProject[] = [
  {
    id: 'prj-2024-156',
    projectName: 'Luxury Cafe Interior',
    projectCode: 'PRJ-2024-156',
    customerCompany: 'Bean & Brew Co.',
    businessType: 'Cafe',
    submittedDate: '2024-06-01',
    status: 'IN_CONSULTATION',
    numberOfFloors: '2',
    totalArea: '280 sqm',
    targetCompletionDate: '2024-08-15',
    budgetRange: '$50.000 - $80.000',
    address: '123 Main Street, Downtown District, City Center',
    businessPurpose: 'High-end specialty coffee shop targeting young professionals',
    furnitureRequirement: 'Custom tables, chairs, counter, shelving, lighting fixtures, decorative elements',
    description:
      'Creating a warm, inviting atmosphere for a premium coffee experience. The space should reflect modern design with industrial touches while maintaining comfort and functionality.',
    salesConsultant: 'Sarah Johnson',
    interiorDesigner: 'Emily Davis',
    designerAssignedDate: '2024-06-02',
    timelineDates: {
      Submitted: '2024-06-01',
      'In Consultation': '2024-06-01',
    },
    customer: {
      initials: 'MC',
      fullName: 'Michael Chen',
      email: 'michael@beanbrew.com',
      phone: '+1 555-0123',
      accountStatus: 'Active Account',
      emailStatus: 'Verified Email',
      businessName: 'Bean & Brew Co.',
      businessType: 'Cafe',
      address: '123 Main Street, Downtown District, City Center',
    },
    files: [
      { id: 'file-1', name: 'Floor Plan - Level 1.pdf', type: 'FLOOR_PLAN', size: '2.4 MB', createdDate: '2024-06-01' },
      { id: 'file-2', name: 'Floor Plan - Level 2.pdf', type: 'FLOOR_PLAN', size: '1.8 MB', createdDate: '2024-06-01' },
      { id: 'file-3', name: 'Current Space Photos.zip', type: 'SPACE_IMAGE', size: '12.5 MB', createdDate: '2024-06-01' },
      { id: 'file-4', name: 'Reference Design 1.jpg', type: 'REFERENCE_IMAGE', size: '856 KB', createdDate: '2024-06-01' },
      { id: 'file-5', name: 'Reference Design 2.jpg', type: 'REFERENCE_IMAGE', size: '1.2 MB', createdDate: '2024-06-01' },
      { id: 'file-6', name: 'Brand Guidelines.pdf', type: 'BRAND_ASSET', size: '3.1 MB', createdDate: '2024-06-01' },
    ],
    messages: [
      {
        id: 'msg-1',
        sender: 'Sarah Johnson',
        role: 'Sales Consultant',
        avatar: 'SJ',
        time: '2024-06-01 10:30 AM',
        text: "Hello Michael! Thank you for submitting your project. I've reviewed your requirements and they look comprehensive. I'd love to schedule a call to discuss your vision in more detail.",
      },
      {
        id: 'msg-2',
        sender: 'Michael Chen',
        role: 'Customer',
        avatar: 'MC',
        time: '2024-06-01 2:15 PM',
        text: "Hi Sarah! Thanks for reaching out. I'm available for a call tomorrow afternoon or Wednesday morning. Looking forward to discussing the project!",
      },
      {
        id: 'msg-3',
        sender: 'System',
        role: 'System',
        avatar: '',
        time: '',
        text: 'Designer Emily Davis has been assigned to this project',
        isSystem: true,
      },
      {
        id: 'msg-4',
        sender: 'Sarah Johnson',
        role: 'Sales Consultant',
        avatar: 'SJ',
        time: '2024-06-02 10:00 AM',
        text: "Perfect! Let's schedule for Wednesday at 10 AM. I've also assigned our senior interior designer Emily Davis to your project. She'll join us for the consultation call.",
      },
    ],
    schedules: [
      {
        id: 'sch-1',
        type: 'MEASUREMENT',
        title: 'Site Measurement',
        description: 'LiDAR scanning and detailed measurements of the cafe space',
        scheduledTime: '2024-06-07 10:00 AM - 12:00 PM',
        location: 'Bean & Brew Co. site',
        status: 'CONFIRMED',
      },
    ],
  },
];

export function ProjectDetail() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview');
  const project = useMemo(() => projects.find((item) => item.id === projectId) ?? projects[0], [projectId]);

  if (!project) {
    return <Navigate to="/sales/project-requests" replace />;
  }

  const renderActiveTab = () => {
    if (activeTab === 'overview') return <OverviewTab project={project} />;
    if (activeTab === 'customer') return <CustomerInfoTab project={project} />;
    if (activeTab === 'files') return <FilesAttachmentsTab project={project} />;
    if (activeTab === 'chat') return <ChatTab project={project} />;
    return <SchedulesTab project={project} />;
  };

  return (
    <div className="project-detail-shell">
      <SaleSidebar activeLabel="Project Request Queue" />
      <div className="project-detail-content">
        <SaleNavbar />
        <main className="project-detail-main">
          <section className="project-detail-header">
            <div>
              <div className="project-detail-title-row">
                <h2>{project.projectName}</h2>
                <ProjectStatusBadge status={project.status} />
              </div>
              <div className="project-detail-subtitle">
                <span>{project.projectCode}</span>
                <span>-</span>
                <span>{project.customerCompany}</span>
                <span>-</span>
                <span>Submitted: {project.submittedDate}</span>
              </div>
            </div>
            <div className="project-detail-header-actions">
              <button type="button">Request More Info</button>
              <button type="button">Accept Request</button>
            </div>
          </section>

          <ProjectTimeline currentStep={statusStepMap[project.status] ?? 'Submitted'} steps={timelineSteps} dates={project.timelineDates} />

          <section className="project-detail-tabs-section">
            <div className="project-detail-tabs">
              {tabs.map((tab) => (
                <button key={tab.id} className={activeTab === tab.id ? 'project-detail-tab-active' : ''} type="button" onClick={() => setActiveTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>
            {renderActiveTab()}
          </section>
        </main>
      </div>
    </div>
  );
}
