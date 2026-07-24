import { createIcon } from '../renderers';
import {
  editIconDefinition,
  filterIconDefinition,
  moreHorizontalIconDefinition,
  moreVerticalIconDefinition,
  plusIconDefinition,
  refreshIconDefinition,
  saveIconDefinition,
  sortIconDefinition,
  trashIconDefinition,
  viewIconDefinition,
} from './definitions';

export const PlusIcon = createIcon(plusIconDefinition);
export const EditIcon = createIcon(editIconDefinition);
export const TrashIcon = createIcon(trashIconDefinition);
export const SaveIcon = createIcon(saveIconDefinition);
export const FilterIcon = createIcon(filterIconDefinition);
export const SortIcon = createIcon(sortIconDefinition);
export const RefreshIcon = createIcon(refreshIconDefinition);
export const MoreHorizontalIcon = createIcon(moreHorizontalIconDefinition);
export const MoreVerticalIcon = createIcon(moreVerticalIconDefinition);
export const ViewIcon = createIcon(viewIconDefinition);

export {
  editIconDefinition,
  filterIconDefinition,
  moreHorizontalIconDefinition,
  moreVerticalIconDefinition,
  plusIconDefinition,
  refreshIconDefinition,
  saveIconDefinition,
  sortIconDefinition,
  trashIconDefinition,
  viewIconDefinition,
};
