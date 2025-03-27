import {useState, useRef, ChangeEvent} from 'react';

export const ACCEPTED_FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain',
  CSV: 'text/csv',
  JSON: 'application/json',
  MD: 'text/markdown',
  PNG: 'image/png',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
};

export type AcceptedFileType = keyof typeof ACCEPTED_FILE_TYPES;

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
  className?: string;
}

/**
 * File upload component with drag and drop functionality
 */
export function FileUpload({
  onFileSelect,
  allowedTypes = Object.values(ACCEPTED_FILE_TYPES),
  maxSizeMB = 100,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function validateFile(file: File): boolean {
    setErrorMessage('');

    // Check file size
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File size exceeds the ${maxSizeMB}MB limit`);
      return false;
    }

    // Check file type
    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
      setErrorMessage(
        `File type not supported. Allowed types: ${allowedTypes.map((type) => type.split('/')[1]).join(', ')}`,
      );
      return false;
    }

    return true;
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Use non-null assertion since we've checked length above
      const file = e.dataTransfer.files[0]!;
      handleFile(file);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      // Use non-null assertion since we've checked length above
      const file = e.target.files[0]!;
      handleFile(file);
    }
  }

  function handleFile(file: File) {
    if (validateFile(file)) {
      setFileName(file.name);
      onFileSelect(file);
    }
  }

  function handleClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type='file'
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className='hidden'
          accept={allowedTypes.join(',')}
        />

        <div className='flex flex-col items-center justify-center gap-2'>
          <svg
            className='w-8 h-8 text-gray-400'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
            />
          </svg>

          <div className='text-sm font-medium text-gray-700'>
            {fileName ? (
              <span className='text-blue-600'>{fileName}</span>
            ) : (
              <>
                <span className='text-blue-600'>Click to upload</span> or drag and drop
              </>
            )}
          </div>

          <p className='text-xs text-gray-500'>
            {`Supported formats: ${allowedTypes.map((type) => type.split('/')[1]).join(', ')}`}
          </p>
          <p className='text-xs text-gray-500'>{`Max size: ${maxSizeMB}MB`}</p>
        </div>
      </div>

      {errorMessage && <div className='mt-2 text-sm text-red-500'>{errorMessage}</div>}
    </div>
  );
}
