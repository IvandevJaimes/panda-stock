CREATE TABLE `negocio` (
	`id` integer PRIMARY KEY NOT NULL,
	`nombre` text,
	`logo_path` text,
	`password_hash` text,
	`actualizado_en` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `productos` ADD `img_path` text;