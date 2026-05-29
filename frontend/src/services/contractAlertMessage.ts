import type { AlertSeverity, ContractAlertInput, ContractAlertMessage } from '../types/contractAlert'

function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

function getSeverity(daysLeft: number): AlertSeverity {
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 7) return 'urgent'
  if (daysLeft <= 30) return 'warning'
  return 'normal'
}

// ── 통신 약정 메시지 (AI API 교체 지점) ──────────────────────
//
// 이 함수 내부를 AI API 호출로 교체할 수 있습니다.
//   const res = await fetch('/api/ai/contract-alert', { method: 'POST', body: JSON.stringify(input) })
//   return (await res.json()) as ContractAlertMessage
//
function telecomMessage(input: ContractAlertInput, severity: AlertSeverity): ContractAlertMessage {
  const { carrier, monthly_fee, days_left, estimated_saving } = input
  const carrierLabel = carrier ?? '통신사'
  const feeNote = monthly_fee ? `현재 월 ${fmt(monthly_fee)} 납부 중` : null
  const savingNote = estimated_saving > 0 ? `이동 시 월 최대 ${fmt(estimated_saving)} 절약 가능` : null

  switch (severity) {
    case 'expired':
      return {
        severity,
        headline: `${carrierLabel} 약정이 이미 종료되었습니다`,
        action: '재약정 혜택과 타 통신사 이동 혜택을 지금 바로 비교해보세요.',
        detail: feeNote
          ? `${feeNote} — 요금제 변경으로 추가 절약 가능성이 있습니다`
          : '현재 조건이 유리한지 다시 확인이 필요합니다.',
      }

    case 'urgent':
      return {
        severity,
        headline: `약정 종료까지 ${days_left}일 남았습니다`,
        action:
          '지금 비교하지 않으면 기존 조건으로 자동 연장될 수 있습니다. 재약정 혜택과 이동 혜택을 비교하세요.',
        detail: savingNote ?? feeNote,
      }

    case 'warning':
      return {
        severity,
        headline: `${carrierLabel} 약정 종료가 가까워졌습니다 (D-${days_left})`,
        action: '재약정 혜택과 이동 혜택을 비교해볼 시점입니다.',
        detail: feeNote,
      }

    default: // normal
      return {
        severity,
        headline: `${carrierLabel} 약정 종료 예정`,
        action: '종료일이 다가오면 재약정 또는 요금제 변경을 검토하세요.',
        detail: feeNote,
      }
  }
}

// ── 렌탈 계약 메시지 (AI API 교체 지점) ─────────────────────
function rentalMessage(input: ContractAlertInput, severity: AlertSeverity): ContractAlertMessage {
  const { days_left } = input

  switch (severity) {
    case 'expired':
      return {
        severity,
        headline: '렌탈 계약이 이미 종료되었습니다',
        action: '유지, 반납, 재계약 중 선택하세요.',
        detail: '계약 종료 후에도 자동 연장되는 경우가 있으니 계약서를 확인하세요.',
      }

    case 'urgent':
      return {
        severity,
        headline: `렌탈 계약 종료까지 ${days_left}일 남았습니다`,
        action: '유지, 반납, 재계약 조건을 지금 비교하세요.',
        detail: '월 납부금이 높은 렌탈 상품은 교체 시 절약 가능성이 있습니다.',
      }

    case 'warning':
      return {
        severity,
        headline: '렌탈 계약 종료가 가까워졌습니다',
        action: '유지, 반납, 재계약 조건을 미리 비교해두세요.',
        detail: null,
      }

    default: // normal
      return {
        severity,
        headline: '렌탈 계약 종료 예정',
        action: '종료일이 다가오면 유지 또는 변경 여부를 검토하세요.',
        detail: null,
      }
  }
}

// ── 공개 API ─────────────────────────────────────────────────
export function generateContractMessage(input: ContractAlertInput): ContractAlertMessage {
  const severity = getSeverity(input.days_left)
  return input.type === 'telecom'
    ? telecomMessage(input, severity)
    : rentalMessage(input, severity)
}
