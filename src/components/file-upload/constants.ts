/**
 * File upload constants and configuration
 */
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
} as const

export type AcceptedFileType = keyof typeof ACCEPTED_FILE_TYPES

export const DEFAULT_ALLOWED_TYPES = Object.values(ACCEPTED_FILE_TYPES)
