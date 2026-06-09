import { type FormEvent } from 'react';
import { IconCategory, IconX } from '@tabler/icons-react';

type CreateCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreateCategoryModal({ isOpen, onClose, onSubmit }: CreateCategoryModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-[520px] rounded-lg border border-[#e5e7eb] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-6 py-5">
          <div>
            <h2 className="m-0 text-lg font-semibold leading-6 text-[#1a1d29]">Create Category</h2>
            <p className="mt-1 text-sm leading-5 text-[#6b7280]">Add a new product category to organize your furniture catalog.</p>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1a1d29]"
            type="button"
            aria-label="Close create category modal"
            onClick={onClose}
          >
            <IconX size={18} />
          </button>
        </div>

        <form className="px-6 py-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium leading-5 text-[#1a1d29]">Category Name</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-[#1a1d29] outline-none placeholder:text-[#9ca3af] focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a57433]"
                name="categoryName"
                placeholder="Enter category name"
                type="text"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium leading-5 text-[#1a1d29]">Description</span>
              <textarea
                className="mt-2 min-h-[92px] w-full resize-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#1a1d29] outline-none placeholder:text-[#9ca3af] focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a57433]"
                name="description"
                placeholder="Describe this category"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium leading-5 text-[#1a1d29]">Status</span>
                <select
                  className="mt-2 h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-[#1a1d29] outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a57433]"
                  name="status"
                  defaultValue="ACTIVE"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium leading-5 text-[#1a1d29]">Icon</span>
                <div className="mt-2 flex h-10 items-center gap-2 rounded-md border border-[#e5e7eb] bg-[#f8f9fa] px-3 text-sm text-[#6b7280]">
                  <IconCategory size={18} />
                  Category icon
                </div>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              className="h-9 rounded-md border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#1a1d29] hover:bg-[#f3f4f6]"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="h-9 rounded-md bg-[#d4a574] px-4 text-sm font-medium text-white hover:bg-[#c1905d]" type="submit">
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCategoryModal;
