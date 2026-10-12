export function solicitarActualizacionNotificaciones(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('actualizar-notificaciones'))
}
