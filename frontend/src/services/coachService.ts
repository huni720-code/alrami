import type { DashboardKpi } from '../lib/api'
import type { CoachContext } from '../types/coach'

function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

// ── 인텐트 감지 ───────────────────────────────────────────────
type Intent =
  | 'card_performance'
  | 'card_strategy'
  | 'savings'
  | 'telecom'
  | 'rental'
  | 'contract'
  | 'plan'
  | 'summary'
  | 'general'

function detectIntent(text: string): Intent {
  const t = text
  if (/실적.*부족|부족.*실적|실적.*얼마|얼마.*부족|카드.*실적|실적/.test(t)) return 'card_performance'
  if (/어떤.*카드|카드.*먼저|먼저.*써|써야/.test(t)) return 'card_strategy'
  if (/절약|줄었|왜.*줄|얼마.*아낄|아낄/.test(t)) return 'savings'
  if (/통신사|통신비|요금제|바꾸|이득.*통신|통신.*이득/.test(t)) return 'telecom'
  if (/렌탈|유지.*좋|반납|재계약/.test(t)) return 'rental'
  if (/약정|종료/.test(t)) return 'contract'
  if (/계획|다음 달|예산|소비 계획|짜줘/.test(t)) return 'plan'
  if (/요약|정리|현황|알려줘/.test(t)) return 'summary'
  return 'general'
}

// ── 인텐트별 응답 생성 ────────────────────────────────────────

function answerCardPerformance(kpi: DashboardKpi): string {
  const { card_performance } = kpi
  if (card_performance.length === 0) {
    return '등록된 카드가 없습니다.\n카드를 등록하면 실적을 자동으로 추적할 수 있어요.'
  }
  const unachieved = card_performance.filter((c) => !c.achieved && c.target && c.target > 0)
  if (unachieved.length === 0) {
    return '이번 달 등록된 모든 카드의 실적을 달성했습니다!\n추가 소비는 포인트 효율이 높은 카드로 분산하는 것이 좋습니다.'
  }
  const lines = [...unachieved]
    .sort((a, b) => a.remaining - b.remaining)
    .map((c) => `• ${c.nickname ?? c.card_name}: ${fmt(c.remaining)} 부족 (${c.pct}% 달성)`)
  return `이번 달 실적이 부족한 카드:\n\n${lines.join('\n')}\n\n달성에 가장 가까운 카드부터 집중하세요.`
}

function answerCardStrategy(kpi: DashboardKpi): string {
  const { card_performance } = kpi
  if (card_performance.length === 0) {
    return '등록된 카드가 없습니다. 카드를 먼저 등록해야 전략을 안내드릴 수 있어요.'
  }
  const unachieved = card_performance
    .filter((c) => !c.achieved && c.target && c.target > 0)
    .sort((a, b) => a.remaining - b.remaining)

  if (unachieved.length === 0) {
    return '모든 카드 실적을 달성했습니다!\n이제 포인트 적립 효율이 높은 카드를 선택해 사용하면 됩니다.'
  }

  const top = unachieved[0]
  const topLabel = top.nickname ?? top.card_name

  if (unachieved.length === 1) {
    return `지금은 ${topLabel} 카드에 집중하세요.\n남은 실적: ${fmt(top.remaining)} (${top.pct}% 달성)\n\n생활비, 식비, 교통 등 일상 지출을 이 카드로 집중하면 이번 달 혜택 달성이 가능합니다.`
  }

  const rest = unachieved
    .slice(1)
    .map((c, i) => `${i + 2}순위: ${c.nickname ?? c.card_name} (${fmt(c.remaining)} 부족)`)
    .join('\n')

  return `카드 사용 우선순위:\n\n1순위: ${topLabel} (${fmt(top.remaining)} 부족)\n→ 생활비·식비를 이 카드로 집중\n\n${rest}`
}

