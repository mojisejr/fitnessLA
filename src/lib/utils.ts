import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function sleep(duration = 320) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export function createAppError(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error) {
    return error;
  }

  const nextError = new Error(fallback) as Error & {
    code?: string;
    status?: number;
    details?: unknown;
  };

  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string" && error.message) {
      nextError.message = error.message;
    }

    if ("code" in error && typeof error.code === "string") {
      nextError.code = error.code;
    }

    if ("status" in error && typeof error.status === "number") {
      nextError.status = error.status;
    }

    nextError.details = error;
    return nextError;
  }

  if (typeof error === "string" && error) {
    nextError.message = error;
  }

  nextError.details = error;
  return nextError;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}