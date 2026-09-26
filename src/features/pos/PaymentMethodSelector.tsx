import { ArrowRightLeft, Banknote, CreditCard, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { MetodoPagoPOS } from './posQuery'

type PaymentMethodSelectorProps = {
  valor: MetodoPagoPOS
  onChange: (metodo: MetodoPagoPOS) => void
}

const METODOS: { valor: MetodoPagoPOS; etiqueta: string; icon: LucideIcon }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo', icon: Banknote },
  { valor: 'transferencia', etiqueta: 'Transferencia', icon: ArrowRightLeft },
  { valor: 'tarjeta', etiqueta: 'Tarjeta', icon: CreditCard },
]

export function PaymentMethodSelector({ valor, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-[22px] py-2.5 dark:border-slate-800 dark:bg-secondary/30">
      <h3 className="mb-1.5 text-[12.5px] font-semibold tracking-[0.02em] text-slate-600 dark:text-slate-400">
        Método de pago
      </h3>

      <div className="grid grid-cols-3 gap-2 max-[600px]:gap-1.5">
        {METODOS.map(({ valor: opcion, etiqueta, icon: Icon }) => {
          const activo = valor === opcion
          return (
            <label key={opcion} className="group relative cursor-pointer">
              <input
                type="radio"
                name="metodo-pago"
                value={opcion}
                checked={activo}
                onChange={() => onChange(opcion)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2 text-center font-display text-[12px] font-semibold leading-tight transition-[color,background-color,border-color,transform] duration-150',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500',
                  // El hover vive en `group`, no en `peer`: el input es sr-only
                  // (1px, posicionado), así que `peer-hover:` no se dispararía
                  // al pasar el mouse sobre el botón visible.
                  !activo &&
                    'border-slate-200 bg-white text-slate-600 group-hover:-translate-y-px group-hover:border-slate-300 group-hover:bg-slate-100 group-hover:text-slate-900 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400 dark:group-hover:border-slate-600 dark:group-hover:bg-secondary/50 dark:group-hover:text-slate-100',
                  // El activo también reacciona, pero sin salirse de su paleta
                  // para que el usuario no pierda la referencia de qué chose.
                  activo &&
                    'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 group-hover:-translate-y-px group-hover:border-emerald-500/60 group-hover:bg-emerald-500/20 dark:text-emerald-400',
                )}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="max-[600px]:text-[11.5px] max-[600px]:px-1">{etiqueta}</span>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
