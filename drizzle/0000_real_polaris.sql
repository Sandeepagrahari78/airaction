CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`case_id` text,
	`actor` text NOT NULL,
	`user` text NOT NULL,
	`operation` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_workspace` ON `audit` (`workspace`);--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`source` text NOT NULL,
	`location` text NOT NULL,
	`district` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`owner` text,
	`due_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`executor` text,
	`resolution` text,
	`reopened` integer DEFAULT 0 NOT NULL,
	`lat` real,
	`lng` real,
	`sample` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cases_workspace` ON `cases` (`workspace`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`case_id` text NOT NULL,
	`note` text NOT NULL,
	`filename` text,
	`mime` text,
	`size` integer,
	`object_key` text,
	`checksum` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	`sample` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_workspace_case` ON `evidence` (`workspace`,`case_id`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`station` text NOT NULL,
	`pollutant` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`observed_at` text NOT NULL,
	`provider` text NOT NULL,
	`averaging` text NOT NULL,
	`qc` text NOT NULL,
	`sample` integer DEFAULT 0 NOT NULL,
	`ingested_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_observations_workspace` ON `observations` (`workspace`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_observation_dedupe` ON `observations` (`workspace`,`station`,`pollutant`,`observed_at`,`provider`,`averaging`,`sample`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
