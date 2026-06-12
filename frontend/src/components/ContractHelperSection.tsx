import { useState } from 'react'
import type { ProviderInfo } from '../lib/api'

// 약정일 확인 도우미 — "언제인지 몰라요" 경로에서 공용으로 쓰는 섹션.
// 회사 선택 → 고객센터 전화/앱 경로 안내 → 확인한 종료일 입력 → 확정 저장.

function Chip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`px-4 py-2.5 rounded-full border text-[14px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
        selected ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]' : 'border-gray-200 text-gray-600 bg-white'
      }`}
    >
      {label}
    </button>
  )
}

export default function ContractHelperSection({
  category,
  allProviders,
  onSaveConfirmed,
  busy,
}: {
  category: string
  allProviders: ProviderInfo[]
  // 저장 결과를 반환: 성공 true / 실패 false
  onSaveConfirmed: (provider: string, endDate: string) => Promise<boolean>
  busy: boolean
}) {
  const [hp, setHp] = useState('')
  const [hDate, setHDate] = useState('')
  const [saveErr, setSaveErr] = useState(false)

  const relevant = allProviders.filter((p) =>
    p.category_hint?.split('/').some((h) => h.trim() === category)
  )
  const info = relevant.find((p) => p.provider === hp) ?? null
  const phoneNum = info?.short_number || info?.center_number || null

  const canSave = hp && hDate && !busy

  const handleSave = async () => {
    if (!canSave) return
    setSaveErr(false)
    const ok = await onSaveConfirmed(hp, hDate)
    if (!ok) setSaveErr(true)
  }

  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-5 mt-2">
      <p className="text-[13px] font-bold text-gray-700">약정일 확인하는 법</p>

      {/* 회사 선택 */}
      {relevant.length > 0 ? (
        <div>
          <p className="text-[11px] text-gray-400 mb-2">회사를 고르면 연락처가 나와요</p>
          <div className="flex flex-wrap gap-2">
            {relevant.map((p) => (
              <Chip key={p.provider} label={p.provider} selected={hp === p.provider} onSelect={() => setHp(p.provider)} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-gray-400">통신사·렌탈사 고객센터에 약정 종료일을 문의한 뒤 아래에 입력하세요.</p>
      )}

      {/* 연락처 카드 */}
      {hp && (
        <div className="space-y-3">
          {phoneNum ? (
            <>
              <a
                href={`tel:${phoneNum}`}
                className="flex items-center justify-center gap-2 w-full bg-[#10b981] text-white py-3.5 rounded-xl text-[15px] font-bold min-h-[52px]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16v.92z" />
                </svg>
                {phoneNum} 전화하기
              </a>
              {info?.app_name && info.check_path && (
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  또는 <span className="font-semibold text-gray-700">{info.app_name}</span> 앱 &gt; {info.check_path}
                </p>
              )}
            </>
          ) : (
            <a
              href={`https://search.naver.com/search.naver?query=${encodeURIComponent(hp + ' 고객센터')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full border-2 border-gray-200 text-gray-600 py-3.5 rounded-xl text-[14px] font-semibold min-h-[52px]"
            >
              {hp} 고객센터 검색 →
            </a>
          )}
          <p className="text-[11px] text-gray-400">자동 조회는 안 돼요. 확인 후 아래에 입력하세요.</p>
        </div>
      )}

      {/* 확인한 날짜 입력 — 정확한 종료일(일 단위) */}
      <div>
        <p className="text-[12px] text-gray-500 font-semibold mb-2">확인한 약정 종료일</p>
        <input
          type="date"
          value={hDate}
          min="2024-01-01"
          max="2035-12-31"
          onChange={(e) => setHDate(e.target.value)}
          className="w-full border-2 border-gray-200 focus:border-[#10b981] rounded-2xl px-4 py-3.5 text-[16px] font-semibold outline-none transition-colors"
        />
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={handleSave}
        className="w-full bg-gray-900 disabled:bg-gray-100 disabled:text-gray-400 text-white py-[14px] rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98]"
      >
        {busy ? '저장 중...' : '이 날짜로 저장 (확정)'}
      </button>

      {saveErr && (
        <p className="text-[13px] text-red-500 font-semibold">저장에 실패했어요. 다시 시도해 주세요</p>
      )}
    </div>
  )
}
