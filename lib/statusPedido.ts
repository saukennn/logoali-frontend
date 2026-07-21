// Status unificado do pedido para exibição.
// Combina o ciclo financeiro (status) com o operacional (entregue)
// numa única label visível ao usuário.

export interface PedidoStatusInfo {
  entregue?: boolean
  status: string // 'ATIVO' | 'CANCELADO'
}

export interface StatusVisual {
  label: string
  chip: string   // classes do badge
  dot: string    // classes da bolinha
}

export function statusPedido(p: PedidoStatusInfo): StatusVisual {
  if (p.status === 'CANCELADO') {
    return { label: 'Cancelado', chip: 'bg-danger-light text-danger-dark', dot: 'bg-danger' }
  }
  if (p.entregue) {
    return { label: 'Entregue', chip: 'bg-success-light text-success-dark', dot: 'bg-success' }
  }
  return { label: 'Pendente', chip: 'bg-warning-light text-warning-dark', dot: 'bg-warning' }
}
