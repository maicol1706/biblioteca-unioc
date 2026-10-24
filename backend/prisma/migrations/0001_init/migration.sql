-- CreateEnum
CREATE TYPE "IdentitySource" AS ENUM ('LOCAL', 'Q10');
CREATE TYPE "AcademicKind" AS ENUM ('STUDENT', 'TEACHER', 'STAFF', 'NONE');
CREATE TYPE "CopyStatus" AS ENUM ('AVAILABLE', 'LOANED', 'RESERVED', 'MAINTENANCE', 'LOST', 'WITHDRAWN');
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST');
CREATE TYPE "ReservationStatus" AS ENUM ('QUEUED', 'NOTIFIED', 'FULFILLED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "ReminderKind" AS ENUM ('DAYS_BEFORE_7', 'DAYS_BEFORE_3', 'DAYS_BEFORE_1', 'DUE_DAY', 'OVERDUE');
CREATE TYPE "ReminderJobStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'LOAN_CREATED', 'DUE_SOON', 'LOAN_OVERDUE', 'RESERVATION_AVAILABLE', 'RETURN_REGISTERED');
CREATE TYPE "AiMessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');
CREATE TYPE "Q10SyncStatus" AS ENUM ('STARTED', 'SUCCESS', 'PARTIAL', 'FAILED');

-- Users
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "document_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "identity_source" "IdentitySource" NOT NULL DEFAULT 'LOCAL',
    "external_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_document_number_key" ON "users"("document_number");
CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");
CREATE INDEX "users_is_active_idx" ON "users"("is_active");
CREATE INDEX "users_identity_source_idx" ON "users"("identity_source");

CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "kind" "AcademicKind" NOT NULL DEFAULT 'NONE',
    "student_code" TEXT,
    "program" TEXT,
    "academic_status" TEXT,
    "institutional_email" TEXT,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "user_profiles_student_code_key" ON "user_profiles"("student_code");
CREATE INDEX "user_profiles_kind_idx" ON "user_profiles"("kind");

CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- Catalog
CREATE TABLE "publishers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "publishers_name_key" ON "publishers"("name");

CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

CREATE TABLE "authors" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "authors_full_name_idx" ON "authors"("full_name");

CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "publication_year" INTEGER,
    "edition" TEXT,
    "classification_code" TEXT,
    "physical_location" TEXT,
    "cover_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "publisher_id" UUID,
    "category_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");
CREATE INDEX "books_title_idx" ON "books"("title");
CREATE INDEX "books_category_id_idx" ON "books"("category_id");
CREATE INDEX "books_publisher_id_idx" ON "books"("publisher_id");
CREATE INDEX "books_is_active_idx" ON "books"("is_active");

CREATE TABLE "book_authors" (
    "book_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "book_authors_pkey" PRIMARY KEY ("book_id","author_id")
);

CREATE TABLE "copies" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "copy_code" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "status" "CopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "acquired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "copies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "copies_barcode_key" ON "copies"("barcode");
CREATE UNIQUE INDEX "copies_book_id_copy_code_key" ON "copies"("book_id", "copy_code");
CREATE INDEX "copies_book_id_status_idx" ON "copies"("book_id", "status");
CREATE INDEX "copies_status_idx" ON "copies"("status");

-- Circulation
CREATE TABLE "loan_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "assigned_copy_id" UUID,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "notes" TEXT,
    CONSTRAINT "loan_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "loan_requests_status_requested_at_idx" ON "loan_requests"("status", "requested_at");
CREATE INDEX "loan_requests_user_id_status_idx" ON "loan_requests"("user_id", "status");
CREATE INDEX "loan_requests_book_id_idx" ON "loan_requests"("book_id");

CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "copy_id" UUID NOT NULL,
    "request_id" UUID,
    "librarian_id" UUID,
    "loaned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_on" DATE NOT NULL,
    "returned_at" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loans_request_id_key" ON "loans"("request_id");
CREATE INDEX "loans_user_id_status_idx" ON "loans"("user_id", "status");
CREATE INDEX "loans_copy_id_status_idx" ON "loans"("copy_id", "status");
CREATE INDEX "loans_status_due_on_idx" ON "loans"("status", "due_on");

CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "queue_position" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reservations_book_id_status_queue_position_idx" ON "reservations"("book_id", "status", "queue_position");
CREATE INDEX "reservations_user_id_status_idx" ON "reservations"("user_id", "status");

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

CREATE TABLE "reminder_jobs" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "ReminderJobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "error" TEXT,
    CONSTRAINT "reminder_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "reminder_jobs_loan_id_kind_key" ON "reminder_jobs"("loan_id", "kind");
CREATE INDEX "reminder_jobs_status_scheduled_for_idx" ON "reminder_jobs"("status", "scheduled_for");

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "payload" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "q10_sync_logs" (
    "id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "Q10SyncStatus" NOT NULL DEFAULT 'STARTED',
    "records_ok" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "triggered_by_id" UUID,
    CONSTRAINT "q10_sync_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "q10_sync_logs_started_at_idx" ON "q10_sync_logs"("started_at");

CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_conversations_user_id_updated_at_idx" ON "ai_conversations"("user_id", "updated_at");

CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

CREATE TABLE "ai_tool_invocations" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "tool_name" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "arguments" JSONB,
    "result_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_tool_invocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_tool_invocations_tool_name_allowed_idx" ON "ai_tool_invocations"("tool_name", "allowed");

-- Foreign keys
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "copies" ADD CONSTRAINT "copies_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_assigned_copy_id_fkey" FOREIGN KEY ("assigned_copy_id") REFERENCES "copies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "loan_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_librarian_id_fkey" FOREIGN KEY ("librarian_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminder_jobs" ADD CONSTRAINT "reminder_jobs_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "q10_sync_logs" ADD CONSTRAINT "q10_sync_logs_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_tool_invocations" ADD CONSTRAINT "ai_tool_invocations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity extras that Prisma no expresa bien
ALTER TABLE "copies" ADD CONSTRAINT "copies_copy_code_not_empty" CHECK (length(trim("copy_code")) > 0);
ALTER TABLE "books" ADD CONSTRAINT "books_title_not_empty" CHECK (length(trim("title")) > 0);
ALTER TABLE "books" ADD CONSTRAINT "books_year_valid" CHECK ("publication_year" IS NULL OR ("publication_year" >= 1450 AND "publication_year" <= 2100));
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_queue_positive" CHECK ("queue_position" > 0);
ALTER TABLE "loans" ADD CONSTRAINT "loans_return_after_loan" CHECK ("returned_at" IS NULL OR "returned_at" >= "loaned_at");

CREATE UNIQUE INDEX "loans_one_open_per_copy"
  ON "loans" ("copy_id")
  WHERE "status" IN ('ACTIVE', 'OVERDUE');

CREATE UNIQUE INDEX "reservations_one_queued_position_per_book"
  ON "reservations" ("book_id", "queue_position")
  WHERE "status" = 'QUEUED';

CREATE UNIQUE INDEX "reservations_one_open_per_user_book"
  ON "reservations" ("user_id", "book_id")
  WHERE "status" IN ('QUEUED', 'NOTIFIED');

CREATE UNIQUE INDEX "loan_requests_one_pending_per_user_book"
  ON "loan_requests" ("user_id", "book_id")
  WHERE "status" = 'PENDING';

REVOKE UPDATE, DELETE ON "audit_logs" FROM PUBLIC;
