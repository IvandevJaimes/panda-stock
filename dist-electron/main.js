import { BrowserWindow, app } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var isDev = !app.isPackaged;
function createWindow() {
	const win = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 1100,
		minHeight: 700,
		webPreferences: {
			preload: path.join(__dirname, "../dist-electron/preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true
		}
	});
	if (isDev) win.loadURL("http://localhost:5173");
	else win.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
