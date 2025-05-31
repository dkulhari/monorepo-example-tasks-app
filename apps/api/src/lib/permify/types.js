// Permify types and interfaces for the multi-tenant system
// User types
export var UserType;
(function (UserType) {
    UserType["SYSTEM_ADMIN"] = "system_admin";
    UserType["TENANT_ADMIN"] = "tenant_admin";
    UserType["REGULAR_USER"] = "regular_user";
    UserType["SERVICE_ACCOUNT"] = "service_account";
    UserType["GUEST_USER"] = "guest_user";
})(UserType || (UserType = {}));
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INVITED"] = "invited";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["DELETED"] = "deleted";
})(UserStatus || (UserStatus = {}));
// Error types
export class PermifyError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = "PermifyError";
    }
}
export class PermissionDeniedError extends PermifyError {
    constructor(action, resource) {
        super(`Permission denied: Cannot perform action '${action}' on resource '${resource}'`, "PERMISSION_DENIED", 403);
    }
}
export class SchemaNotFoundError extends PermifyError {
    constructor() {
        super("Permify schema not found or not initialized", "SCHEMA_NOT_FOUND", 500);
    }
}
