// Global TypeScript Type Definitions
// Declare shared interfaces, types, and namespaces here.

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code?: string } };
