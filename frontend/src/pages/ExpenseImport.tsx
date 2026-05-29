import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { importApi } from '../lib/api'
import { parseBlocks } from '../services/aiParser'
import { EXPENSE_CATEGORIES } from '../types/expenseImport'
import type { ExpenseCategory, ParsedExpense } from '../types/expenseImport'

const SAMPLE_TEXT = `[신한카드]
05/28 스타벅스 15,000원 승인
05/27 이마트 45,800원 승인

[삼성카드]
05/28 카카오택시 12,800원
05/26 롯데시네마 14,000원`

const CAT_COLOR: Record<string, string> = {
  '식비':       'bg-orange-100 text-orange-700',
  '교통':       'bg-blue-100   text-blue-700',
  '쇼핑':       'bg-pink-100   text-pink-700',
  '의료':       'bg-red-100    text-red-700',
  '문화/여가':  'bg-purple-100 text-purple-700',
  '주거/통신':  'bg-teal-100   text-teal-700',
  '교육':       'bg-indigo-100 text-indigo-700',
  '금융':       'bg-gray-200   text-gray-700',
  '기타':       'bg-gray-100   text-gray-500',
}

type Step = 'input' | 'review' | 'done'

// ── 입력 화면 ─────────────────────────────────────────────────
function InputStep({
  rawText,
  onChange,
  onAnalyze,
}: {
  rawText: string
  onChange: (v: string) => void
  onAnalyze: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="max-w-sm mx-auto pb-10">
      <div className="flex items-center gap-3 pt-2 mb-5">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-400 text-[15px]">←</button>
        <h1 className="text-[22px] font-extrabold text-gray-900">내역 가져오기</h1>
      </div>

      <p className="text-[14px] text-gray-500 mb-4 leading-relaxed">
        카드 승인 문자나 은행 사용 내역을 붙여넣으면<br />
        날짜·카드사·가맹점·금액·카테고리를 자동으로 추출해요
      </p>

      <div className="bg-gray-50 rounded-2xl p-3 mb-3 text-[12px] text-gray-400 leading-relaxed">
        <p className="font-medium text-gray-500 mb-1">블록 형식도 지원해요</p>
        <p>[신한카드]</p>
        <p>05/28 스타벅스 15,000원 승인</p>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        autoFocus
        className="w-full bg-gray-50 rounded-2xl p-4 text-[14px] text-gray-800 placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-[#10b981] resize-none leading-relaxed"
        placeholder={`여기에 붙여넣으세요\n\n예시:\n${SAMPLE_TEXT}`}
      />

      <button
        type="button"
        onClick={onAnalyze}
        disabled={!rawText.trim()}
        className="w-full mt-4 bg-[#10b981] disabled:bg-gray-100 text-white disabled:text-gray-300
          py-[18px] rounded-2xl text-[17px] font-bold transition-all active:scale-[0.98]"
      >
        분석하기 →
      </button>

      <button
        type="button"
        onClick={() => onChange(SAMPLE_TEXT)}
        className="w-full mt-3 text-[13px] text-gray-400 py-2"
      >
        예시 데이터로 테스트해보기
      </button>
    </div>
  )
}

