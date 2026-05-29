import type { KpiContract } from '../../types/kpi'

interface Props {
  contracts: KpiContract[]
  onSettingsClick: () => void
}

export default function ContractAlertSection({ contracts, onSettingsClick }: Props) {
  if (contracts.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {contracts.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={onSettingsClick}
          className={`w-full rounded-2xl p-4 shadow-sm flex items-center justify-between text-left active:scale-[0.98] transition-all ${
            c.urgent ? 'bg-orange-50' : 'bg-amber-50'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[18px]">{c.type === 'telecom' ? '📱' : '🔧'}</span>
              <span className={`text-[14px] font-bold ${c.urgent ? 'text-orange-700' : 'text-amber-700'}`}>
                {c.label}
              </span>
            </div>
            <p className={`text-[12px] ${c.urgent ? 'text-orange-500' : 'text-amber-600'}`}>
              {c.days_left <= 0
                ? '계약이 만료됐어요 — 지금 변경하세요'
                : `${c.end_date} 종료 · D-${c.days_left}`}
            </p>
          </div>
          <span
            className={`flex-shrink-0 ml-3 text-[13px] font-bold px-3 py-1.5 rounded-xl ${
              c.urgent
                ? 'bg-orange-100 text-orange-600'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {c.urgent ? '급함!' : '확인'}
          </span>
        </button>
      ))}
    </div>
  )
}
