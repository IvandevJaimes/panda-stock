// Tokens visuales compartidos por los menús de la app (DropdownMenu y
// ContextMenu). Viven aparte de los componentes para que ambos menús se vean
// exactamente igual y para no exportar constantes desde un archivo de
// componentes (react-refresh/only-export-components).

export const dropdownPanelBase =
  "fixed z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 outline-none dark:border-slate-800 dark:bg-[#0B1120] dark:shadow-black/40";

export const dropdownItemBase =
  "group inline-flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium outline-none transition-colors";

export const dropdownItemVariants = {
  default:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 focus-visible:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white dark:focus-visible:bg-slate-800/80 dark:focus-visible:text-white",
  danger:
    "text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:focus-visible:bg-red-500/10 dark:focus-visible:text-red-300",
} as const;

export type DropdownMenuItemVariant = keyof typeof dropdownItemVariants;