// ── 표 형식 검토 화면 ─────────────────────────────────────────
function ReviewStep({
  items,
  failedLines,
  saving,
  onUpdate,
  onRemove,
  onBack,
  onSave,
}: {
  items: ParsedExpense[]
  failedLines: string[]
  saving: boolean
  onUpdate: (id: string, patch: Partial<ParsedExpense>) => void
  onRemove: (id: string) => void
  onBack: () => void
  onSave: () => void
}) {
  const [showFailed, setShowFailed] = useState(false)

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* 헤더 */}
      <div className="flex items-center gap-3 pt-2 mb-4">
        <button type="button" onClick={onBack} className="text-gray-400 text-[15px]">←</button>
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900">
            {items.length}건 분석됨
          </h1>
          {failedLines.length > 0 && (
            <p className="text-[12px] text-gray-400">{failedLines.length}줄 인식 실패</p>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <p className="text-[12px] text-gray-400 mb-3 px-1">
          각 셀을 직접 수정할 수 있어요 · 금액 단위: 원
        </p>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[16px] text-gray-400 mb-1">인식된 내역이 없어요</p>
          <p className="text-[13px] text-gray-300">금액이 포함된 줄을 입력해주세요</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 mb-4">
          <table className="w-full min-w-[560px] text-[13px] border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-2.5 pr-2 font-semibold text-gray-500 whitespace-nowrap">날짜</th>
                <th className="text-left py-2.5 pr-2 font-semibold text-gray-500 whitespace-nowrap">카드사</th>
                <th className="text-left py-2.5 pr-2 font-semibold text-gray-500 whitespace-nowrap">가맹점</th>
                <th className="text-right py-2.5 pr-2 font-semibold text-gray-500 whitespace-nowrap">금액</th>
                <th className="text-left py-2.5 pr-2 font-semibold text-gray-500 whitespace-nowrap">카테고리</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  {/* 날짜 */}
                  <td className="py-2 pr-2">
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => onUpdate(item.id, { date: e.target.value })}
                      className="text-[12px] text-gray-600 bg-transparent outline-none focus:bg-gray-100 rounded px-1 py-0.5 w-[112px]"
                    />
                  </td>
                  {/* 카드사 */}
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={item.card_company ?? ''}
                      onChange={(e) => onUpdate(item.id, { card_company: e.target.value || null })}
                      placeholder="—"
                      className="text-[12px] text-gray-600 bg-transparent outline-none focus:bg-gray-100 rounded px-1 py-0.5 w-[80px] placeholder:text-gray-300"
                    />
                  </td>
                  {/* 가맹점 */}
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={item.merchant}
                      onChange={(e) => onUpdate(item.id, { merchant: e.target.value, description: e.target.value })}
                      className="text-[13px] font-medium text-gray-800 bg-transparent outline-none focus:bg-gray-100 rounded px-1 py-0.5 w-[120px]"
                    />
                  </td>
                  {/* 금액 */}
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => onUpdate(item.id, { amount: Math.max(0, Number(e.target.value)) })}
                      className="text-[13px] font-semibold text-[#10b981] bg-transparent outline-none focus:bg-gray-100 rounded px-1 py-0.5 w-[84px] text-right"
                    />
                  </td>
                  {/* 카테고리 */}
                  <td className="py-2 pr-2">
                    <select
                      value={item.category}
                      onChange={(e) => onUpdate(item.id, { category: e.target.value as ExpenseCategory })}
                      className={`text-[11px] font-medium rounded-lg px-1.5 py-1 outline-none cursor-pointer
                        ${CAT_COLOR[item.category] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  {/* 삭제 */}
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-[16px] leading-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 인식 실패 줄 */}
      {failedLines.length > 0 && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setShowFailed(!showFailed)}
            className="flex items-center gap-1.5 text-[13px] text-gray-400"
          >
            <span className="text-orange-400">⚠</span>
            <span>인식 실패 {failedLines.length}줄</span>
            <span className="text-[11px]">{showFailed ? '▲' : '▼'}</span>
          </button>
          {showFailed && (
            <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-1.5">
              {failedLines.map((l, i) => (
                <p key={i} className="text-[12px] text-gray-400 line-through">{l}</p>
              ))}
              <p className="text-[11px] text-gray-300 pt-1">금액이 포함되지 않은 줄은 건너뜁니다</p>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={items.length === 0 || saving}
        className="w-full bg-[#10b981] disabled:bg-gray-100 text-white disabled:text-gray-300
          py-[18px] rounded-2xl text-[17px] font-bold transition-all active:scale-[0.98]"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            저장 중...
          </span>
        ) : (
          `지출로 저장하기 (${items.length}건)`
        )}
      </button>
    </div>
  )
}

// ── 완료 화면 ─────────────────────────────────────────────────
function DoneStep({
  saved,
  errors,
  onReset,
}: {
  saved: number
  errors: number
  onReset: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="max-w-sm mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-[52px] mb-3">✅</div>
      <p className="text-[22px] font-extrabold text-gray-900 mb-1">저장 완료!</p>
      <p className="text-[14px] text-gray-400 mb-1">{saved}건의 지출이 기록됐어요</p>
      {errors > 0 && (
        <p className="text-[12px] text-orange-400 mb-1">{errors}건 저장 실패</p>
      )}
      <div className="flex gap-3 w-full mt-6">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl text-[15px] font-semibold"
        >
          더 입력하기
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex-1 bg-[#10b981] text-white py-3.5 rounded-2xl text-[15px] font-semibold"
        >
          대시보드 →
        </button>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function ExpenseImport() {
  const [step, setStep] = useState<Step>('input')
  const [rawText, setRawText] = useState('')
  const [items, setItems] = useState<ParsedExpense[]>([])
  const [failedLines, setFailedLines] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState({ saved: 0, errors: 0 })

  const handleAnalyze = () => {
    const parsed = parseBlocks(rawText)
    setItems(parsed.items)
    setFailedLines(parsed.failed_lines)
    setStep('review')
  }

  const updateItem = (id: string, patch: Partial<ParsedExpense>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = items.map((item) => ({
        date: item.date,
        card_company: item.card_company,
        merchant: item.merchant,
        amount: item.amount,
        category: item.category,
        description: item.description,
      }))
      const res = await importApi.bulkSave(payload)
      setResult({ saved: res.data.saved, errors: res.data.errors })
    } catch {
      setResult({ saved: 0, errors: items.length })
    }
    setSaving(false)
    setStep('done')
  }

  const handleReset = () => {
    setStep('input')
    setRawText('')
    setItems([])
    setFailedLines([])
    setResult({ saved: 0, errors: 0 })
  }

  return (
    <Layout>
      {step === 'input' && (
        <InputStep rawText={rawText} onChange={setRawText} onAnalyze={handleAnalyze} />
      )}
      {step === 'review' && (
        <ReviewStep
          items={items}
          failedLines={failedLines}
          saving={saving}
          onUpdate={updateItem}
          onRemove={removeItem}
          onBack={() => setStep('input')}
          onSave={handleSave}
        />
      )}
      {step === 'done' && (
        <DoneStep saved={result.saved} errors={result.errors} onReset={handleReset} />
      )}
    </Layout>
  )
}
