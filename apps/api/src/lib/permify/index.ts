export { getPermifyService, PermifyService } from "./service";
export * from "./types";

// Re-export commonly used types for convenience
export type {
  BatchCheckRequest,
  BatchCheckResponse,
  EntityType,
  PermifyConfig,
  PermissionCheckRequest,
  PermissionCheckResponse,
  RelationshipTuple,
  UserStatus,
  UserType,
} from "./types";

export {
  PermifyError,
  PermissionDeniedError,
  SchemaNotFoundError,
} from "./types";
