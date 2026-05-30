import type { SavingsInsight } from '../../types/savingsInsight'

const LEVEL_STYLE = {
  urgent:  { bar: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-100',  dot: 'bg-orange-400', label: '긴급' },
  warning: { bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-100',  dot: 'bg-yellow-400', label: '주의' },
  success: { bar: 'bg-[#10b981]',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-[#10b981]', label: '달성' },
  info:    { bar: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-600 border-blue-100',        dot: 'bg-blue-400',   label: '정보' },
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-[11px] font-semibold text-gray-400 w-[52px] pt-0.5">{label}</span>
      <span className="text-[13px] text-gray-700 leading-relaxed">{value}</span>
    </div>
  )
}

interface Props {
  insight: SavingsInsight
}

export default function SavingsInsightCard({ insight }: Props) {
  const { level, summary, recommendation, expected_effect, caution } = insight
  const style = LEVEL_STYLE[level]

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
      {/* 레벨 컬러 바 */}
      <div className={`h-1 ${style.bar}`} />

      <div className="p-5">
        {/* 헤더: 배지 + 요약 */}
        <div className="flex items-start gap-2.5 mb-4">
          <span className={`shrink-0 mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
            {style.label}
          </span>
          <p className="text-[15px] font-bold text-gray-900 leading-snug">{summary}</p>
        </div>

        {/* 상세 항목 */}
        <div className="space-y-2.5">
          <Row label="추천 행동" value={recommendation} />
          <Row label="예상 효과" value={expected_effect} />
          {caution && (
            <div className="flex gap-2 mt-1 bg-orange-50 rounded-xl px-3 py-2.5">
              <span className="shrink-0 text-[11px] font-semibold text-orange-500 w-[52px] pt-0.5">주의사항</span>
              <span className="text-[12px] text-orange-600 leading-relaxed">{caution}</span>
            </div>
          )}
        </div>

        {/* AI 라벨 */}
        <p className="text-[10px] text-gray-300 mt-4 text-right">절약 인사이트 · 규칙 기반</p>
      </div>
    </div>
  )
}
