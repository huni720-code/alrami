import type { InsightInput, InsightLevel, SavingsInsight } from '../types/savingsInsight'

function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

// ── 인사이트 생성 함수 (AI API 교체 지점) ────────────────────
//
// 이 함수의 내부를 AI API 호출로 교체할 수 있습니다.
// 반환 타입(SavingsInsight)은 유지해야 합니다.
//
// 교체 예시:
//   const res = await fetch('/api/ai/savings-insight', {
//     method: 'POST',
//     body: JSON.stringify(input),
//   })
//   return (await res.json()) as SavingsInsight
//
export function generateInsight(input: InsightInput): SavingsInsight {
  const { card_performance, card_performance_summary, saving, contracts, month } = input

  // ── 1순위: 약정 종료 임박 (30일 이내) ────────────────────
  const urgentContract = contracts.find((c) => c.urgent)
  if (urgentContract) {
    return {
      level: 'urgent',
      summary: `${urgentContract.label} 약정 종료가 ${urgentContract.days_left}일 남았습니다`,
      recommendation:
        urgentContract.type === 'telecom'
          ? '통신사 변경 또는 재약정 혜택을 지금 비교해보세요. 알뜰폰으로 전환 시 비용 절감 폭이 큽니다.'
          : '렌탈 재계약 여부를 결정하고, 동일 기기를 더 저렴하게 구매하거나 다른 업체와 비교해보세요.',
      expected_effect:
        saving.recommended_monthly > 0
          ? `현재 소비 패턴 기준 월 최대 ${fmt(saving.recommended_monthly)} 절약 가능`
          : '요금제 변경 시 실질 월 지출 절감 효과 기대',
      caution: '약정 기간 중 해지 시 위약금이 발생할 수 있으니 종료일 이후 변경을 권장합니다.',
    }
  }

  // ── 2순위: 카드 실적 미달성 ──────────────────────────────
  const unachievedCards = card_performance.filter(
    (c) => !c.achieved && c.target != null && c.target > 0,
  )
  const achievedAll =
    card_performance.length > 0 &&
    card_performance.filter((c) => c.target != null && c.target > 0).every((c) => c.achieved)

  if (unachievedCards.length > 0) {
    const closestCard = [...unachievedCards].sort((a, b) => a.remaining - b.remaining)[0]
    const overallPct =
      card_performance_summary.total_target > 0
        ? Math.round((card_performance_summary.total_spent / card_performance_summary.total_target) * 100)
        : 0
    const level: InsightLevel = overallPct < 50 ? 'warning' : 'info'

    return {
      level,
      summary:
        overallPct < 80
          ? `이번 달 카드 실적이 아직 ${overallPct}% 달성 상태입니다`
          : `카드 실적 달성까지 조금 남았습니다 (${overallPct}%)`,
      recommendation: `남은 생활비 결제를 ${closestCard.nickname ?? closestCard.card_name} 카드에 집중하면 혜택 달성 가능성이 높아집니다. ${fmt(closestCard.remaining)} 더 사용하면 됩니다.`,
      expected_effect:
        saving.recommended_monthly > 0
          ? `실적 달성 시 이번 달 예상 절약액 약 ${fmt(saving.recommended_monthly)} 적용`
          : '실적 달성 시 카드사 혜택(캐시백·포인트) 수령 가능',
      caution:
        closestCard.remaining < 30_000
          ? `${closestCard.nickname ?? closestCard.card_name} 실적까지 단 ${fmt(closestCard.remaining)} 남았습니다!`
          : null,
    }
  }

  // ── 3순위: 모든 카드 실적 달성 ───────────────────────────
  if (achievedAll) {
    return {
      level: 'success',
      summary: `${month.month}월 카드 실적을 모두 달성했습니다!`,
      recommendation:
        '추가 소비는 혜택 효율이 높은 카드로 분산하거나, 포인트 사용처를 확인해보세요.',
      expected_effect:
        saving.recommended_monthly > 0
          ? `이번 달 예상 절약액 약 ${fmt(saving.recommended_monthly)} / 연간 ${fmt(saving.recommended_annual)}`
          : '카드 실적 달성으로 캐시백·포인트 혜택 수령 예정',
      caution: null,
    }
  }

  // ── 4순위: 절약 추천액이 있을 때 (카드 미등록 등) ────────
  if (saving.recommended_monthly > 0) {
    return {
      level: 'info',
      summary: `현재 소비 패턴 기준 이번 달 예상 절약액은 약 ${fmt(saving.recommended_monthly)}입니다`,
      recommendation:
        '카드를 등록하고 실적을 관리하면 절약 효과를 더 정확하게 추적할 수 있어요.',
      expected_effect: `연간으로 환산하면 약 ${fmt(saving.recommended_annual)} 절약 가능`,
      caution: null,
    }
  }

  // ── 기본: 데이터 부족 시 ──────────────────────────────────
  return {
    level: 'info',
    summary: `${month.month}월 지출을 관리 중입니다`,
    recommendation:
      '카드를 등록하면 실적 달성 여부와 절약 가능액을 자동으로 분석해드립니다.',
    expected_effect: '카드 실적 달성 시 캐시백·포인트 혜택만큼 실질 지출 절감 효과',
    caution: null,
  }
}
