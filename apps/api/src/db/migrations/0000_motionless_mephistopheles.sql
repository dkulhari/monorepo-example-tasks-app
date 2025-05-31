CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."tenant_type" AS ENUM('enterprise', 'standard', 'trial', 'demo');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('system_admin', 'regular', 'service_account', 'guest');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_tenant_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('active', 'inactive', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('active', 'inactive', 'maintenance', 'offline');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'login', 'logout', 'invite', 'accept_invite', 'reject_invite', 'suspend', 'activate', 'deactivate', 'assign_role', 'revoke_role', 'export_data', 'import_data');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('tenant', 'user', 'site', 'device', 'invitation', 'role', 'settings');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"type" "tenant_type" DEFAULT 'standard' NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"keycloak_group_id" varchar(255),
	"settings" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_keycloak_group_id_unique" UNIQUE("keycloak_group_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keycloak_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_by" uuid,
	"user_type" "user_type" DEFAULT 'regular' NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_keycloak_id_unique" UNIQUE("keycloak_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_tenant_associations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"status" "user_tenant_status" DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"invited_by" uuid,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_tenant_unique" UNIQUE("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"coordinates" json,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"status" "site_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_site_assignments" (
	"user_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_site_assignments_user_id_site_id_pk" PRIMARY KEY("user_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"serial_number" varchar(255) NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"status" "device_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource_type" "resource_type" NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"details" json DEFAULT '{}'::json,
	"ip_address" "inet",
	"user_agent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" "role" DEFAULT 'member' NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invitations_token_unique" UNIQUE("token"),
	CONSTRAINT "invitations_email_tenant_unique" UNIQUE("email","tenant_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_associations" ADD CONSTRAINT "user_tenant_associations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_associations" ADD CONSTRAINT "user_tenant_associations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_associations" ADD CONSTRAINT "user_tenant_associations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_assignments" ADD CONSTRAINT "user_site_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenants_keycloak_group_idx" ON "tenants" USING btree ("keycloak_group_id");--> statement-breakpoint
CREATE INDEX "users_keycloak_id_idx" ON "users" USING btree ("keycloak_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_user_type_idx" ON "users" USING btree ("user_type");--> statement-breakpoint
CREATE INDEX "users_created_by_idx" ON "users" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "user_tenant_user_id_idx" ON "user_tenant_associations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tenant_tenant_id_idx" ON "user_tenant_associations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_tenant_status_idx" ON "user_tenant_associations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_tenant_role_idx" ON "user_tenant_associations" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_tenant_last_active_idx" ON "user_tenant_associations" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "user_tenant_tenant_status_idx" ON "user_tenant_associations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "user_tenant_user_status_idx" ON "user_tenant_associations" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "sites_tenant_id_idx" ON "sites" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sites_status_idx" ON "sites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sites_name_idx" ON "sites" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sites_tenant_status_idx" ON "sites" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "user_site_user_id_idx" ON "user_site_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_site_site_id_idx" ON "user_site_assignments" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "user_site_tenant_id_idx" ON "user_site_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_site_user_tenant_idx" ON "user_site_assignments" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "user_site_site_tenant_idx" ON "user_site_assignments" USING btree ("site_id","tenant_id");--> statement-breakpoint
CREATE INDEX "devices_site_id_idx" ON "devices" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "devices_status_idx" ON "devices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "devices_type_idx" ON "devices" USING btree ("type");--> statement-breakpoint
CREATE INDEX "devices_serial_number_idx" ON "devices" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "devices_site_status_idx" ON "devices" USING btree ("site_id","status");--> statement-breakpoint
CREATE INDEX "devices_site_type_idx" ON "devices" USING btree ("site_id","type");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_timestamp_idx" ON "audit_logs" USING btree ("tenant_id","timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_user_timestamp_idx" ON "audit_logs" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_action_idx" ON "audit_logs" USING btree ("tenant_id","action");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "tenant_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_tenant_id_idx" ON "tenant_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "tenant_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_expires_at_idx" ON "tenant_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitations_accepted_idx" ON "tenant_invitations" USING btree ("accepted");--> statement-breakpoint
CREATE INDEX "invitations_tenant_accepted_idx" ON "tenant_invitations" USING btree ("tenant_id","accepted");