export interface Mapping {
  placeholder: string;
  header: string;
  similarity?: number;
}

export interface SpecialPlaceholderSettings {
  razred: {
    enabled: boolean;
  };
  telefon: {
    enabled: boolean;
    secondaryField: string;
  };
}

// This is a more type-safe way to handle unknown errors
export type ErrorWithMessage = Error | { message: string };

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return String(error);
}
