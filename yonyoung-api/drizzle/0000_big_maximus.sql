CREATE TABLE IF NOT EXISTS `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`cover_image_url` text NOT NULL,
	`generation_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activities_generation_id_idx` ON `activities` (`generation_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activities_start_date_idx` ON `activities` (`start_date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activities_end_date_idx` ON `activities` (`end_date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `activity_images` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_images_activity_id_idx` ON `activity_images` (`activity_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_images_sort_order_idx` ON `activity_images` (`sort_order`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`actor_role` text,
	`changed_fields` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_logs_resource_idx` ON `audit_logs` (`resource_type`,`resource_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_logs_actor_id_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exhibition_images` (
	`id` text PRIMARY KEY NOT NULL,
	`exhibition_id` text NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`exhibition_id`) REFERENCES `exhibitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exhibition_images_exhibition_id_idx` ON `exhibition_images` (`exhibition_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exhibition_images_sort_order_idx` ON `exhibition_images` (`sort_order`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exhibitions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`generation_id` text NOT NULL,
	`place` text NOT NULL,
	`cover_image_url` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exhibitions_generation_id_idx` ON `exhibitions` (`generation_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exhibitions_start_date_idx` ON `exhibitions` (`start_date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exhibitions_end_date_idx` ON `exhibitions` (`end_date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `generation_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`image_urls` text DEFAULT '[]' NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `generation_notices_generation_id_idx` ON `generation_notices` (`generation_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `generation_notices_author_id_idx` ON `generation_notices` (`author_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `generation_notices_created_at_idx` ON `generation_notices` (`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `generations_sort_order_unique` ON `generations` (`sort_order`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `generations_start_date_idx` ON `generations` (`start_date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `global_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`image_urls` text DEFAULT '[]' NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `global_notices_author_id_idx` ON `global_notices` (`author_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `global_notices_created_at_idx` ON `global_notices` (`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `linktree` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `linktree_items` (
	`id` text PRIMARY KEY NOT NULL,
	`linktree_id` text NOT NULL,
	`name` text NOT NULL,
	`link` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`linktree_id`) REFERENCES `linktree`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `linktree_items_linktree_id_idx` ON `linktree_items` (`linktree_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `market_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`item_id`) REFERENCES `market_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_comments_item_created_idx` ON `market_comments` (`item_id`,`created_at`,`deleted_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_comments_author_deleted_idx` ON `market_comments` (`author_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `market_item_images` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`item_id`) REFERENCES `market_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_item_images_item_sort_idx` ON `market_item_images` (`item_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `market_items` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text,
	`product_code` text,
	`condition_grade` text,
	`description` text,
	`price` integer NOT NULL,
	`status` text DEFAULT 'selling' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_items_status_created_idx` ON `market_items` (`status`,`created_at`,`deleted_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_items_seller_deleted_idx` ON `market_items` (`seller_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `market_push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `market_push_subscriptions_endpoint_unique` ON `market_push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `market_push_subscriptions_user_idx` ON `market_push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `recruiting_plans` (
	`year` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`promotion_image_urls` text NOT NULL,
	`recruitment_start_at` integer NOT NULL,
	`recruitment_end_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`footer_open_chat_url` text NOT NULL,
	`footer_instagram_id` text NOT NULL,
	`footer_email` text NOT NULL,
	`footer_phone` text NOT NULL,
	`footer_address` text NOT NULL,
	`donate_bank_name` text NOT NULL,
	`donate_account_number` text NOT NULL,
	`donate_account_holder` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`showcase_image_urls` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`family_name` text,
	`given_name` text,
	`college` text,
	`department` text,
	`student_number` text,
	`phone_number` text,
	`collaboration_available` integer DEFAULT false NOT NULL,
	`personal_link` text,
	`role` text DEFAULT 'unverified',
	`generation_id` text,
	`latest_generation_sort_order` integer,
	`deleted_at` integer,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_generations` (
	`user_id` text NOT NULL,
	`generation_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `generation_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_generations_user_id_idx` ON `user_generations` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_generations_generation_id_idx` ON `user_generations` (`generation_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `verification_identifier_idx` ON `verification` (`identifier`);