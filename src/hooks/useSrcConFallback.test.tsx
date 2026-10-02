import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useSrcConFallback } from './useSrcConFallback'

const ASSET = 'panda-asset://asset/productos/111.png'
const PREVIEW = 'data:image/svg+xml;base64,PREVIEW'

function Probe({ src, fallback = PREVIEW }: { src: string; fallback?: string }) {
  const { src: actual, onError, cayo } = useSrcConFallback(src, fallback)
  return (
    <>
      <img data-testid="img" src={actual} alt="producto" onError={onError} />
      <span data-testid="cayo">{String(cayo)}</span>
    </>
  )
}

describe('useSrcConFallback', () => {
  it('muestra el asset real cuando la imagen carga', () => {
    render(<Probe src={ASSET} />)
    expect(screen.getByTestId('img').getAttribute('src')).toBe(ASSET)
    expect(screen.getByTestId('cayo').textContent).toBe('false')
  })

  it('cae al preview cuando el archivo del path no existe en la maquina', () => {
    render(<Probe src={ASSET} />)
    fireEvent.error(screen.getByTestId('img'))

    expect(screen.getByTestId('img').getAttribute('src')).toBe(PREVIEW)
    expect(screen.getByTestId('cayo').textContent).toBe('true')
  })

  it('no reintenta en loop si el preview tambien falla', () => {
    render(<Probe src={ASSET} />)
    const img = screen.getByTestId('img')
    fireEvent.error(img)
    expect(screen.getByTestId('cayo').textContent).toBe('true')

    // Segundo error: sin guarda, setEstado reasignaria el mismo src y el
    // navegador volveria a pedir la imagen en loop.
    fireEvent.error(screen.getByTestId('img'))
    expect(screen.getByTestId('img').getAttribute('src')).toBe(PREVIEW)
    expect(screen.getByTestId('cayo').textContent).toBe('true')
  })

  it('vuelve al asset real cuando cambia el src y rearma el fallback', () => {
    const { rerender } = render(<Probe src={ASSET} />)
    fireEvent.error(screen.getByTestId('img'))
    expect(screen.getByTestId('cayo').textContent).toBe('true')

    const otro = 'panda-asset://asset/productos/222.png'
    rerender(<Probe src={otro} />)

    // Sin el rearme, el producto nuevo naceria mostrando el preview del viejo.
    expect(screen.getByTestId('img').getAttribute('src')).toBe(otro)
    expect(screen.getByTestId('cayo').textContent).toBe('false')
  })

  it('no dispara onError en loop cuando el src ya es el preview', () => {
    render(<Probe src={PREVIEW} />)
    fireEvent.error(screen.getByTestId('img'))

    // No hay asset que caiga: queda el preview y `cayo` en false, porque no
    // hubo un src real que fallara.
    expect(screen.getByTestId('img').getAttribute('src')).toBe(PREVIEW)
    expect(screen.getByTestId('cayo').textContent).toBe('false')
  })
})