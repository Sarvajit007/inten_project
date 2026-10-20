CREATE TABLE `files` (
	`id` varchar(36) NOT NULL,
	`ownerId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`size` int NOT NULL,
	`mimeType` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`status` enum('pending','complete','deleted') NOT NULL DEFAULT 'pending',
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);