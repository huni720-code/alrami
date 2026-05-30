import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Wifi, Tv, Droplets, WashingMachine, ShowerHead, ThumbsUp } from 'lucide-react'
import { contractApi } from '../../lib/api'
import type { ContractEstimate, ProviderInfo } from '../../lib/api'

// ── 상수 ──────────────────────────────────────────────────────────────────────

type Category = '휴대폰' | '인터넷' | 'TV' | '정수기' | '렌탈가전' | '비데'
type Screen = 'phone' | 'grid' | 'category' | 'helper'

const CARRIER_OPTIONS: Record<Category, string[]> = {
  휴대폰: ['SKT', 'KT', 'LG U+', '알뜰폰'],
  인터넷: ['SKT', 'KT', 'LG U+'],
  TV: ['SKT', 'KT', 'LG U+'],
  정수기: ['코웨이', '청호나이스', 'LG전자', 'SK매직', '쿠쿠', '기타'],
  렌탈가전: ['코웨이', 'LG전자', 'SK매직', '교원웰스', '기타'],
  비데: ['코웨이', '청호나이스', 'SK매직', '기타'],
}

const SIGNUP_OPTIONS = ['올해', '작년', '재작년', '그이전', '모름'] as const
const TERM_OPTIONS = ['2년', '3년', '30개월', '무약정', '모름'] as const

type LucideIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

const GRID_ITEMS: { cat: Category; Icon: LucideIcon }[] = [
  { cat: '인터넷', Icon: Wifi },
  { cat: 'TV', Icon: Tv },
  { cat: '정수기', Icon: Droplets },
  { cat: '렌탈가전', Icon: WashingMachine },
  { cat: '비데', Icon: ShowerHead },
]

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function toStartDate(signup: string): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  if (signup === '올해') return `${y}-06-15`
  if (signup === '작년') return `${y - 1}-${m}-15`
  if (signup === '재작년') return `${y - 2}-${m}-15`
  if (signup === '그이전') return `${y - 3}-${m}-15`
  return `${y - 2}-06-15` // 모름 → 2년 전 중간
}

function toTermMonths(term: string): number {
  if (term === '2년') return 24
  if (term === '3년') return 36
  if (term === '30개월') return 30
  if (term === '무약정') return 1
  return 24 // 모름
}

function fmtYearMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-')
  return `${y}년 ${parseInt(m)}월`
}

function ddayLabel(dday: number): string {
  if (dday > 0) return `D-${dday}`
  if (dday === 0) return 'D-Day'
  return `D+${Math.abs(dday)}`
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`px-4 py-2.5 rounded-full border text-[14px] font-semibold transition-colors min-h-[44px] active:scale-[0.97] ${
        selected
          ? 'border-[#10b981] bg-[#E1F5EE] text-[#0F6E56]'
          : 'border-gray-200 text-gray-600 bg-white'
      }`}
    >
      {label}
    </button>
  )
}

// ── 약정 입력 폼 (화면 1 · 화면 4) ───────────────────────────────────────────

interface FormState {
  carrier: string
  signupYear: string
  termOption: string
}

interface ContractFormViewProps {
  category: Category
  stepLabel: string
  form: FormState
  onFormChange: (form: FormState) => void
  onConfirm: (contractId: number) => void
  onHelper: (form: FormState) => void
  onBack?: () => void
}

