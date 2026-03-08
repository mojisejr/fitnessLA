export const allowedReceiptMimeTypes = ["image/jpeg", "image/png"];
export const maxReceiptFileSize = 5 * 1024 * 1024;

export function validateReceiptFile(file: File | null) {
  if (!file) {
    return "Receipt image is required.";
  }

  if (!allowedReceiptMimeTypes.includes(file.type)) {
    return "Receipt image must be JPG or PNG.";
  }

  if (file.size > maxReceiptFileSize) {
    return "Receipt image must be 5MB or smaller.";
  }

  return null;
}