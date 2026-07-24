import type { ProjectListItemDto } from '@/services/api/projects';

export type ProposalScene = {
  id: string;
  name: string;
  note: string;
};

export type ProposalItem = {
  id: string;
  name: string;
  type: string;
  dimensions: string;
  material: string;
  quantity: number;
  unitPrice: number;
};

export type ChatRoleBadge = 'sales' | 'designer' | 'general';

export type ChatConversationItem = {
  id: string;
  initials: string;
  name: string;
  role: ChatRoleBadge;
  roleLabel: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
};

export type ChatMessage = {
  id: string;
  sender: 'self' | 'other' | 'system';
  text: string;
  timestamp: string;
};

export const mockCustomerProjects: ProjectListItemDto[] = [
  {
    projectId: 'f1d8a241-0f0c-4f3d-8ef9-101010101001',
    projectCode: 'PRJ-CAF-2026-001',
    projectName: 'Brew & Bean Cafe Interior',
    businessType: 'Cafe',
    status: 'PROPOSAL_CONSULTING',
    customerId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    assignedSalesId: '11111111-aaaa-4444-9999-111111111111',
    assignedDesignerId: '22222222-bbbb-4444-9999-222222222222',
    submittedAt: '2026-06-01T09:00:00Z',
  },
  {
    projectId: 'f1d8a241-0f0c-4f3d-8ef9-101010101002',
    projectCode: 'PRJ-RET-2026-002',
    projectName: 'Avenida Lifestyle Store Renovation',
    businessType: 'Retail',
    status: 'PROPOSAL_CONSULTING',
    customerId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    assignedSalesId: '11111111-aaaa-4444-9999-111111111111',
    assignedDesignerId: '33333333-cccc-4444-9999-333333333333',
    submittedAt: '2026-05-20T02:30:00Z',
  },
  {
    projectId: 'f1d8a241-0f0c-4f3d-8ef9-101010101003',
    projectCode: 'PRJ-OFF-2026-003',
    projectName: 'Nova Co-working Office Fit-out',
    businessType: 'Office',
    status: 'IN_CONSULTATION',
    customerId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    assignedSalesId: '11111111-aaaa-4444-9999-111111111111',
    assignedDesignerId: null,
    submittedAt: '2026-05-10T13:45:00Z',
  },
  {
    projectId: 'f1d8a241-0f0c-4f3d-8ef9-101010101004',
    projectCode: 'PRJ-RES-2026-004',
    projectName: 'Skyline Apartment Living Room Upgrade',
    businessType: 'Showroom',
    status: 'SPACE_VERIFIED',
    customerId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    assignedSalesId: '11111111-aaaa-4444-9999-111111111111',
    assignedDesignerId: '22222222-bbbb-4444-9999-222222222222',
    submittedAt: '2026-04-28T08:15:00Z',
  },
];

export const mockProposalScenes: ProposalScene[] = [
  {
    id: 'SCN-01',
    name: 'Main Dining View',
    note: 'Focus on bar counter and circulation path.',
  },
  {
    id: 'SCN-02',
    name: 'Coffee Bar Perspective',
    note: 'Showcase overhead pendant lighting and menu wall.',
  },
  {
    id: 'SCN-03',
    name: 'Window Seating Corner',
    note: 'Highlight natural light and lounge layout.',
  },
];

export const mockProposalItems: ProposalItem[] = [
  {
    id: 'ITM-01',
    name: 'Reclaimed Oak Dining Table',
    type: 'Table',
    dimensions: '1600 x 800 x 750 mm',
    material: 'Oak wood + matte coat',
    quantity: 6,
    unitPrice: 650,
  },
  {
    id: 'ITM-02',
    name: 'Bentwood Dining Chair',
    type: 'Chair',
    dimensions: '520 x 500 x 820 mm',
    material: 'Steam bent beech',
    quantity: 24,
    unitPrice: 180,
  },
  {
    id: 'ITM-03',
    name: 'Industrial Pendant Light',
    type: 'Lighting',
    dimensions: 'Dia 280 mm',
    material: 'Powder-coated steel',
    quantity: 10,
    unitPrice: 120,
  },
  {
    id: 'ITM-04',
    name: 'Upholstered Bench Seating',
    type: 'Built-in',
    dimensions: '4200 x 600 x 900 mm',
    material: 'Plywood + fabric',
    quantity: 2,
    unitPrice: 1400,
  },
];

export const mockConversations: ChatConversationItem[] = [
  {
    id: 'sc',
    initials: 'SC',
    lastMessage: 'I have adjusted the budget split for lighting and seating.',
    name: 'Sarah Chen',
    role: 'sales',
    roleLabel: 'Sales Representative',
    timestamp: '15:30 06/06/2026',
    unread: 2,
  },
  {
    id: 'mt',
    initials: 'MT',
    lastMessage: 'New revision uploaded. Please review Scene 2 and 3.',
    name: 'Michael Torres',
    role: 'designer',
    roleLabel: 'Interior Designer',
    timestamp: '23:45 05/06/2026',
    unread: 1,
  },
  {
    id: 'pt',
    initials: 'PT',
    lastMessage: 'Delivery timeline updated for your approval.',
    name: 'Project Team',
    role: 'general',
    roleLabel: 'General Discussion',
    timestamp: '21:20 04/06/2026',
  },
];

export const mockConversationMessages: Record<string, ChatMessage[]> = {
  sc: [
    {
      id: 'm1',
      sender: 'other',
      text: 'Hi Alex, I just reviewed your preferred budget range.',
      timestamp: '14:05',
    },
    {
      id: 'm2',
      sender: 'self',
      text: 'Great, can we keep most spending on seating and lighting?',
      timestamp: '14:08',
    },
    {
      id: 'm3',
      sender: 'other',
      text: 'Absolutely. I have adjusted the budget split for lighting and seating.',
      timestamp: '15:30',
    },
  ],
  mt: [
    {
      id: 'm4',
      sender: 'other',
      text: 'I uploaded a new revision with warmer materials.',
      timestamp: '22:10',
    },
    {
      id: 'm5',
      sender: 'system',
      text: 'Michael shared 3 files: Scene-2.png, Scene-3.png, Furniture-List.pdf',
      timestamp: '22:12',
    },
    {
      id: 'm6',
      sender: 'other',
      text: 'Please review Scene 2 and Scene 3 when you have time.',
      timestamp: '23:45',
    },
  ],
  pt: [
    {
      id: 'm7',
      sender: 'system',
      text: 'Weekly project summary generated.',
      timestamp: '09:00',
    },
    {
      id: 'm8',
      sender: 'other',
      text: 'Delivery timeline updated for your approval.',
      timestamp: '21:20',
    },
  ],
};
