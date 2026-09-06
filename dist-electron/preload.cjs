//#region electron/preload.ts
require("electron").contextBridge.exposeInMainWorld("electronAPI", { platform: process.platform });
//#endregion
