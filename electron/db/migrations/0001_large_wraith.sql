DROP INDEX `lotes_producto_id_idx`;--> statement-breakpoint
CREATE INDEX `lotes_producto_id_idx` ON `lotes` (`producto_id`);--> statement-breakpoint
DROP INDEX `movimientos_stock_producto_id_idx`;--> statement-breakpoint
CREATE INDEX `movimientos_stock_producto_id_idx` ON `movimientos_stock` (`producto_id`);