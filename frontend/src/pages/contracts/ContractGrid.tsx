import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Wifi, Tv, Droplets, Plus, ChevronRight } from 'lucide-react'
import { contractApi } from '../../lib/api'
import type { ContractResponse } from '../../lib/api'

const CATEGORY_META = [
  { key: '휴대폰', label: '휴대폰', Icon: Smartphone },
  { key: '인터넷', label: '인터넷', Icon: Wifi },
  { key: 'TV', label: 'TV', Icon: Tv },
  { key: '정수기', label: '정수기', Icon: Droplets },
] as const

function ddayLabel(dday: number) {
  if (dday < 0) return `만료 ${Math.abs(dday)}일 경과`
  if (dday === 0) return '오늘 만료'
  return `D-${dday}`
}

function ddayColor(dday: number) {
  if (dday < 0) return 'text-gray-400'
  if (dday <= 30) return 'text-red-500'
  if (dday <= 90) return 'text-amber-500'
  return 'text-[#10b981]'
}

export default function ContractGrid() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<ContractResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contractApi.list(false)
      .then((r) => setContracts(r.data))
      .finally(() => setLoading(false))
  }, [])

  const byCategory = (cat: string) => contracts.filter((c) => c.category === cat && c.is_active)

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-gray-100 border-t-[#10b981] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white px-6 pt-14 pb-16">
      <div className="max-w-sm mx-auto">

        {/* 헤더 */}
        <p className="text-[13px] font-bold text-[#10b981] mb-6 tracking-tight">만기톡</p>
        <div className="mb-8">
          <h1 className="text-[24px] font-extrabold text-gray-900 leading-tight">
            약정을 등록하면<br />
            <span className="text-[#10b981]">만기 전에 카톡</span>이 와요
          </h1>
          <p className="text-[14px] text-gray-400 mt-2">가진 약정만 골라서 추가해 보세요</p>
        </div>

        {/* 4개 카테고리 그리드 */}
        <div className="space-y-3 mb-8">
          {CATEGORY_META.map(({ key, label, Icon }) => {
            const list = byCategory(key)
            const hasContract = list.length > 0
            const first = list[0]

            return (
              <div key={key}>
                {hasContract ? (
                  /* 약정 있음 — 카드 형태 */
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E1F5EE] flex items-center justify-center">
                          <Icon size={18} className="text-[#10b981]" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-gray-900">{label}</p>
                          <p className="text-[12px] text-gray-500">{first.provider}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[14px] font-bold ${ddayColor(first.dday)}`}>
                          {ddayLabel(first.dday)}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {first.accuracy === 'confirmed' ? '확인됨' : '추정'}
                        </p>
                      </div>
                    </div>
                    {list.length > 1 && (
                      <p className="text-[11px] text-gray-400 mt-2 text-right">
                        외 {list.length - 1}개 더
                      </p>
                    )}
                  </div>
                ) : (
                  /* 약정 없음 — 추가 버튼 */
                  <button
                    type="button"
                    onClick={() => navigate('/contracts/onboarding')}
                    className="w-full rounded-2xl border-2 border-dashed border-gray-200 p-4 flex items-center gap-3 transition-colors active:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Icon size={18} className="text-gray-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[14px] font-semibold text-gray-500">{label}</p>
                      <p className="text-[12px] text-gray-400">약정 추가하기</p>
                    </div>
                    <Plus size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 bg-[#10b981] text-white py-[16px] rounded-2xl text-[16px] font-bold transition-all active:scale-[0.98]"
        >
          홈 화면 보기
          <ChevronRight size={18} />
        </button>
        <p className="text-center text-[12px] text-gray-400 mt-3">
          나중에 추가해도 언제든 등록할 수 있어요
        </p>
      </div>
    </div>
  )
}
