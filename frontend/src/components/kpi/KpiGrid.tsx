import type { KpiExpense, KpiSaving } from '../../types/kpi'

interface Props {
  expense: KpiExpense
  saving: KpiSaving
  onboardingDone: boolean
  onStartOnboarding: () => void
}

function fmt(n: number) { return n.toLocaleString() }

export default function KpiGrid({ expense, saving, onboardingDone, onStartOnboarding }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {/* 이번 달 총 지출 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-[11px] text-gray-400 mb-2">이번 달 지출</p>
        <p className="text-[22px] font-extrabold text-gray-900 leading-none mb-1">
          {fmt(expense.total)}
          <span className="text-[14px] font-semibold text-gray-500 ml-0.5">원</span>
        </p>
        <p className="text-[11px] text-gray-300">{expense.count}건 기록됨</p>
      </div>

      {/* 예상 월 절약액 */}
      {onboardingDone ? (
        <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-white/70 mb-2">예상 월 절약액</p>
          <p className="text-[22px] font-extrabold text-white leading-none mb-1">
            {fmt(saving.recommended_monthly)}
            <span className="text-[14px] font-semibold text-white/80 ml-0.5">원</span>
          </p>
          <p className="text-[11px] text-white/60">연 {fmt(saving.recommended_annual)}원</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartOnboarding}
          className="bg-gray-50 rounded-2xl p-4 shadow-sm text-left border-2 border-dashed border-gray-200 active:scale-[0.98] transition-all"
        >
          <p className="text-[11px] text-gray-400 mb-2">예상 절약액</p>
          <p className="text-[16px] font-extrabold text-[#10b981] leading-tight">
            분석하기 →
          </p>
          <p className="text-[11px] text-gray-300 mt-1">내 정보 입력 필요</p>
        </button>
      )}
    </div>
  )
}
