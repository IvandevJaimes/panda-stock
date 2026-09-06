CREATE TABLE `cajas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`empleado_id` integer NOT NULL,
	`monto_inicial` real DEFAULT 0 NOT NULL,
	`monto_esperado` real,
	`monto_real` real,
	`diferencia` real,
	`estado` text DEFAULT 'abierta' NOT NULL,
	`fecha_apertura` text,
	`fecha_cierre` text,
	`observaciones` text,
	FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nombre_unique` ON `categorias` (`nombre`);--> statement-breakpoint
CREATE TABLE `detalle_ventas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`producto_id` integer,
	`lote_id` integer,
	`tipo_tarifa` text DEFAULT 'minorista' NOT NULL,
	`descripcion_item` text NOT NULL,
	`cantidad` real NOT NULL,
	`precio_unitario` real NOT NULL,
	`costo_unitario` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`numero_lote` text,
	`fecha_ingreso` text NOT NULL,
	`fecha_vence` text,
	`costo_unitario` real DEFAULT 0 NOT NULL,
	`cantidad_inicial` real NOT NULL,
	`cantidad_actual` real NOT NULL,
	`creado_en` text NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lotes_producto_id_idx` ON `lotes` (`producto_id`);--> statement-breakpoint
CREATE TABLE `marcas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marcas_nombre_unique` ON `marcas` (`nombre`);--> statement-breakpoint
CREATE TABLE `movimientos_stock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
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
CREATE UNIQUE INDEX `movimientos_stock_producto_id_idx` ON `movimientos_stock` (`producto_id`);--> statement-breakpoint
CREATE TABLE `pagos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`metodo` text NOT NULL,
	`monto` real NOT NULL,
	`referencia` text,
	`fecha_hora` text NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoria_id` integer,
	`marca_id` integer,
	`nombre` text NOT NULL,
	`codigo_interno` text NOT NULL,
	`codigos_barras` text,
	`tipo_venta` text DEFAULT 'unidad' NOT NULL,
	`unidad_medida` text DEFAULT 'unidad' NOT NULL,
	`costo` real DEFAULT 0 NOT NULL,
	`porcentaje_ganancia` real DEFAULT 0 NOT NULL,
	`precio_venta` real DEFAULT 0 NOT NULL,
	`precio_mayoreo` real DEFAULT 0 NOT NULL,
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
CREATE UNIQUE INDEX `productos_codigo_interno_unique` ON `productos` (`codigo_interno`);--> statement-breakpoint
CREATE TABLE `seguridad_reportes` (
	`id` integer PRIMARY KEY NOT NULL,
	`pin_hash` text NOT NULL,
	`actualizado_en` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ventas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caja_id` integer,
	`empleado_id` integer NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`descuento` real DEFAULT 0 NOT NULL,
	`impuesto` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`estado` text DEFAULT 'completada' NOT NULL,
	`fecha_hora` text NOT NULL,
	FOREIGN KEY (`caja_id`) REFERENCES `cajas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON UPDATE no action ON DELETE no action
);
