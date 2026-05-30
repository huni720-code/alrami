import { Smartphone, Wrench } from 'lucide-react'
import type { ContractAlertMessage } from '../../types/contractAlert'
import type { KpiContract } from '../../types/kpi'
import { generateContractMessage } from '../../services/contractAlertMessage'

const SEVERITY_STYLE = {
  expired: {
    wrap:   'bg-red-50 border border-red-100',
    icon:   'text-red-400',
    badge:  'bg-red-100 text-red-600',
    head:   'text-red-700',
    action: 'text-red-600',
    detail: 'text-red-400',
    label:  '만료됨',
  },
  urgent: {
    wrap:   'bg-orange-50 border border-orange-100',
    icon:   'text-orange-400',
    badge:  'bg-orange-100 text-orange-600',
    head:   'text-orange-700',
    action: 'text-orange-600',
    detail: 'text-orange-400',
    label:  '긴급',
  },
  warning: {
    wrap:   'bg-amber-50 border border-amber-100',
    icon:   'text-amber-500',
    badge:  'bg-amber-100 text-amber-700',
    head:   'text-amber-700',
    action: 'text-amber-600',
    detail: 'text-amber-500',
    label:  '주의',
  },
  normal: {
    wrap:   'bg-gray-50 border border-gray-100',
    icon:   'text-gray-400',
    badge:  'bg-gray-100 text-gray-500',
    head:   'text-gray-600',
    action: 'text-gray-500',
    detail: 'text-gray-400',
    label:  '예정',
  },
}

interface Props {
  contract: KpiContract
  estimatedSaving: number
  onSettingsClick: () => void
}

export default function ContractAlertMessageCard({ contract, estimatedSaving, onSettingsClick }: Props) {
  const msg: ContractAlertMessage = generateContractMessage({
    type: contract.type,
    label: contract.label,
    end_date: contract.end_date,
    days_left: contract.days_left,
    carrier: contract.carrier,
    monthly_fee: contract.monthly_fee,
    estimated_saving: estimatedSaving,
  })

  const s = SEVERITY_STYLE[msg.severity]
  const TypeIcon = contract.type === 'telecom' ? Smartphone : Wrench

  return (
    <div className={`rounded-2xl p-4 ${s.wrap}`}>
      {/* 헤더 행 */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon size={16} className={`shrink-0 ${s.icon}`} />
          <p className={`text-[14px] font-bold leading-snug ${s.head}`}>{msg.headline}</p>
        </div>
        <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
          {s.label}
        </span>
      </div>

      {/* 추천 행동 */}
      <p className={`text-[13px] leading-relaxed mb-1 ${s.action}`}>{msg.action}</p>

      {/* 세부 정보 */}
      {msg.detail && (
        <p className={`text-[12px] leading-relaxed ${s.detail}`}>{msg.detail}</p>
      )}

      {/* 설정 바로가기 */}
      <button
        type="button"
        onClick={onSettingsClick}
        className="mt-3 text-[12px] font-semibold text-gray-400 underline underline-offset-2 active:opacity-70"
      >
        내 정보 확인 →
      </button>
    </div>
  )
}
