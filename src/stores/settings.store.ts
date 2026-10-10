import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  PROTECCIONES_INICIALES,
  type ProteccionesSeguridad,
} from '../types/security'

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
  /** Muestra transferencia entre los métodos de pago del ticket. */
  transferenciaHabilitada: boolean
  /** Muestra el pago con QR entre los métodos de pago del ticket. */
  qrHabilitado: boolean
  setQrHabilitado: (active: boolean) => void
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
  /** Áreas y acciones que requieren contraseña cuando existe una. */
  proteccionesSeguridad: ProteccionesSeguridad
  setProteccionesSeguridad: (protecciones: ProteccionesSeguridad) => void
  /** Muestra la calculadora de vuelto en el ticket cuando se cobra en efectivo. */
  calculadoraVueltoHabilitada: boolean
  setCalculadoraVueltoHabilitada: (active: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storeName: 'PANDA STOCK',
      setStoreName: (storeName) => set({ storeName }),
      ventasPorCajas: true,
      setVentasPorCajas: (ventasPorCajas) => set({ ventasPorCajas }),
      sonidoAlertas: true,
      setSonidoAlertas: (sonidoAlertas) => set({ sonidoAlertas }),
      tarjetaHabilitada: true,
      setTarjetaHabilitada: (tarjetaHabilitada) => set({ tarjetaHabilitada }),
      transferenciaHabilitada: true,
      qrHabilitado: true,
      setQrHabilitado: (qrHabilitado) => set({ qrHabilitado }),
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
      proteccionesSeguridad: PROTECCIONES_INICIALES,
      setProteccionesSeguridad: (proteccionesSeguridad) => set({ proteccionesSeguridad }),
      calculadoraVueltoHabilitada: true,
      setCalculadoraVueltoHabilitada: (calculadoraVueltoHabilitada) =>
        set({ calculadoraVueltoHabilitada }),
    }),
    {
      name: 'panda-settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        storeName: state.storeName,
        ventasPorCajas: state.ventasPorCajas,
        sonidoAlertas: state.sonidoAlertas,
        tarjetaHabilitada: state.tarjetaHabilitada,
        qrHabilitado: state.qrHabilitado,
        cuentaCorrienteHabilitada: state.cuentaCorrienteHabilitada,
        recargoTarjetaCredito: state.recargoTarjetaCredito,
        descuentoAutomatico: state.descuentoAutomatico,
        descuentoPorcentaje: state.descuentoPorcentaje,
        descuentoDesdeUnidades: state.descuentoDesdeUnidades,
        proteccionesSeguridad: state.proteccionesSeguridad,
        calculadoraVueltoHabilitada: state.calculadoraVueltoHabilitada,
      }),
      merge: (persistido, estadoActual) => {
        const ajustes = persistido as Partial<SettingsState> & {
          pedidoContrasenaHabilitado?: boolean
        }
        const legado = ajustes.pedidoContrasenaHabilitado === true
        const existeConfiguracionAnterior = typeof ajustes.pedidoContrasenaHabilitado === 'boolean'
        const proteccionesGuardadas = ajustes.proteccionesSeguridad
        return {
          ...estadoActual,
          ...ajustes,
          transferenciaHabilitada: true,
          proteccionesSeguridad: {
            ...PROTECCIONES_INICIALES,
            reportes: proteccionesGuardadas?.reportes ?? legado,
            cuentasCorrientes: proteccionesGuardadas?.cuentasCorrientes ?? legado,
            anularVentas: proteccionesGuardadas?.anularVentas ?? existeConfiguracionAnterior,
            eliminarProductos: proteccionesGuardadas?.eliminarProductos ?? false,
            eliminarLotes: proteccionesGuardadas?.eliminarLotes ?? false,
            eliminarCategorias: proteccionesGuardadas?.eliminarCategorias ?? false,
            eliminarMarcas: proteccionesGuardadas?.eliminarMarcas ?? false,
          },
          qrHabilitado:
            ajustes.qrHabilitado ??
            ajustes.transferenciaHabilitada ??
            estadoActual.qrHabilitado,
        }
      },
    },
  ),
)
