import { useEffect, useState } from 'react'
import { Database, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { datosPruebaService } from '../../services/reportes.service'

/**
 * Botones de datos de prueba.
 *
 * El seeder marca todo lo que crea con el prefijo `[PRUEBA] ` y el borrado va
 * por ese prefijo, así que sembrar o limpiar nunca toca registros reales. Aun
 * así las dos acciones piden confirmación: son las únicas de la pantalla que
 * escriben en la base.
 */
export function BotonDatosPrueba({ alCambiar }: { alCambiar: () => void }) {
  const [hayDatos, setHayDatos] = useState<boolean | null>(null)
  const [confirmaGenerar, setConfirmaGenerar] = useState(false)
  const [confirmaBorrar, setConfirmaBorrar] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vigente = true

    datosPruebaService
      .hay()
      .then((existe) => {
        if (vigente) setHayDatos(existe)
      })
      .catch(() => {
        if (vigente) setHayDatos(false)
      })

    return () => {
      vigente = false
    }
  }, [])

  const generar = async () => {
    setOcupado(true)
    try {
      const resultado = await datosPruebaService.generar()
      toast.success('Datos de prueba generados', {
        description: `${resultado.ventas} ventas, ${resultado.cortes} cortes y ${resultado.mermas} mermas en los últimos 45 días.`,
      })
      setHayDatos(true)
      alCambiar()
    } catch (error) {
      toast.error('No se pudieron generar los datos de prueba', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setOcupado(false)
    }
  }

  const borrar = async () => {
    setOcupado(true)
    try {
      const resultado = await datosPruebaService.borrar()
      toast.success('Datos de prueba eliminados', {
        description: `${resultado.productos} productos y ${resultado.ventas} ventas borrados.`,
      })
      setHayDatos(false)
      alCambiar()
    } catch (error) {
      toast.error('No se pudieron eliminar los datos de prueba', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      {ocupado && (
        <Loader2 size={14} className="shrink-0 animate-spin text-slate-400 dark:text-slate-500" />
      )}

      {hayDatos && (
        <Button variant="ghost" size="sm" onClick={() => setConfirmaBorrar(true)} disabled={ocupado}>
          <Trash2 size={14} />
          Borrar datos de prueba
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmaGenerar(true)}
        disabled={ocupado}
        title="Genera ventas, mermas y cortes de caja de ejemplo para ver los reportes con datos"
      >
        <Database size={14} />
        Datos de prueba
      </Button>

      <ConfirmModal
        isOpen={confirmaGenerar}
        onClose={() => setConfirmaGenerar(false)}
        onConfirm={generar}
        title="Generar datos de prueba"
        description="Se van a crear 12 productos de ejemplo con ventas, mermas y cortes de caja de los últimos 45 días. Todo queda marcado con [PRUEBA] y se puede borrar después con el botón contiguo."
        confirmText="Generar"
        cancelText="Cancelar"
      />

      <ConfirmModal
        isOpen={confirmaBorrar}
        onClose={() => setConfirmaBorrar(false)}
        onConfirm={borrar}
        title="Borrar datos de prueba"
        description="Se eliminan todos los registros marcados con [PRUEBA]: productos, ventas, movimientos, cortes y mermas. Los datos reales del negocio no se tocan."
        confirmText="Borrar"
        cancelText="Cancelar"
      />
    </>
  )
}