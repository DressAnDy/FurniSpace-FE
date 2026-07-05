import { createIcon } from '../renderers';
import {
  downloadIconDefinition,
  fileIconDefinition,
  fileTextIconDefinition,
  folderIconDefinition,
  imageIconDefinition,
  paperclipIconDefinition,
  pdfIconDefinition,
  uploadIconDefinition,
} from './definitions';

export const FileIcon = createIcon(fileIconDefinition);
export const FolderIcon = createIcon(folderIconDefinition);
export const UploadIcon = createIcon(uploadIconDefinition);
export const DownloadIcon = createIcon(downloadIconDefinition);
export const ImageIcon = createIcon(imageIconDefinition);
export const PdfIcon = createIcon(pdfIconDefinition);
export const PaperclipIcon = createIcon(paperclipIconDefinition);
export const FileTextIcon = createIcon(fileTextIconDefinition);

export {
  downloadIconDefinition,
  fileIconDefinition,
  fileTextIconDefinition,
  folderIconDefinition,
  imageIconDefinition,
  paperclipIconDefinition,
  pdfIconDefinition,
  uploadIconDefinition,
};
