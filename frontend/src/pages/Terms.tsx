import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Terms() {
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
        <h1 className="text-[17px] font-bold text-gray-900">서비스 이용약관</h1>
      </div>

      <div className="space-y-5 text-[14px] text-gray-600 leading-relaxed pb-12">
        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제1조 (목적)</h2>
          <p>
            이 약관은 만기톡(이하 "서비스")이 제공하는 약정 만료 알림 서비스의 이용 조건 및 절차,
            이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제2조 (정의)</h2>
          <p>
            "서비스"란 이용자가 등록한 통신·렌탈 등 약정의 만료일을 추적하고,
            만료 임박 시 알림을 제공하는 일체의 기능을 말합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제3조 (서비스 이용)</h2>
          <p>
            이용자는 서비스에 가입하여 약정 정보를 등록하고, 만료 알림을 수신할 수 있습니다.
            서비스는 이용자가 입력한 정보를 기반으로 알림을 제공하며, 실제 약정 조건은
            해당 통신사·렌탈사에 직접 확인하시기 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제4조 (면책)</h2>
          <p>
            서비스에서 제공하는 절약 추정 금액은 참고용이며, 실제 요금·혜택과 다를 수 있습니다.
            서비스는 이용자의 최종 계약·선택에 대한 책임을 지지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제5조 (약관 변경)</h2>
          <p>
            서비스는 필요 시 약관을 변경할 수 있으며, 변경 시 앱 내 공지를 통해 안내합니다.
            변경 이후에도 계속 서비스를 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.
          </p>
        </section>

        <p className="text-[12px] text-gray-400 pt-4 border-t border-gray-100">
          시행일: 2025년 1월 1일
        </p>
      </div>
    </div>
  )
}
