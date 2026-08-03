CREATE TABLE `news_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`rss_url` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_news_sources_name` ON `news_sources` (`name`);--> statement-breakpoint
CREATE TABLE `tracked_keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`scope` text DEFAULT '全台' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tracked_keywords_keyword_scope` ON `tracked_keywords` (`keyword`,`scope`);