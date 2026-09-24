import { ArrowLeft } from "lucide-react";
import { Tooltip } from "../../../components/ui/Tooltip";
import type { Producto } from "../../../../electron/db/types";
import { formatearCodigo } from "./formatters";

interface HeaderMiniProps {
  producto: Producto;
  titulo: string;
  onBack: () => void;
}

export function HeaderMini({ producto, titulo, onBack }: HeaderMiniProps) {
  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <Tooltip content="Volver al menú de acciones" placement="right">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Tooltip>
        <h3 className="min-w-0 truncate font-display text-lg font-bold text-slate-900 dark:text-white">
          {titulo}
        </h3>
      </div>
      <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {producto.nombre}
              {producto.variante && (
                <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
                  · {producto.variante}
                </span>
              )}
            </h4>
            <div className="text-xs text-slate-500">
              Stock actual:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {producto.stockActual} und
              </span>
            </div>
            {(producto.codigoInterno || producto.codigosBarras) && (
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {producto.codigoInterno && (
                  <>
                    <span>Código interno: </span>
                    <span className="font-mono">{producto.codigoInterno}</span>
                  </>
                )}
                {producto.codigoInterno && producto.codigosBarras && (
                  <span className="mx-1.5 text-slate-300 dark:text-slate-600">
                    •
                  </span>
                )}
                {producto.codigosBarras && (
                  <>
                    <span>Barras: </span>
                    <span className="font-mono">
                      {formatearCodigo(producto.codigosBarras)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}