function ContractFormView({
  category,
  stepLabel,
  form,
  onFormChange,
  onConfirm,
  onHelper,
  onBack,
}: ContractFormViewProps) {
  const setForm = onFormChange
  const [estimate, setEstimate] = useState<ContractEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [busy, setBusy] = useState(false)

  const carriers = CARRIER_OPTIONS[category]
  const isNoContract = form.termOption === '무약정'
  const isComplete = !!form.carrier && !!form.signupYear && !!form.termOption
  const isUnknown = form.signupYear === '모름' || form.termOption === '모름'
  const providerLabel =
    category === '정수기' || category === '렌탈가전' || category === '비데' ? '렌탈사' : '통신사'

  // estimate 호출
  useEffect(() => {
    if (!isComplete || isNoContract) {
      setEstimate(null)
      return
    }
    setEstimating(true)
    const start = toStartDate(form.signupYear)
    const months = toTermMonths(form.termOption)
    contractApi
      .estimate(start, months)
      .then((r) => setEstimate(r.data))
      .catch(() => setEstimate(null))
      .finally(() => setEstimating(false))
  }, [form.carrier, form.signupYear, form.termOption, isComplete, isNoContract])

  const handleConfirm = async () => {
    if (!isComplete || busy) return
    setBusy(true)
    try {
      const start = toStartDate(form.signupYear)
      const months = toTermMonths(form.termOption)
      const res = await contractApi.create({
        category,
        provider: form.carrier,
        start_date: start,
        term_months: months,
        accuracy: 'estimated',
      })
      onConfirm(res.data.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 상단 내비 */}
      <div className="flex items-center px-6 pt-14 pb-2">
        {onBack && (
          <button type="button" onClick={onBack} className="mr-3 text-gray-400 text-[22px] leading-none min-h-[44px] min-w-[44px] flex items-center">
            ←
          </button>
        )}
        <p className="text-[11px] text-gray-400">{stepLabel}</p>
      </div>

      <div className="px-6 pb-4">
        <h2 className="text-[22px] font-bold text-gray-900 mt-1">약정 정보를 알려주세요</h2>
      </div>

      <div className="flex-1 px-6 space-y-7 overflow-y-auto pb-4">
        {/* 통신사/렌탈사 */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">{providerLabel}</p>
          <div className="flex flex-wrap gap-2">
            {carriers.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={form.carrier === c}
                onSelect={() => setForm({ ...form, carrier: c })}
              />
            ))}
          </div>
        </div>

        {/* 언제 가입했어요? */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">언제 가입했어요?</p>
          <div className="flex flex-wrap gap-2">
            {SIGNUP_OPTIONS.map((o) => (
              <Chip
                key={o}
                label={o}
                selected={form.signupYear === o}
                onSelect={() => setForm({ ...form, signupYear: o })}
              />
            ))}
          </div>
        </div>

        {/* 약정 몇 년? */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">약정 몇 년?</p>
          <div className="flex flex-wrap gap-2">
            {TERM_OPTIONS.map((o) => (
              <Chip
                key={o}
                label={o}
                selected={form.termOption === o}
                onSelect={() => setForm({ ...form, termOption: o })}
              />
            ))}
          </div>
        </div>

        {/* 추정 결과 카드 */}
        {isComplete && (
          <div className="rounded-2xl bg-[#E1F5EE] p-5">
            <p className="text-[11px] text-[#0F6E56] font-semibold mb-2">
              약정 종료{isNoContract ? '' : isUnknown ? ' (추정 · 대략)' : ' (추정)'}
            </p>
            {isNoContract ? (
              <p className="text-[22px] font-bold text-[#0F6E56] flex items-center gap-2">무약정이에요 <ThumbsUp size={22} /></p>
            ) : estimating ? (
              <div className="h-9 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-[#10b981] border-t-transparent animate-spin" />
                <span className="text-[13px] text-[#0F6E56]">계산 중...</span>
              </div>
            ) : estimate ? (
              <>
                <p className="text-[28px] font-extrabold text-[#0F6E56]">
                  {fmtYearMonth(estimate.end_date)}쯤
                </p>
                <p className="text-[12px] text-[#0F6E56] mt-1.5 opacity-70">
                  {ddayLabel(estimate.dday)}
                  {estimate.dday > 0 && estimate.dday <= 180 && ' · 위약금 있을 수 있어요'}
                  {estimate.dday <= 0 && ' · 이미 지났어요'}
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-10 pt-4 space-y-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isComplete || busy}
          className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[18px] rounded-2xl text-[17px] font-bold transition-all active:scale-[0.98]"
        >
          {busy ? '저장 중...' : isNoContract ? '확인, 저장할게요' : '네, 맞아요'}
        </button>
        {!isNoContract && (
          <button
            type="button"
            onClick={() => onHelper(form)}
            className="w-full text-center text-[14px] text-gray-400 py-3 min-h-[44px]"
          >
            정확히 확인할래요 →
          </button>
        )}
      </div>
    </div>
  )
}

// ── 아이콘 그리드 (화면 2) ────────────────────────────────────────────────────

interface GridViewProps {
  completed: Category[]
  onAdd: (cat: Category) => void
  onDone: () => void
}

function GridView({ completed, onAdd, onDone }: GridViewProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="px-6 pt-14 pb-2">
        <p className="text-[11px] text-gray-400 mb-2">2 · 약정 더 있나요</p>
        <h2 className="text-[22px] font-bold text-gray-900 mb-1">해당하는 것만 골라요</h2>
        <p className="text-[12px] text-gray-400">지원금 걸린 것만. 나중에 알려드릴게요.</p>
      </div>

      <div className="flex-1 px-6 pt-5">
        <div className="grid grid-cols-2 gap-3">
          {/* 휴대폰 — 항상 완료 */}
          <div className="rounded-2xl border-2 border-[#10b981] bg-[#E1F5EE] p-5 flex flex-col items-center gap-1.5 min-h-[108px] justify-center">
            <Smartphone size={32} strokeWidth={1.5} className="text-[#0F6E56]" />
            <span className="text-[13px] font-semibold text-[#0F6E56]">휴대폰</span>
            <span className="text-[11px] text-[#10b981] font-bold">✓ 완료</span>
          </div>

          {GRID_ITEMS.map(({ cat, Icon }) => {
            const done = completed.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => !done && onAdd(cat)}
                className={`rounded-2xl border-2 p-5 flex flex-col items-center gap-1.5 min-h-[108px] justify-center transition-all active:scale-[0.97] ${
                  done ? 'border-[#10b981] bg-[#E1F5EE]' : 'border-gray-200 bg-white'
                }`}
              >
                <Icon size={32} strokeWidth={1.5} className={done ? 'text-[#0F6E56]' : 'text-gray-400'} />
                <span className={`text-[13px] font-semibold ${done ? 'text-[#0F6E56]' : 'text-gray-600'}`}>
                  {cat}
                </span>
                <span className={`text-[11px] font-bold ${done ? 'text-[#10b981]' : 'text-gray-400'}`}>
                  {done ? '✓ 완료' : '+ 추가'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 pb-10 pt-6 space-y-1">
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-[#10b981] text-white py-[18px] rounded-2xl text-[17px] font-bold transition-all active:scale-[0.98]"
        >
          다음
        </button>
        <button
          type="button"
          onClick={onDone}
          className="w-full text-center text-[14px] text-gray-400 py-3 min-h-[44px]"
        >
          없으면 건너뛰기
        </button>
      </div>
    </div>
  )
}

// ── 약정 확인 도우미 (화면 3) ─────────────────────────────────────────────────

interface HelperViewProps {
  category: Category
  existingContractId: number | null
  prefillForm: FormState
  onConfirmed: (contractId: number) => void
  onBack: () => void
}

function HelperView({
  category,
  existingContractId,
  prefillForm: _prefillForm,
  onConfirmed,
  onBack,
}: HelperViewProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selected, setSelected] = useState('')
  const [dateInput, setDateInput] = useState('') // YYYY-MM
  const [busy, setBusy] = useState(false)
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    contractApi.providerInfo().then((r) => setProviders(r.data))
  }, [])

  const info = providers.find((p) => p.provider === selected) ?? null
  const hasPhone = info && (info.short_number || info.center_number)
  const phoneNum = info?.short_number || info?.center_number || null

  const relevantProviders = providers.filter((p) => {
    if (!p.category_hint) return false
    return p.category_hint.split('/').some((h) => h.trim() === category)
  })

  const validateDate = (val: string) => {
    if (!val) { setDateError(''); return false }
    const [y, m] = val.split('-').map(Number)
    if (!y || !m || m < 1 || m > 12 || y < 2020 || y > 2035) {
      setDateError('올바른 날짜를 입력해 주세요 (예: 2027-03)')
      return false
    }
    setDateError('')
    return true
  }

  const handleConfirm = async () => {
    if (!selected || !dateInput || !validateDate(dateInput) || busy) return
    setBusy(true)
    const endDate = `${dateInput}-01`
    try {
      if (existingContractId !== null) {
        const res = await contractApi.update(existingContractId, {
          provider: selected,
          end_date: endDate,
          accuracy: 'confirmed',
        })
        onConfirmed(res.data.id)
      } else {
        const res = await contractApi.create({
          category,
          provider: selected,
          end_date: endDate,
          accuracy: 'confirmed',
        })
        onConfirmed(res.data.id)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 상단 내비 */}
      <div className="flex items-center px-6 pt-14 pb-2">
        <button type="button" onClick={onBack} className="mr-3 text-gray-400 text-[22px] leading-none min-h-[44px] min-w-[44px] flex items-center">
          ←
        </button>
        <p className="text-[11px] text-gray-400">약정일 확인 도우미</p>
      </div>
      <div className="px-6 pb-4">
        <h2 className="text-[22px] font-bold text-gray-900 mt-1">약정일 모르세요?</h2>
      </div>

      <div className="flex-1 px-6 space-y-6 overflow-y-auto pb-4">
        {/* 회사 선택 칩 */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-3">회사 선택</p>
          <div className="flex flex-wrap gap-2">
            {relevantProviders.map((p) => (
              <Chip
                key={p.provider}
                label={p.provider}
                selected={selected === p.provider}
                onSelect={() => setSelected(p.provider)}
              />
            ))}
          </div>
        </div>

        {/* 확인 카드 */}
        {selected && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-4">
            {hasPhone ? (
              <>
                {/* 전화 버튼 */}
                <a
                  href={`tel:${phoneNum}`}
                  className="flex items-center justify-center gap-2 w-full bg-[#10b981] text-white py-4 rounded-xl text-[16px] font-bold min-h-[56px] active:scale-[0.98] transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16v.92z" />
                  </svg>
                  {phoneNum} 전화하기
                </a>

                {/* 앱 경로 */}
                {info.app_name && info.check_path && (
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    또는{' '}
                    <span className="font-semibold text-gray-800">{info.app_name}</span>
                    {' '}앱 &gt; {info.check_path}
                  </p>
                )}
              </>
            ) : (
              /* 미확인 회사 — fallback */
              <div className="space-y-2">
                <p className="text-[14px] font-semibold text-gray-700">
                  정확한 번호를 아직 확인 중이에요
                </p>
                <a
                  href={`https://search.naver.com/search.naver?query=${encodeURIComponent(selected + ' 고객센터')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full border-2 border-gray-200 text-gray-700 py-4 rounded-xl text-[15px] font-semibold min-h-[56px]"
                >
                  {selected} 고객센터 검색 →
                </a>
              </div>
            )}

            {/* 안내 */}
            <p className="text-[11px] text-gray-400 leading-relaxed">
              자동 조회는 안 돼요. 확인 후 아래에 입력하면 끝이에요.
            </p>
          </div>
        )}

        {/* 날짜 입력 */}
        <div>
          <p className="text-[12px] text-gray-500 font-semibold mb-2">확인한 약정 종료일</p>
          <input
            type="month"
            value={dateInput}
            onChange={(e) => {
              setDateInput(e.target.value)
              validateDate(e.target.value)
            }}
            placeholder="2027-03"
            min="2024-01"
            max="2035-12"
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-[18px] font-bold text-gray-800 outline-none focus:border-[#10b981] transition-colors"
          />
          {dateError && (
            <p className="text-[12px] text-red-400 mt-1">{dateError}</p>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-10 pt-4">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selected || !dateInput || !!dateError || busy}
          className="w-full bg-[#10b981] disabled:bg-gray-100 disabled:text-gray-400 text-white py-[18px] rounded-2xl text-[17px] font-bold transition-all active:scale-[0.98]"
        >
          {busy ? '저장 중...' : '입력 완료'}
        </button>
      </div>
    </div>
  )
}

// ── 메인: ContractOnboarding ──────────────────────────────────────────────────

export default function ContractOnboarding() {
  const navigate = useNavigate()

  const [screen, setScreen] = useState<Screen>('phone')
  const [activeCategory, setActiveCategory] = useState<Category>('휴대폰')
  const [completedCats, setCompletedCats] = useState<Category[]>([])

  // 폼 상태를 부모에서 유지 → 헬퍼 왕복 후에도 선택값 보존
  const [phoneForm, setPhoneForm] = useState<FormState>({ carrier: '', signupYear: '', termOption: '' })
  const [catForm, setCatForm] = useState<FormState>({ carrier: '', signupYear: '', termOption: '' })

  const [helperContractId, setHelperContractId] = useState<number | null>(null)
  const [helperPrefillForm, setHelperPrefillForm] = useState<FormState>({
    carrier: '',
    signupYear: '',
    termOption: '',
  })
  const [helperReturnScreen, setHelperReturnScreen] = useState<Screen>('phone')

  // 약정 폼에서 "네, 맞아요" 클릭 후
  const handleFormConfirm = (_contractId: number) => {
    setCompletedCats((prev) => {
      if (!prev.includes(activeCategory)) return [...prev, activeCategory]
      return prev
    })
    if (screen === 'phone') {
      setScreen('grid')
    } else {
      // category form → grid 복귀
      setScreen('grid')
    }
  }

  // 약정 폼에서 "정확히 확인할래요" 클릭
  const handleGoHelper = (form: FormState) => {
    setHelperPrefillForm(form)
    setHelperContractId(null) // 아직 저장 전
    setHelperReturnScreen(screen)
    setScreen('helper')
  }

  // 헬퍼에서 입력 완료 후
  const handleHelperConfirmed = (_contractId: number) => {
    setCompletedCats((prev) => {
      if (!prev.includes(activeCategory)) return [...prev, activeCategory]
      return prev
    })
    setScreen('grid')
  }

  // 그리드에서 추가 카테고리 탭
  const handleAddCategory = (cat: Category) => {
    setActiveCategory(cat)
    setCatForm({ carrier: '', signupYear: '', termOption: '' }) // 새 카테고리 시작 시 초기화
    setScreen('category')
  }

  // 그리드 "다음" / "건너뛰기"
  const handleDone = () => {
    navigate('/dashboard')
  }

  return (
    <>
      {screen === 'phone' && (
        <ContractFormView
          category="휴대폰"
          stepLabel="1 · 휴대폰 약정"
          form={phoneForm}
          onFormChange={setPhoneForm}
          onConfirm={handleFormConfirm}
          onHelper={handleGoHelper}
        />
      )}

      {screen === 'grid' && (
        <GridView
          completed={completedCats.filter((c) => c !== '휴대폰') as Category[]}
          onAdd={handleAddCategory}
          onDone={handleDone}
        />
      )}

      {screen === 'category' && (
        <ContractFormView
          category={activeCategory}
          stepLabel={`추가 · ${activeCategory} 약정`}
          form={catForm}
          onFormChange={setCatForm}
          onConfirm={handleFormConfirm}
          onHelper={handleGoHelper}
          onBack={() => setScreen('grid')}
        />
      )}

      {screen === 'helper' && (
        <HelperView
          category={activeCategory}
          existingContractId={helperContractId}
          prefillForm={helperPrefillForm}
          onConfirmed={handleHelperConfirmed}
          onBack={() => setScreen(helperReturnScreen)}
        />
      )}
    </>
  )
}
