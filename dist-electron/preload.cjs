let electron = require("electron");
//#region electron/preload.ts
electron.webFrame.setZoomFactor(.85);
electron.webFrame.setVisualZoomLevelLimits(1, 1);
electron.contextBridge.exposeInMainWorld("electronAPI", {
	platform: process.platform,
	seguridad: {
		verifyPin: (pin) => electron.ipcRenderer.invoke("seguridad:verify-pin", pin),
		changePin: (pinActual, pinNuevo) => electron.ipcRenderer.invoke("seguridad:change-pin", pinActual, pinNuevo)
	},
	empleados: {
		getAll: () => electron.ipcRenderer.invoke("empleados:get-all"),
		create: (data) => electron.ipcRenderer.invoke("empleados:create", data),
		toggle: (id, activo) => electron.ipcRenderer.invoke("empleados:toggle", id, activo)
	},
	categorias: {
		getAll: () => electron.ipcRenderer.invoke("categorias:get-all"),
		create: (nombre) => electron.ipcRenderer.invoke("categorias:create", nombre),
		update: (id, nombre) => electron.ipcRenderer.invoke("categorias:update", id, nombre),
		delete: (id) => electron.ipcRenderer.invoke("categorias:delete", id)
	},
	marcas: {
		getAll: () => electron.ipcRenderer.invoke("marcas:get-all"),
		create: (nombre) => electron.ipcRenderer.invoke("marcas:create", nombre),
		update: (id, nombre) => electron.ipcRenderer.invoke("marcas:update", id, nombre),
		delete: (id) => electron.ipcRenderer.invoke("marcas:delete", id)
	},
	productos: {
		scan: (codigo) => electron.ipcRenderer.invoke("productos:scan", codigo),
		getAll: (filtros) => electron.ipcRenderer.invoke("productos:get-all", filtros),
		getById: (id) => electron.ipcRenderer.invoke("productos:get-by-id", id),
		create: (data) => electron.ipcRenderer.invoke("productos:create", data),
		update: (id, data) => electron.ipcRenderer.invoke("productos:update", id, data),
		delete: (id) => electron.ipcRenderer.invoke("productos:delete", id),
		getAlerts: () => electron.ipcRenderer.invoke("productos:get-alerts")
	},
	lotes: {
		getByProducto: (productoId) => electron.ipcRenderer.invoke("lotes:get-by-producto", productoId),
		create: (data) => electron.ipcRenderer.invoke("lotes:create", data),
		getExpiring: (diasLimite) => electron.ipcRenderer.invoke("lotes:get-expiring", diasLimite)
	},
	cajas: {
		getActive: () => electron.ipcRenderer.invoke("cajas:get-active"),
		open: (data) => electron.ipcRenderer.invoke("cajas:open", data),
		getSummary: (cajaId) => electron.ipcRenderer.invoke("cajas:get-summary", cajaId),
		close: (data) => electron.ipcRenderer.invoke("cajas:close", data)
	},
	ventas: {
		process: (venta) => electron.ipcRenderer.invoke("ventas:process", venta),
		getAll: (filtros) => electron.ipcRenderer.invoke("ventas:get-all", filtros),
		getDetail: (idVenta) => electron.ipcRenderer.invoke("ventas:get-detail", idVenta)
	},
	movimientos: {
		getAll: (filtros) => electron.ipcRenderer.invoke("movimientos:get-all", filtros),
		ajuste: (data) => electron.ipcRenderer.invoke("movimientos:ajuste", data)
	},
	reportes: { getSummary: (filtros) => electron.ipcRenderer.invoke("reportes:summary", filtros) }
});
//#endregion
