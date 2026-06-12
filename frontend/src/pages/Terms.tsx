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
            이 약관은 만기톡(이하 "서비스")이 제공하는 약정 만료 알림 서비스의 이용 조건과 절차,
            이용자와 서비스 간의 권리·의무를 규정합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제2조 (정의)</h2>
          <p>
            "서비스"란 이용자가 등록한 통신·렌탈 등 약정의 만료일을 추적하고,
            만료 임박·경과 시 알림과 관련 정보를 제공하는 기능 일체를 말합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제3조 (서비스 이용)</h2>
          <p>
            이용자는 가입 후 약정 정보를 등록하고 만료 알림을 받을 수 있습니다.
            알림과 진단은 이용자가 입력한 정보를 기반으로 하므로, 입력이 정확하지 않으면
            결과도 정확하지 않을 수 있습니다. 실제 약정 조건은 해당 통신사·렌탈사에서
            직접 확인하시기 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제4조 (알림의 한계와 면책)</h2>
          <p>
            ① 서비스의 절약 추정 금액은 참고용이며 실제 요금·혜택과 다를 수 있습니다.
          </p>
          <p className="mt-2">
            ② 알림은 시스템 장애, 발송 채널 사정, 입력된 약정일의 오류 등으로 지연되거나
            발송되지 않을 수 있으며, 서비스는 알림 미수신으로 발생한 손해(위약금, 할인 미적용 등)에
            대해 책임을 지지 않습니다. 다만 서비스의 고의 또는 중대한 과실로 인한 경우는
            예외로 합니다.
          </p>
          <p className="mt-2">
            ③ 서비스는 이용자의 최종 계약·해지·전환 결정에 대한 책임을 지지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제5조 (제휴 및 광고의 표시)</h2>
          <p>
            서비스는 외부 비교·개통 서비스로 연결되는 링크를 제공할 수 있으며, 연결을 통해
            수수료를 받을 수 있습니다. 수수료를 받는 경우 해당 화면에 그 사실을 표시하며,
            추천 내용과 순서는 수수료가 아닌 이용자의 이익을 기준으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제6조 (서비스의 변경·중단)</h2>
          <p>
            서비스는 운영상·기술상 필요에 따라 기능을 변경하거나 중단할 수 있으며,
            중대한 변경은 앱 내 공지로 안내합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-bold text-gray-800 mb-2">제7조 (약관 변경)</h2>
          <p>
            서비스는 필요 시 약관을 변경할 수 있으며, 변경 시 앱 내 공지로 안내합니다.
            변경 이후에도 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.
          </p>
        </section>

        <p className="text-[12px] text-gray-400 pt-4 border-t border-gray-100">
          시행일: 2026년 6월 12일
        </p>
      </div>
    </div>
  )
}
