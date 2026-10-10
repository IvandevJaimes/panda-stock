ALTER TABLE `negocio` ADD `creado_en` text;--> statement-breakpoint
UPDATE `negocio` SET `creado_en` = `actualizado_en` WHERE `creado_en` IS NULL;
