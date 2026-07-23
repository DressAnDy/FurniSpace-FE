import { type FormEvent } from 'react';
import { IconTags, IconX } from '@tabler/icons-react';

type CreateBusinessTypeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  initialValues?: {
    code: string;
    name: string;
    status: boolean;
  };
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  errorMessage?: string | null;
};

export function CreateBusinessTypeModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  isSubmitting = false,
  mode = 'create',
  errorMessage,
}: CreateBusinessTypeModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(event);
  };
  const title = mode === 'edit' ? 'Edit Business Type' : 'Create Business Type';
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Business Type';

  return (
    <div className="category-modal-overlay">
      <div className="category-modal-panel">
        <div className="category-modal-header">
          <div>
            <h2>{title}</h2>
            <p>Business Type groups products by usage environment such as Cafe, Restaurant, or Showroom.</p>
          </div>
          <button
            className="category-modal-icon-button"
            type="button"
            aria-label="Close business type modal"
            onClick={onClose}
          >
            <IconX size={18} />
          </button>
        </div>

        <form className="category-modal-form" onSubmit={handleSubmit}>
          <div className="category-modal-fields">
            <label className="category-modal-field">
              <span>Code</span>
              <input
                name="code"
                placeholder="e.g., CAFE"
                defaultValue={initialValues?.code ?? ''}
                type="text"
                required
              />
            </label>

            <label className="category-modal-field">
              <span>Name</span>
              <input
                name="name"
                placeholder="e.g., Cafe"
                defaultValue={initialValues?.name ?? ''}
                type="text"
                required
              />
            </label>

            <label className="category-modal-toggle-field">
              <input name="status" defaultChecked={initialValues?.status ?? true} type="checkbox" />
              <span>
                <strong>Active</strong>
                <small>Active Business Types are shown in Product create/edit and filters.</small>
              </span>
            </label>

            <div className="category-modal-field">
              <span>Usage</span>
              <div className="category-modal-icon-preview">
                <IconTags size={18} />
                Product Business Type
              </div>
            </div>
          </div>

          {errorMessage ? <p className="category-modal-error">{errorMessage}</p> : null}

          <div className="category-modal-actions">
            <button
              className="category-modal-secondary"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="category-modal-primary"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateBusinessTypeModal;
