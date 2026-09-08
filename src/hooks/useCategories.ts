import { useCallback, useEffect, useState } from "react";
import type { Categoria } from "../../electron/db/types";
import { categoriasService } from "../services/categorias.service";

export function useCategories() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriasService.getAll();
      setCategories(data.filter((c) => c.activo));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
