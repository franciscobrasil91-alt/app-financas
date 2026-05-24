// ── Enums ──────────────────────────────────────────────────
export type TipoConta = 'corrente' | 'poupanca' | 'digital'
export type TipoDespesa = 'fixa' | 'estimada' | 'sazonal' | 'pontual'
export type TipoReceita = 'recorrente' | 'pontual'
export type TipoAplicacao = 'poupanca' | 'cdb_rdb' | 'tesouro_direto' | 'fundos' | 'acoes'
export type TipoTributacao = 'isento' | 'regressivo'
export type TipoCategoria = 'despesa' | 'receita' | 'cartao'

// ── Entidades ──────────────────────────────────────────────
export interface Profile {
  id: string
  email: string
  nome: string | null
  created_at: string
}

export interface ContaBancaria {
  id: string
  user_id: string
  nome: string
  banco: string | null
  tipo: TipoConta
  ativa: boolean
  created_at: string
}

export interface CartaoCredito {
  id: string
  user_id: string
  nome: string
  banco: string | null
  dia_fechamento: number
  dia_vencimento: number
  limite: number
  ativa: boolean
  created_at: string
}

export interface Categoria {
  id: string
  user_id: string
  nome: string
  tipo: TipoCategoria
  cor: string
  created_at: string
}

export interface LancamentoCartao {
  id: string
  user_id: string
  cartao_id: string
  categoria_id: string | null
  descricao: string
  data_compra: string
  valor_total: number
  valor_parcela: number
  numero_parcelas: number
  parcela_atual: number
  mes_referencia: number
  grupo_id: string | null
  created_at: string
  cartao?: CartaoCredito
  categoria?: Categoria
}

export interface Despesa {
  id: string
  user_id: string
  descricao: string
  tipo: TipoDespesa
  categoria_id: string | null
  dia_vencimento: number | null
  conta_id: string | null
  cartao_id: string | null
  ativa: boolean
  created_at: string
  categoria?: Categoria
  conta?: ContaBancaria
  cartao?: CartaoCredito
  valores?: DespesaValor[]
}

export interface DespesaValor {
  id: string
  despesa_id: string
  user_id: string
  mes_referencia: number
  valor: number
}

export interface Receita {
  id: string
  user_id: string
  descricao: string
  tipo: TipoReceita
  conta_id: string | null
  categoria_id: string | null
  ativa: boolean
  created_at: string
  conta?: ContaBancaria
  categoria?: Categoria
  valores?: ReceitaValor[]
}

export interface ReceitaValor {
  id: string
  receita_id: string
  user_id: string
  mes_referencia: number
  valor: number
}

export interface Aplicacao {
  id: string
  user_id: string
  nome: string
  tipo: TipoAplicacao
  taxa_anual: number
  tributacao: TipoTributacao
  saldo_atual: number
  data_inicio: string | null
  ativa: boolean
  created_at: string
  valores?: AporteValor[]
}

export interface AporteValor {
  id: string
  aplicacao_id: string
  user_id: string
  mes_referencia: number
  valor: number
}

export interface SaldoBancario {
  id: string
  user_id: string
  mes_referencia: number
  saldo: number
  created_at: string
  updated_at: string
}

// ── Helpers de UI ──────────────────────────────────────────
export interface DashboardSummary {
  totalReceitas: number
  totalDespesas: number
  totalCartao: number
  totalReservas: number
  saldoPrevisto: number
  saldoBancario: number | null
}

export interface ProjecaoMes {
  mesLabel: string
  mes: number
  receitas: number
  saidas: number
  saldo: number
  deficit: boolean
}
