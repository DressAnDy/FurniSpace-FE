import { defineIcon, line, path, polyline, rect } from '../types';

export const fileIconDefinition = defineIcon('FileIcon', [path('M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z'), polyline('14 3 14 8 19 8')]);

export const folderIconDefinition = defineIcon('FolderIcon', [
  path('M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'),
]);

export const uploadIconDefinition = defineIcon('UploadIcon', [
  path('M12 16V4'),
  polyline('7 9 12 4 17 9'),
  path('M5 16v3h14v-3'),
]);

export const downloadIconDefinition = defineIcon('DownloadIcon', [
  path('M12 4v12'),
  polyline('7 11 12 16 17 11'),
  path('M5 20h14'),
]);

export const imageIconDefinition = defineIcon('ImageIcon', [
  rect(4, 5, 16, 14, 2),
  path('m4 15 4-4 4 4 3-3 5 5'),
  path('M15 9h.01'),
]);

export const pdfIconDefinition = defineIcon('PdfIcon', [
  path('M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z'),
  polyline('14 3 14 8 19 8'),
  line(8, 16, 8, 12),
  path('M8 12h1.2a1.2 1.2 0 0 1 0 2.4H8'),
  path('M12 16v-4h1.2a2 2 0 0 1 0 4H12'),
  path('M17 16v-4h2'),
  line(17, 14, 18.5, 14),
]);

export const paperclipIconDefinition = defineIcon('PaperclipIcon', [
  path('m21 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.2-9.2a3.4 3.4 0 0 1 4.8 4.8l-9.2 9.2a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5'),
]);

export const fileTextIconDefinition = defineIcon('FileTextIcon', [
  path('M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z'),
  polyline('14 3 14 8 19 8'),
  line(9, 13, 15, 13),
  line(9, 17, 15, 17),
]);
