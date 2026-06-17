import { IconCalendarEvent, IconClock, IconMapPin, IconPlus, IconUser } from '@tabler/icons-react';
import { useState } from 'react';

import { SaleNavbar, SaleSidebar } from '@/features/SalePages/salecomponents';

import { CreateScheduleModal } from './components';
import './SaleSchedules.css';

type ScheduleView = 'list' | 'calendar';

type SaleSchedule = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string;
  projectCode: string;
  dateTime: string;
  location: string;
  participants: string;
};

const schedules: SaleSchedule[] = [
  {
    id: 'schedule-1',
    title: 'Site Measurement - Luxury Cafe',
    type: 'MEASUREMENT',
    status: 'CONFIRMED',
    description: 'LiDAR scanning and detailed measurements',
    projectCode: 'PRJ-2024-156',
    dateTime: '2024-06-07 10:00 AM',
    location: '123 Main Street, Downtown',
    participants: 'Sarah Johnson',
  },
  {
    id: 'schedule-2',
    title: 'Design Review Meeting',
    type: 'DESIGN_REVIEW',
    status: 'PENDING CONFIRMATION',
    description: 'Review initial design concepts with client',
    projectCode: 'PRJ-2024-150',
    dateTime: '2024-06-08 2:00 PM',
    location: 'Virtual Meeting',
    participants: 'Sarah Johnson, Emily Davis',
  },
  {
    id: 'schedule-3',
    title: 'Client Consultation',
    type: 'CONSULTATION',
    status: 'CONFIRMED',
    description: 'Initial consultation to understand requirements',
    projectCode: 'PRJ-2024-149',
    dateTime: '2024-06-09 11:00 AM',
    location: '555 Food Street',
    participants: 'Sarah Johnson',
  },
  {
    id: 'schedule-4',
    title: 'Final Handover',
    type: 'HANDOVER',
    status: 'CONFIRMED',
    description: 'Final project handover and walkthrough',
    projectCode: 'PRJ-2024-145',
    dateTime: '2024-06-10 9:00 AM',
    location: '456 Fashion Ave',
    participants: 'Sarah Johnson, Delivery Team',
  },
];

export function SaleSchedules() {
  const [activeView, setActiveView] = useState<ScheduleView>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="sale-schedules-shell">
      <SaleSidebar activeLabel="Schedules" />
      <div className="sale-schedules-content">
        <SaleNavbar />
        <main className="sale-schedules-main">
          <section className="sale-schedules-heading">
            <div>
              <h2>Schedules & Appointments</h2>
              <p>Manage your project schedules and customer meetings</p>
            </div>
            <button className="sale-schedules-create-button" type="button" onClick={() => setIsCreateModalOpen(true)}>
              <IconPlus size={16} />
              Create Schedule
            </button>
          </section>

          <section className="sale-schedules-view-card">
            <div className="sale-schedules-view-switch">
              <button className={activeView === 'list' ? 'sale-schedules-view-active' : ''} type="button" onClick={() => setActiveView('list')}>
                List View
              </button>
              <button className={activeView === 'calendar' ? 'sale-schedules-view-active' : ''} type="button" onClick={() => setActiveView('calendar')}>
                Calendar View
              </button>
            </div>
          </section>

          {activeView === 'list' ? (
            <section className="sale-schedules-list">
              {schedules.map((schedule) => (
                <article key={schedule.id} className="sale-schedules-card">
                  <div className="sale-schedules-card-body">
                    <div className="sale-schedules-title-row">
                      <h3>{schedule.title}</h3>
                      <span className="sale-schedules-type-badge">{schedule.type}</span>
                      <span className="sale-schedules-status-badge">{schedule.status}</span>
                    </div>
                    <p>{schedule.description}</p>
                    <div className="sale-schedules-meta">
                      <span>
                        <IconCalendarEvent size={16} />
                        {schedule.projectCode}
                      </span>
                      <span>
                        <IconClock size={16} />
                        {schedule.dateTime}
                      </span>
                      <span>
                        <IconMapPin size={16} />
                        {schedule.location}
                      </span>
                      <span>
                        <IconUser size={16} />
                        {schedule.participants}
                      </span>
                    </div>
                  </div>
                  <div className="sale-schedules-actions">
                    <button type="button">Reschedule</button>
                    <button type="button">Mark Complete</button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="sale-schedules-calendar-card">
              <h3>Calendar View</h3>
              <p>Calendar layout will show the same appointments by date.</p>
            </section>
          )}
        </main>
      </div>
      <CreateScheduleModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
}
