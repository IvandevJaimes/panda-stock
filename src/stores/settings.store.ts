import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type SettingsState = {
  /** Nombre del comercio / local, editable en configuraciones. */
  storeName: string
  setStoreName: (name: string) => void
  /**
   * Control de caja por turno: obliga a abrir caja antes de cobrar y a
   * cerrarla al final de la jornada. Desactivado, se cobra sin apertura,
   * cierre ni rendición de caja.
   */
  ventasPorCajas: boolean
  setVentasPorCajas: (active: boolean) => void
  /** Emite un sonido cuando llega una notificación nueva de la campanita. */
  sonidoAlertas: boolean
  setSonidoAlertas: (active: boolean) => void
  /** Muestra el botón de tarjeta en el ticket de venta. */
  tarjetaHabilitada: boolean
  setTarjetaHabilitada: (active: boolean) => void
  /** Habilita vender a cuenta corriente y la pestaña de cuentas corrientes. */
  cuentaCorrienteHabilitada: boolean
  setCuentaCorrienteHabilitada: (active: boolean) => void
  /** Recargo % que se aplica al total cuando se cobra con tarjeta de crédito. */
  recargoTarjetaCredito: number
  setRecargoTarjetaCredito: (porcentaje: number) => void
  /** Aplica el descuento de mayoreo automáticamente al alcanzar el umbral. */
  descuentoAutomatico: boolean
  setDescuentoAutomatico: (active: boolean) => void
  /** Porcentaje de descuento del mayoreo (10 = 10%). */
  descuentoPorcentaje: number
  setDescuentoPorcentaje: (porcentaje: number) => void
  /** Unidades mínimas para que empiece a aplicar el descuento. */
  descuentoDesdeUnidades: number
  setDescuentoDesdeUnidades: (unidades: number) => void
  /** Pide contraseña al abrir reportes, cuentas corrientes y al anular ventas. */
  pedidoContrasenaHabilitado: boolean
  setPedidoContrasenaHabilitado: (active: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storeName: 'PANDA STOCK',
      setStoreName: (storeName) => set({ storeName }),
      ventasPorCajas: true,
      setVentasPorCajas: (ventasPorCajas) => set({ ventasPorCajas }),
      sonidoAlertas: false,
      setSonidoAlertas: (sonidoAlertas) => set({ sonidoAlertas }),
      tarjetaHabilitada: true,
      setTarjetaHabilitada: (tarjetaHabilitada) => set({ tarjetaHabilitada }),
      cuentaCorrienteHabilitada: true,
      setCuentaCorrienteHabilitada: (cuentaCorrienteHabilitada) =>
        set({ cuentaCorrienteHabilitada }),
      recargoTarjetaCredito: 0,
      setRecargoTarjetaCredito: (porcentaje) =>
        set({ recargoTarjetaCredito: Math.min(100, Math.max(0, porcentaje)) }),
      descuentoAutomatico: true,
      setDescuentoAutomatico: (descuentoAutomatico) => set({ descuentoAutomatico }),
      descuentoPorcentaje: 10,
      setDescuentoPorcentaje: (porcentaje) =>
        set({ descuentoPorcentaje: Math.min(90, Math.max(0, porcentaje)) }),
      descuentoDesdeUnidades: 3,
      setDescuentoDesdeUnidades: (unidades) =>
        set({ descuentoDesdeUnidades: Math.min(99, Math.max(2, unidades)) }),
      pedidoContrasenaHabilitado: true,
      setPedidoContrasenaHabilitado: (pedidoContrasenaHabilitado) =>
        set({ pedidoContrasenaHabilitado }),
    }),
    {
      name: 'panda-settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        storeName: state.storeName,
        ventasPorCajas: state.ventasPorCajas,
        sonidoAlertas: state.sonidoAlertas,
      tarjetaHabilitada: state.tarjetaHabilitada,
      cuentaCorrienteHabilitada: state.cuentaCorrienteHabilitada,
      recargoTarjetaCredito: state.recargoTarjetaCredito,
      descuentoAutomatico: state.descuentoAutomatico,
      descuentoPorcentaje: state.descuentoPorcentaje,
      descuentoDesdeUnidades: state.descuentoDesdeUnidades,
      pedidoContrasenaHabilitado: state.pedidoContrasenaHabilitado,
    }),
    },
  ),
)
