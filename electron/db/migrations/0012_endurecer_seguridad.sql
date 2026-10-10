CREATE TABLE `seguridad` (
	`id` integer PRIMARY KEY NOT NULL,
	`pin_hash` text,
	`password_configured` integer DEFAULT false NOT NULL,
	`protections_initialized` integer DEFAULT false NOT NULL,
	`protecciones_json` text DEFAULT '{"reportes":false,"cuentasCorrientes":false,"anularVentas":false,"eliminarProductos":false,"eliminarLotes":false,"eliminarCategorias":false,"eliminarMarcas":false}' NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`lockout_level` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`actualizado_en` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `seguridad` (`id`, `pin_hash`, `password_configured`, `protections_initialized`, `protecciones_json`, `failed_attempts`, `lockout_level`, `locked_until`, `actualizado_en`)
SELECT
	`id`,
	CASE WHEN `pin_hash` = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' THEN NULL ELSE `pin_hash` END,
	CASE WHEN `pin_hash` = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' THEN 0 ELSE 1 END,
	0,
	'{"reportes":false,"cuentasCorrientes":false,"anularVentas":false,"eliminarProductos":false,"eliminarLotes":false,"eliminarCategorias":false,"eliminarMarcas":false}',
	0,
	0,
	NULL,
	`actualizado_en`
FROM `seguridad_reportes`;
--> statement-breakpoint
DROP TABLE `seguridad_cuentas`;--> statement-breakpoint
DROP TABLE `seguridad_reportes`;--> statement-breakpoint
ALTER TABLE `negocio` DROP COLUMN `password_hash`;
