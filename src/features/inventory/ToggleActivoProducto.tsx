import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "../../components/ui/Switch";
import { Tooltip } from "../../components/ui/Tooltip";
import { productosService } from "../../services/productos.service";
import type { Producto } from "../../../electron/db/types";

interface ToggleActivoProductoProps {
  producto: Producto;
  /** Refresca el listado tras el cambio. */
  onChanged?: () => void;
  /** Se invoca cuando el producto pasa a inactivo (ej: cerrar el modal). */
  onDesactivado?: () => void;
}

/**
 * Switch de soft delete del producto. "Activo" = visible en el inventario;
 * "Inactivo" = retirado de la grilla sin borrar filas ni historial.
 */
export function ToggleActivoProducto({
  producto,
  onChanged,
  onDesactivado,
}: ToggleActivoProductoProps) {
  const [activo, setActivo] = useState(producto.activo);
  const [guardando, setGuardando] = useState(false);

  const handleToggle = (nuevo: boolean) => {
    if (guardando) return;
    setGuardando(true);
    setActivo(nuevo);
    productosService
      .toggle(producto.id, nuevo)
      .then(() => {
        toast.success(
          nuevo
            ? `Producto "${producto.nombre}" activado`
            : `Producto "${producto.nombre}" desactivado`,
        );
        onChanged?.();
        if (!nuevo) onDesactivado?.();
      })
      .catch((err) => {
        setActivo(!nuevo);
        toast.error(
          err instanceof Error ? err.message : "No se pudo cambiar el estado",
        );
      })
      .finally(() => setGuardando(false));
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={
          activo
            ? "text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            : "text-xs font-semibold text-slate-400 dark:text-slate-500"
        }
      >
        {activo ? "Activo" : "Inactivo"}
      </span>
      <Tooltip
        content={
          activo
            ? "Desactivar: el producto sale del inventario sin borrar su historial"
            : "Activar: vuelve a aparecer en el inventario"
        }
        placement="bottom"
      >
        <span>
          <Switch
            checked={activo}
            onCheckedChange={handleToggle}
            disabled={guardando}
            id={`toggle-activo-${producto.id}`}
          />
        </span>
      </Tooltip>
    </div>
  );
}
