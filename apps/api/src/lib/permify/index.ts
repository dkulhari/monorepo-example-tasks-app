export { PermifyService, getPermifyService } from './service';
export * from './types';

// Re-export commonly used types for convenience
export type {
  PermifyConfig,
  PermissionCheckRequest,
  PermissionCheckResponse,
  RelationshipTuple,
  BatchCheckRequest,
  BatchCheckResponse,
  EntityType,
  UserType,
  UserStatus,
} from './types';

export {
  PermifyError,
  PermissionDeniedError,
  SchemaNotFoundError,
} from './types';