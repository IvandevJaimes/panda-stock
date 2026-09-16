PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoria_id` integer,
	`marca_id` integer,
	`nombre` text NOT NULL,
	`codigo_interno` text,
	`codigos_barras` text,
	`variante` text,
	`tipo_venta` text DEFAULT 'unidad' NOT NULL,
	`unidad_medida` text DEFAULT 'unidad' NOT NULL,
	`costo` real DEFAULT 0 NOT NULL,
	`porcentaje_ganancia` real DEFAULT 0 NOT NULL,
	`precio_venta` real DEFAULT 0 NOT NULL,
	`stock_actual` real DEFAULT 0 NOT NULL,
	`stock_minimo` real DEFAULT 0 NOT NULL,
	`vencimiento` text,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL,
	`actualizado_en` text,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`marca_id`) REFERENCES `marcas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_productos`("id", "categoria_id", "marca_id", "nombre", "codigo_interno", "codigos_barras", "variante", "tipo_venta", "unidad_medida", "costo", "porcentaje_ganancia", "precio_venta", "stock_actual", "stock_minimo", "vencimiento", "activo", "creado_en", "actualizado_en") SELECT "id", "categoria_id", "marca_id", "nombre", "codigo_interno", "codigos_barras", "variante", "tipo_venta", "unidad_medida", "costo", "porcentaje_ganancia", "precio_venta", "stock_actual", "stock_minimo", "vencimiento", "activo", "creado_en", "actualizado_en" FROM `productos`;--> statement-breakpoint
DROP TABLE `productos`;--> statement-breakpoint
ALTER TABLE `__new_productos` RENAME TO `productos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `productos_codigo_interno_unique` ON `productos` (`codigo_interno`);