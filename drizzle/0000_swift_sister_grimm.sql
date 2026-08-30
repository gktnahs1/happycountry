CREATE TABLE `article_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`published_at` text DEFAULT '' NOT NULL,
	`updated_at` text,
	`cover_json` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`compiled_json` text,
	`validation_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_article_revisions_sequence` ON `article_revisions` (`article_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_article_revisions_article` ON `article_revisions` (`article_id`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`draft_revision_id` text,
	`published_revision_id` text,
	`has_published` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_slug` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_articles_status` ON `articles` (`status`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_kind` text NOT NULL,
	`public_path` text,
	`r2_key` text,
	`original_file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assets_r2_key` ON `assets` (`r2_key`);--> statement-breakpoint
CREATE TABLE `system_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