function answerSavings(kpi: DashboardKpi): string {
  const { saving, card_performance } = kpi
  const parts: string[] = []

  if (saving.recommended_monthly > 0) {
    parts.push(
      `이번 달 예상 절약액은 약 ${fmt(saving.recommended_monthly)}입니다.\n(연간 ${fmt(saving.recommended_annual)} 절약 가능)`,
    )
  }

  const unachieved = card_performance
    .filter((c) => !c.achieved && c.target && c.target > 0)
    .sort((a, b) => a.remaining - b.remaining)

  if (unachieved.length > 0) {
    const top = unachieved[0]
    const label = top.nickname ?? top.card_name
    parts.push(
      `${label} 실적이 ${fmt(top.remaining)} 부족합니다.\n실적 달성 시 카드 혜택이 추가로 적용됩니다.`,
    )
  }

  if (parts.length === 0) {
    return '절약액을 분석하려면 내 정보(통신비, 카드 사용액)를 먼저 입력해주세요.'
  }

  return parts.join('\n\n')
}

function answerTelecom(kpi: DashboardKpi): string {
  const telecom = kpi.contracts.find((c) => c.type === 'telecom')

  if (!telecom) {
    return '통신 약정 정보가 등록되어 있지 않습니다.\n내 정보에서 약정 종료일을 입력하면 변경 시점을 알려드려요.'
  }

  const { days_left, carrier, monthly_fee } = telecom
  const carrierLabel = carrier ?? '통신사'
  const feeNote = monthly_fee ? `\n\n현재 월 ${fmt(monthly_fee)} 납부 중입니다.` : ''

  if (days_left <= 0) {
    return `${carrierLabel} 약정이 이미 종료되었습니다.\n\n지금이 요금제 변경 최적 시점입니다. 알뜰폰 이동 시 동일 데이터 기준으로 비용을 낮출 수 있는 경우가 많습니다.${feeNote}`
  }

  if (days_left <= 7) {
    return `약정 종료까지 ${days_left}일밖에 남지 않았습니다!\n\n지금 비교하지 않으면 기존 조건으로 자동 연장될 수 있습니다. 재약정 혜택과 번호이동 혜택을 즉시 비교하세요.${feeNote}`
  }

  if (days_left <= 30) {
    return `약정 종료가 ${days_left}일 남았습니다.\n\n재약정 혜택과 번호이동 혜택을 비교해볼 시점입니다. ${carrierLabel} 외 다른 통신사 혜택도 확인하세요.${feeNote}`
  }

  return `${carrierLabel} 약정 종료까지 ${days_left}일 남았습니다. 아직 여유가 있지만 30일 이내가 되면 비교를 시작하는 것이 좋습니다.${feeNote}`
}

function answerRental(kpi: DashboardKpi): string {
  const rental = kpi.contracts.find((c) => c.type === 'rental')

  if (!rental) {
    return '렌탈 계약 정보가 등록되어 있지 않습니다.\n내 정보에서 렌탈 종료일을 입력하면 교체 시점을 알려드려요.'
  }

  const { days_left } = rental

  if (days_left <= 0) {
    return '렌탈 계약이 이미 종료되었습니다.\n\n유지, 반납, 재계약 중 선택이 필요합니다.\n동일 제품을 구매하는 것이 장기적으로 더 저렴할 수 있습니다.'
  }

  if (days_left <= 30) {
    return `렌탈 계약 종료까지 ${days_left}일 남았습니다.\n\n지금은 유지, 반납, 재계약 조건을 비교할 시점입니다.\n월 납부금이 높다면 교체 또는 구매도 검토해보세요.`
  }

  return `렌탈 계약 종료까지 ${days_left}일 남았습니다.\n30일 이내가 되면 상세 비교를 안내드립니다.`
}

