import { type FormEvent } from 'react';
import { IconCategory, IconX } from '@tabler/icons-react';

type CreateCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  initialValues?: {
    categoryName: string;
    description: string | null;
  };
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  errorMessage?: string | null;
};

export function CreateCategoryModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  isSubmitting = false,
  mode = 'create',
  errorMessage,
}: CreateCategoryModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(event);
  };
  const title = mode === 'edit' ? 'Edit Category' : 'Create Category';
  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Category';

  return (
    <div className="category-modal-overlay">
      <div className="category-modal-panel">
        <div className="category-modal-header">
          <div>
            <h2>{title}</h2>
            <p>Category status is managed by backend rules; this form only updates name and description.</p>
          </div>
          <button
            className="category-modal-icon-button"
            type="button"
            aria-label="Close create category modal"
            onClick={onClose}
          >
            <IconX size={18} />
          </button>
        </div>

        <form className="category-modal-form" onSubmit={handleSubmit}>
          <div className="category-modal-fields">
            <label className="category-modal-field">
              <span>Category Name</span>
              <input
                name="categoryName"
                placeholder="Enter category name"
                defaultValue={initialValues?.categoryName ?? ''}
                type="text"
                required
              />
            </label>

            <label className="category-modal-field">
              <span>Description</span>
              <textarea
                name="description"
                placeholder="Describe this category"
                defaultValue={initialValues?.description ?? ''}
              />
            </label>

            <div className="category-modal-field">
              <span>Icon</span>
              <div className="category-modal-icon-preview">
                <IconCategory size={18} />
                Category icon
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

export default CreateCategoryModal;
