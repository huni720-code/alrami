import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto px-5 py-4">
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-[17px] font-bold text-gray-900">개인정보처리방침</h1>
      </div>

      <div className="space-y-5 text-[14px] text-gray-600 leading-relaxed pb-12">
        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">1. 수집하는 개인정보</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>이메일 주소 (회원 식별용)</li>
            <li>이름·전화번호 (카카오톡 알림 수신용, 선택)</li>
            <li>약정 정보: 품목·회사·가입일 또는 만료일·월 요금 (만료 추적 서비스 제공용)</li>
            <li>
              가족 호칭 라벨 (예: "엄마", "할머니" — 이용자가 직접 입력하는 호칭으로,
              타인의 이름·연락처는 수집하지 않습니다)
            </li>
            <li>카카오 로그인 이용 시: 카카오 계정 이메일·전화번호 (이용자가 동의한 범위 내)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">2. 수집 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 가입 및 서비스 제공</li>
            <li>약정 만료 알림 발송</li>
            <li>서비스 개선 및 통계 분석 (익명화)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">3. 보유·이용 기간</h2>
          <p>
            회원 탈퇴 시까지 보유하며, 탈퇴 시 즉시 파기합니다.
            단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">4. 처리 위탁</h2>
          <p>
            카카오톡 알림 발송을 위해 발송 대행사에 처리를 위탁할 수 있으며,
            위탁 개시 시 수탁자와 위탁 업무를 본 방침에 공개합니다. (현재 위탁 없음)
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">5. 제3자 제공</h2>
          <p>
            이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다(법령에 의한 요청 예외).
            서비스 내 외부 링크(비교·개통 서비스 등)로 이동하는 경우, 이동한 사이트에는
            해당 사업자의 개인정보처리방침이 적용됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">6. 이용자 권리</h2>
          <p>
            이용자는 언제든지 자신의 개인정보를 조회·수정·삭제할 수 있으며,
            회원 탈퇴로 모든 정보를 삭제할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">7. 개인정보 보호책임자 및 문의</h2>
          <p>
            개인정보 처리에 관한 문의는 앱 내 '내 정보' 화면을 통해 연락해 주세요.
            (사업자 등록 후 책임자 성명·연락처를 이곳에 기재)
          </p>
        </section>

        <p className="text-[12px] text-gray-400 pt-4 border-t border-gray-100">
          시행일: 2026년 6월 12일
        </p>
      </div>
    </div>
  )
}
