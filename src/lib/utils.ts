import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, addMonths, parseISO, getDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Formatação ─────────────────────────────────────────────
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

// YYYYMM → "Janeiro 2025"
export function mesReferenciaLabel(mesRef: number): string {
  const year = Math.floor(mesRef / 100)
  const month = (mesRef % 100) - 1
  const d = new Date(year, month, 1)
  return format(d, 'MMMM yyyy', { locale: ptBR })
}

// YYYYMM → "Jan/25"
export function mesReferenciaLabelCurto(mesRef: number): string {
  const year = Math.floor(mesRef / 100)
  const month = (mesRef % 100) - 1
  const d = new Date(year, month, 1)
  return format(d, 'MMM/yy', { locale: ptBR })
}

// Date → YYYYMM
export function dateToMesRef(date: Date): number {
  return date.getFullYear() * 100 + (date.getMonth() + 1)
}

// YYYYMM → Date (primeiro dia do mês)
export function mesRefToDate(mesRef: number): Date {
  const year = Math.floor(mesRef / 100)
  const month = (mesRef % 100) - 1
  return new Date(year, month, 1)
}

// Mês padrão: a partir do dia 15, já exibe o mês seguinte
export function mesRefPadrao(): number {
  const hoje = new Date()
  const mesAtual = dateToMesRef(hoje)
  return hoje.getDate() >= 15 ? addMonthsToRef(mesAtual, 1) : mesAtual
}

// Navegar meses
export function addMonthsToRef(mesRef: number, months: number): number {
  const d = mesRefToDate(mesRef)
  const result = addMonths(d, months)
  return dateToMesRef(result)
}

// Gera array de YYYYMM a partir de um mês (inclusive), por n meses
export function gerarGradeMeses(mesInicio: number, qtd = 24): number[] {
  return Array.from({ length: qtd }, (_, i) => addMonthsToRef(mesInicio, i))
}

// ── Lógica de cartão de crédito ────────────────────────────
/**
 * Dado a data da compra e o dia de fechamento do cartão,
 * retorna o YYYYMM ao qual a parcela pertence.
 * Regra: se dia_compra > dia_fechamento, a compra entra no mês seguinte.
 */
export function calcMesReferenciaCartao(
  dataCompra: Date,
  diaFechamento: number,
  numeroParcela: number = 1
): number {
  const diaCompra = getDate(dataCompra)
  let mesBase = new Date(dataCompra.getFullYear(), dataCompra.getMonth(), 1)

  if (diaCompra > diaFechamento) {
    mesBase = addMonths(mesBase, 1)
  }

  // Adiciona parcelas adicionais
  if (numeroParcela > 1) {
    mesBase = addMonths(mesBase, numeroParcela - 1)
  }

  return dateToMesRef(mesBase)
}

// ── Lógica de investimentos ────────────────────────────────
const TABELA_IR = [
  { diasMax: 180, aliquota: 0.225 },
  { diasMax: 360, aliquota: 0.20 },
  { diasMax: 720, aliquota: 0.175 },
  { diasMax: Infinity, aliquota: 0.15 },
]

const TABELA_IOF = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
]

export function calcAliquotaIR(dias: number): number {
  const faixa = TABELA_IR.find((f) => dias <= f.diasMax)
  return faixa?.aliquota ?? 0.15
}

export function calcAliquotaIOF(dias: number): number {
  if (dias <= 0) return 0.96
  if (dias >= 30) return 0
  return TABELA_IOF[dias - 1] / 100
}

export interface ProjecaoAplicacao {
  mes: number
  mesLabel: string
  saldo: number
  rendimentoBruto: number
  ir: number
  iof: number
  rendimentoLiquido: number
  aporte: number
}

/**
 * Projeta o saldo de uma aplicação por n meses.
 * Usa taxa mensal equivalente à anual informada.
 * IR pelo prazo total (simplificado).
 */
export function projetarAplicacao(
  saldoInicial: number,
  taxaAnual: number,
  tributacao: 'isento' | 'regressivo',
  aportesMensais: Record<number, number>, // mesRef → valor
  dataInicio: Date,
  mesInicioProjecao: number,
  qtdMeses: number = 24
): ProjecaoAplicacao[] {
  const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1
  let saldo = saldoInicial
  const resultado: ProjecaoAplicacao[] = []

  for (let i = 0; i < qtdMeses; i++) {
    const mesRef = addMonthsToRef(mesInicioProjecao, i)
    const aporte = aportesMensais[mesRef] ?? 0
    const rendimentoBruto = saldo * taxaMensal
    const diasTotais = Math.floor(
      (mesRefToDate(mesRef).getTime() - dataInicio.getTime()) / 86400000
    )

    let ir = 0
    let iof = 0

    if (tributacao === 'regressivo') {
      ir = rendimentoBruto * calcAliquotaIR(diasTotais)
      if (diasTotais < 30) {
        iof = rendimentoBruto * calcAliquotaIOF(diasTotais)
      }
    }

    const rendimentoLiquido = rendimentoBruto - ir - iof
    saldo = saldo + rendimentoLiquido + aporte

    resultado.push({
      mes: mesRef,
      mesLabel: mesReferenciaLabelCurto(mesRef),
      saldo,
      rendimentoBruto,
      ir,
      iof,
      rendimentoLiquido,
      aporte,
    })
  }

  return resultado
}
