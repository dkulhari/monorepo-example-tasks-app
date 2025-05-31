CREATE TYPE "public"."audit_action" AS ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'invite', 'accept_invitation', 'reject_invitation', 'assign', 'unassign', 'activate', 'deactivate', 'suspend', 'restore', 'export', 'import', 'configure', 'deploy', 'execute');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('user', 'tenant', 'site', 'device', 'task', 'invitation', 'association', 'assignment', 'configuration', 'system');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('online', 'offline', 'maintenance', 'error', 'decommissioned');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('sensor', 'controller', 'gateway', 'camera', 'actuator', 'meter', 'beacon', 'router', 'server', 'workstation');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('active', 'inactive', 'maintenance', 'decommissioned');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'archived', 'pending');--> statement-breakpoint
CREATE TYPE "public"."tenant_type" AS ENUM('enterprise', 'standard', 'starter', 'trial');--> statement-breakpoint
CREATE TYPE "public"."user_tenant_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_tenant_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('system_admin', 'tenant_admin', 'regular_user', 'service_account', 'guest_user');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource_type" "resource_type" NOT NULL,
	"resource_id" varchar(255),
	"details" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"session_id" varchar(255),
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "device_type" NOT NULL,
	"serial_number" varchar(255),
	"model" varchar(255),
	"manufacturer" varchar(255),
	"firmware_version" varchar(100),
	"metadata" jsonb,
	"status" "device_status" DEFAULT 'offline' NOT NULL,
	"last_seen_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"metadata" jsonb,
	"status" "site_status" DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_site_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_site" UNIQUE("user_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "user_tenant_associations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" "user_tenant_role" DEFAULT 'member' NOT NULL,
	"status" "user_tenant_status" DEFAULT 'active' NOT NULL,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"invited_by" uuid,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_tenant" UNIQUE("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keycloak_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_by" uuid,
	"user_type" "user_type" DEFAULT 'regular_user' NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_keycloak_id_unique" UNIQUE("keycloak_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "tenant_users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tenant_users" CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ALTER COLUMN "role" SET DATA TYPE user_tenant_role;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "settings" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD COLUMN "accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "type" "tenant_type" DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "status" "tenant_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "keycloak_group_id" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_associations" ADD CONSTRAINT "user_tenant_associations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_associations" ADD CONSTRAINT "user_tenant_associations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_associations" ADD CONSTRAINT "user_tenant_associations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_success_idx" ON "audit_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_timestamp_idx" ON "audit_logs" USING btree ("tenant_id","timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_user_timestamp_idx" ON "audit_logs" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_timestamp_idx" ON "audit_logs" USING btree ("resource_type","resource_id","timestamp");--> statement-breakpoint
CREATE INDEX "devices_site_id_idx" ON "devices" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "devices_name_idx" ON "devices" USING btree ("name");--> statement-breakpoint
CREATE INDEX "devices_type_idx" ON "devices" USING btree ("type");--> statement-breakpoint
CREATE INDEX "devices_status_idx" ON "devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "devices_serial_number_idx" ON "devices" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "devices_last_seen_at_idx" ON "devices" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "sites_tenant_id_idx" ON "sites" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sites_name_idx" ON "sites" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sites_status_idx" ON "sites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sites_location_idx" ON "sites" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "user_site_assignments_user_id_idx" ON "user_site_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_site_assignments_site_id_idx" ON "user_site_assignments" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "user_site_assignments_tenant_id_idx" ON "user_site_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_site_assignments_assigned_by_idx" ON "user_site_assignments" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "user_tenant_associations_user_id_idx" ON "user_tenant_associations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tenant_associations_tenant_id_idx" ON "user_tenant_associations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_tenant_associations_role_idx" ON "user_tenant_associations" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_tenant_associations_status_idx" ON "user_tenant_associations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_tenant_associations_invited_by_idx" ON "user_tenant_associations" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "users_keycloak_id_idx" ON "users" USING btree ("keycloak_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_user_type_idx" ON "users" USING btree ("user_type");--> statement-breakpoint
CREATE INDEX "users_created_by_idx" ON "users" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_tenant_id_idx" ON "tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_priority_idx" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_done_idx" ON "tasks" USING btree ("done");--> statement-breakpoint
CREATE INDEX "tenant_invitations_email_idx" ON "tenant_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "tenant_invitations_tenant_id_idx" ON "tenant_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_invitations_token_idx" ON "tenant_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "tenant_invitations_created_by_idx" ON "tenant_invitations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "tenant_invitations_expires_at_idx" ON "tenant_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_type_idx" ON "tenants" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenants_keycloak_group_id_idx" ON "tenants" USING btree ("keycloak_group_id");--> statement-breakpoint
ALTER TABLE "tenant_invitations" DROP COLUMN "invited_by";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "plan";