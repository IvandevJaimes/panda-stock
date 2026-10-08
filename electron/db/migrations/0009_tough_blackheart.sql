CREATE TABLE `detalle_devoluciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`devolucion_id` integer NOT NULL,
	`detalle_venta_id` integer NOT NULL,
	`cantidad` real NOT NULL,
	`importe` real NOT NULL,
	`costo` real NOT NULL,
	`ganancia_revertida` real NOT NULL,
	FOREIGN KEY (`devolucion_id`) REFERENCES `devoluciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`detalle_venta_id`) REFERENCES `detalle_ventas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `detalle_devoluciones_devolucion_id_idx` ON `detalle_devoluciones` (`devolucion_id`);--> statement-breakpoint
CREATE TABLE `devolucion_medios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`devolucion_id` integer NOT NULL,
	`metodo` text NOT NULL,
	`monto` real NOT NULL,
	FOREIGN KEY (`devolucion_id`) REFERENCES `devoluciones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `devolucion_medios_devolucion_id_idx` ON `devolucion_medios` (`devolucion_id`);--> statement-breakpoint
CREATE TABLE `devolucion_reintegros` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`devolucion_id` integer NOT NULL,
	`metodo` text NOT NULL,
	`monto` real NOT NULL,
	`pago_origen_id` integer,
	`cuenta_movimiento_origen_id` integer,
	FOREIGN KEY (`devolucion_id`) REFERENCES `devoluciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pago_origen_id`) REFERENCES `pagos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cuenta_movimiento_origen_id`) REFERENCES `cuentas_corrientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `devolucion_reintegros_devolucion_id_idx` ON `devolucion_reintegros` (`devolucion_id`);--> statement-breakpoint
CREATE TABLE `devoluciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`caja_id` integer,
	`fecha_hora` text NOT NULL,
	`total` real NOT NULL,
	`costo` real NOT NULL,
	`ganancia_revertida` real NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`caja_id`) REFERENCES `cajas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `devoluciones_venta_id_idx` ON `devoluciones` (`venta_id`);--> statement-breakpoint
CREATE INDEX `devoluciones_fecha_hora_idx` ON `devoluciones` (`fecha_hora`);--> statement-breakpoint
ALTER TABLE `cuentas_corrientes` ADD `abono_origen_id` integer REFERENCES cuentas_corrientes(id);