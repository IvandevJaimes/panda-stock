PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_movimientos_stock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer,
	`lote_id` integer,
	`venta_id` integer,
	`tipo` text NOT NULL,
	`cantidad` real NOT NULL,
	`stock_anterior` real,
	`stock_posterior` real,
	`motivo` text,
	`fecha_hora` text NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_movimientos_stock`("id", "producto_id", "lote_id", "venta_id", "tipo", "cantidad", "stock_anterior", "stock_posterior", "motivo", "fecha_hora") SELECT "id", "producto_id", "lote_id", "venta_id", "tipo", "cantidad", "stock_anterior", "stock_posterior", "motivo", "fecha_hora" FROM `movimientos_stock`;--> statement-breakpoint
DROP TABLE `movimientos_stock`;--> statement-breakpoint
ALTER TABLE `__new_movimientos_stock` RENAME TO `movimientos_stock`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `movimientos_stock_producto_id_idx` ON `movimientos_stock` (`producto_id`);