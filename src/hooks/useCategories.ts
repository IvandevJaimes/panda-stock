import { useCallback, useEffect, useState } from "react";
import type { Categoria } from "../../electron/db/types";
import { categoriasService } from "../services/categorias.service";

export function useCategories() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const obtenerActivas = useCallback(async (): Promise<Categoria[]> => {
    const data = await categoriasService.getAll();
    return data.filter((c) => c.activo);
  }, []);

  // Fetch inicial al montar. Los setState viven en callbacks asíncronos (.then/.catch)
  // y el flag "activo" evita setState después del desmontaje. Nunca setState síncrono
  // en el cuerpo del effect (regla react-hooks/set-state-in-effect).
  useEffect(() => {
    let activo = true;
    void obtenerActivas()
      .then((activas) => {
        if (!activo) return;
        setCategories(activas);
        setLoading(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err instanceof Error ? err.message : "Error al cargar categorías");
        setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [obtenerActivas]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activas = await obtenerActivas();
      setCategories(activas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, [obtenerActivas]);

  const addCategory = useCallback((created: Categoria) => {
    setCategories((prev) => [...prev, created]);
  }, []);

  const updateCategory = useCallback((updated: Categoria) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }, []);

  const removeCategory = useCallback(async (id: number) => {
    await categoriasService.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    categories,
    loading,
    error,
    refresh,
    addCategory,
    updateCategory,
    removeCategory,
  };
}