function answerContract(kpi: DashboardKpi): string {
  const { contracts } = kpi

  if (contracts.length === 0) {
    return '등록된 약정/렌탈 정보가 없습니다.\n내 정보에서 약정 종료일을 입력하면 종료 임박 알림을 드려요.'
  }

  const lines = contracts.map((c) => {
    const daysText = c.days_left <= 0 ? '이미 종료됨' : `D-${c.days_left}`
    return `• ${c.label}: ${c.end_date} (${daysText})`
  })

  return `약정/렌탈 현황:\n\n${lines.join('\n')}\n\n종료가 가까운 항목은 미리 재약정 혜택을 비교해두세요.`
}

function answerPlan(kpi: DashboardKpi): string {
  const { expense, card_performance, saving } = kpi
  const parts: string[] = []

  parts.push(`이번 달 지출 현황: ${fmt(expense.total)} (${expense.count}건)`)

  if (saving.recommended_monthly > 0) {
    parts.push(`예상 절약 가능액: 월 ${fmt(saving.recommended_monthly)}`)
  }

  const unachieved = card_performance.filter((c) => !c.achieved && c.target && c.target > 0)
  if (unachieved.length > 0) {
    parts.push(`미달성 카드 ${unachieved.length}개 — 남은 기간 집중 결제 권장`)
  }

  parts.push('다음 달을 위한 체크리스트:\n□ 주요 카드 실적 목표 확인\n□ 정기 지출(통신비·렌탈) 점검\n□ 불필요한 구독 서비스 정리')

  return parts.join('\n\n')
}

function answerSummary(kpi: DashboardKpi): string {
  const { month, expense, card_performance, saving, contracts } = kpi
  const achievedCount = card_performance.filter((c) => c.achieved).length
  const totalWithTarget = card_performance.filter((c) => c.target && c.target > 0).length

  const lines: string[] = [
    `${month.year}년 ${month.month}월 현황`,
    `이번 달 지출: ${fmt(expense.total)} (${expense.count}건)`,
  ]

  if (totalWithTarget > 0) {
    lines.push(`카드 실적: ${achievedCount}/${totalWithTarget}개 달성`)
  }

  if (saving.recommended_monthly > 0) {
    lines.push(`예상 절약액: 월 ${fmt(saving.recommended_monthly)}`)
  }

  const urgentContracts = contracts.filter((c) => c.days_left >= 0 && c.days_left <= 30)
  if (urgentContracts.length > 0) {
    lines.push(`약정/렌탈 종료 임박: ${urgentContracts.length}건`)
  }

  return lines.join('\n')
}

function answerGeneral(): string {
  return '만기톡 절약 코치입니다.\n아래 주제에 대해 질문해보세요:\n\n• 카드 실적 및 부족 금액\n• 어떤 카드를 먼저 써야 할지\n• 절약액 및 소비 현황\n• 통신사 변경 여부\n• 렌탈 유지 또는 해지\n• 이번 달 소비 계획'
}

// ── 공개 API ─────────────────────────────────────────────────
//
// AI API 교체 지점:
// 이 함수의 내부를 API 호출로 교체할 수 있습니다.
//
// 예시 (Claude API):
//   const systemPrompt = buildSystemPrompt(ctx.kpi)
//   const res = await anthropic.messages.create({
//     model: 'claude-sonnet-4-6',
//     system: systemPrompt,
//     messages: [{ role: 'user', content: question }],
//   })
//   return res.content[0].text
//
export function answerQuestion(question: string, ctx: CoachContext): string {
  const intent = detectIntent(question)
  const { kpi } = ctx

  switch (intent) {
    case 'card_performance': return answerCardPerformance(kpi)
    case 'card_strategy':    return answerCardStrategy(kpi)
    case 'savings':          return answerSavings(kpi)
    case 'telecom':          return answerTelecom(kpi)
    case 'rental':           return answerRental(kpi)
    case 'contract':         return answerContract(kpi)
    case 'plan':             return answerPlan(kpi)
    case 'summary':          return answerSummary(kpi)
    default:                 return answerGeneral()
  }
}
