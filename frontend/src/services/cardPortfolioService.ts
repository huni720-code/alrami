import type { KpiCardPerf } from '../types/kpi'
import type { CardPortfolioStrategy, CardPriority, CardStrategy } from '../types/cardPortfolio'

function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

// 일반적인 소비 카테고리 우선순위 그룹 (카드사별 혜택이 아닌 범용 제안)
// 카드사별 카테고리 혜택 데이터가 추가되면 이 배열을 카드별로 교체할 수 있습니다
const CATEGORY_GROUPS: string[][] = [
  ['생활비', '식비', '카페', '편의점'],
  ['쇼핑', '교통', '주유'],
  ['문화/여가', '구독', '의료'],
]

// ── 카드 포트폴리오 전략 생성 (AI API 교체 지점) ──────────────
//
// 이 함수의 내부를 AI API 호출로 교체할 수 있습니다.
// 반환 타입(CardPortfolioStrategy)은 유지해야 합니다.
//
// 교체 예시:
//   const res = await fetch('/api/ai/card-strategy', {
//     method: 'POST',
//     body: JSON.stringify({ cards }),
//   })
//   return (await res.json()) as CardPortfolioStrategy
//
export function buildPortfolioStrategy(cards: KpiCardPerf[]): CardPortfolioStrategy {
  if (cards.length === 0) {
    return { strategies: [], summary: '' }
  }

  const withTarget = cards.filter((c) => c.target != null && c.target > 0)
  const noTarget = cards.filter((c) => c.target == null || c.target === 0)

  // 미달성 카드 — 잔여액 오름차순 (달성에 가장 가까운 카드가 앞)
  const unachieved = withTarget
    .filter((c) => !c.achieved)
    .sort((a, b) => a.remaining - b.remaining)
  const achieved = withTarget.filter((c) => c.achieved)

  const orderedCards = [...unachieved, ...achieved, ...noTarget]

  const strategies: CardStrategy[] = orderedCards.map((card) => {
    let priority: CardPriority
    let reason: string
    let expected_effect: string
    let recommended_categories: string[]

    if (card.achieved) {
      priority = 'achieved'
      reason = `이번 달 실적을 이미 달성했습니다 (${card.pct}%).`
      expected_effect = '카드사 혜택(캐시백·포인트) 수령 예정입니다.'
      recommended_categories = CATEGORY_GROUPS[2] ?? ['기타']

    } else if (card.target == null || card.target === 0) {
      priority = 'no_target'
      reason = '실적 목표가 설정되지 않았습니다. 목표를 설정하면 전략을 안내드립니다.'
      expected_effect = '카드 등록 시 혜택 카테고리를 확인하세요.'
      recommended_categories = ['포인트 적립', '기타 소비']

    } else if (card.remaining < 50_000) {
      priority = 'urgent'
      reason = `실적까지 ${fmt(card.remaining)} 남았습니다. 지금 집중하면 이번 달 혜택 달성이 가능합니다.`
      expected_effect = `실적 달성 시 카드 혜택 적용 (현재 ${card.pct}% 달성)`
      recommended_categories = CATEGORY_GROUPS[0] ?? ['생활비']

    } else {
      // 미달성 중 몇 번째 카드인지로 카테고리 그룹 배정
      const rank = unachieved.indexOf(card)
      recommended_categories =
        CATEGORY_GROUPS[Math.min(rank, CATEGORY_GROUPS.length - 1)] ?? CATEGORY_GROUPS[0]

      priority = 'focus'
      reason = `${fmt(card.remaining)} 더 사용하면 이번 달 실적을 달성합니다.`
      expected_effect = `실적 달성 시 카드 혜택 적용 (현재 ${card.pct}% 달성)`
    }

    return {
      card_id: card.id,
      card_name: card.card_name,
      nickname: card.nickname,
      recommended_categories,
      reason,
      expected_effect,
      priority,
      spent: card.spent,
      target: card.target,
      remaining: card.remaining,
      achieved: card.achieved,
      pct: card.pct,
    }
  })

  // ── 전체 요약 문구 ────────────────────────────────────────
  const urgentCard = strategies.find((s) => s.priority === 'urgent')
  const focusCard = strategies.find((s) => s.priority === 'focus')
  const allAchieved =
    strategies.length > 0 &&
    strategies.filter((s) => s.priority !== 'no_target').every((s) => s.achieved)

  let summary: string
  if (allAchieved) {
    summary = '이번 달 등록된 카드 실적을 모두 달성했습니다!'
  } else if (urgentCard) {
    const label = urgentCard.nickname ?? urgentCard.card_name
    summary = `${label} 실적까지 ${fmt(urgentCard.remaining)} 남았습니다. 남은 생활비를 집중하세요.`
  } else if (focusCard) {
    const label = focusCard.nickname ?? focusCard.card_name
    summary = `${label} 카드로 남은 소비를 집중하면 이번 달 실적 달성이 가능합니다.`
  } else {
    summary = '카드 실적 목표를 설정하면 최적 사용 전략을 안내드립니다.'
  }

  return { strategies, summary }
}
