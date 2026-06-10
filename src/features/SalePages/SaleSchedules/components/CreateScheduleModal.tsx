import { IconX } from '@tabler/icons-react';
import type { FormEvent } from 'react';

type CreateScheduleModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateScheduleModal({ isOpen, onClose }: CreateScheduleModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onClose();
  };

  return (
    <div className="sale-schedules-modal-overlay" role="presentation">
      <section className="sale-schedules-modal" role="dialog" aria-modal="true" aria-labelledby="create-schedule-title">
        <button className="sale-schedules-modal-close" type="button" aria-label="Close create schedule modal" onClick={onClose}>
          <IconX size={16} />
        </button>

        <header className="sale-schedules-modal-header">
          <h3 id="create-schedule-title">Create New Schedule</h3>
          <p>Schedule a new appointment or meeting for a project</p>
        </header>

        <form className="sale-schedules-modal-form" onSubmit={handleSubmit}>
          <label>
            <span>Project</span>
            <select defaultValue="">
              <option value="" disabled>
                Select project
              </option>
              <option value="prj-2024-156">PRJ-2024-156 - Luxury Cafe</option>
              <option value="prj-2024-150">PRJ-2024-150 - Design Review</option>
              <option value="prj-2024-149">PRJ-2024-149 - Client Consultation</option>
            </select>
          </label>

          <label>
            <span>Schedule Type</span>
            <select defaultValue="">
              <option value="" disabled>
                Select type
              </option>
              <option value="MEASUREMENT">Measurement</option>
              <option value="DESIGN_REVIEW">Design Review</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="HANDOVER">Handover</option>
            </select>
          </label>

          <label>
            <span>Title</span>
            <input placeholder="Schedule title" type="text" />
          </label>

          <div className="sale-schedules-modal-grid">
            <label>
              <span>Start Date & Time</span>
              <input type="datetime-local" />
            </label>
            <label>
              <span>End Date & Time</span>
              <input type="datetime-local" />
            </label>
          </div>

          <label>
            <span>Location</span>
            <input placeholder="Meeting location or address" type="text" />
          </label>

          <label>
            <span>Description</span>
            <textarea placeholder="Additional notes..." />
          </label>

          <footer className="sale-schedules-modal-footer">
            <button className="sale-schedules-modal-cancel" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="sale-schedules-modal-submit" type="submit">
              Create Schedule
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
