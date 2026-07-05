import { useEffect, useState } from 'react';

type SelectedImagePreviewProps = {
  file: File;
  className: string;
};

export function SelectedImagePreview({ file, className }: SelectedImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return previewUrl ? <img alt={`Preview of ${file.name}`} className={className} src={previewUrl} /> : null;
}
