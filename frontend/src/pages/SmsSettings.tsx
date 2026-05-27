import { useState } from 'react'
import Layout from '../components/Layout'

export default function SmsSettings() {
  const [phone, setPhone] = useState(localStorage.getItem('sms_phone') || '')
  const [saved, setSaved] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [monthlyBudget, setMonthlyBudget] = useState(
    localStorage.getItem('monthly_budget') || ''
  )
  const [alertEnabled, setAlertEnabled] = useState(
    localStorage.getItem('sms_alert_enabled') === 'true'
  )

  const handleSavePhone = () => {
    localStorage.setItem('sms_phone', phone)
    localStorage.setItem('monthly_budget', monthlyBudget)
    localStorage.setItem('sms_alert_enabled', String(alertEnabled))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestSms = () => {
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)
  }

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">문자 연동 설정</h2>

      <div className="space-y-6">
        {/* 전화번호 설정 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">알림 수신 번호</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                휴대폰 번호
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="010-0000-0000"
                />
                <button
                  onClick={handleTestSms}
                  disabled={!phone}
                  className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  테스트 발송
                </button>
              </div>
              {testSent && (
                <p className="text-green-600 text-sm mt-2">
                  테스트 문자가 발송되었습니다. (실제 연동 시 Twilio/알리고 등 연결 필요)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 예산 알림 설정 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">예산 초과 알림</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">예산 초과 시 문자 알림</p>
                <p className="text-xs text-gray-500">월 예산 초과 시 자동으로 문자를 발송합니다.</p>
              </div>
              <button
                onClick={() => setAlertEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  alertEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    alertEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                월 예산 한도 (원)
              </label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 500000"
              />
            </div>
          </div>
        </div>

        {/* 문자 연동 안내 */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
          <h3 className="font-semibold text-blue-700 mb-3">문자 연동 방법 안내</h3>
          <div className="space-y-2 text-sm text-blue-600">
            <p><span className="font-medium">1. Twilio (글로벌)</span> — 국제 SMS 서비스. 계정 등록 후 API Key 입력.</p>
            <p><span className="font-medium">2. 알리고 (국내)</span> — 국내 문자 서비스. 저렴한 단가. API Key 입력 후 즉시 연동.</p>
            <p><span className="font-medium">3. CoolSMS (국내)</span> — 국내 최대 문자 서비스. 카카오 알림톡 연동 가능.</p>
          </div>
          <p className="text-xs text-blue-400 mt-3">
            실제 문자 발송을 위해 백엔드에 SMS API 키를 환경변수로 설정하고 발송 로직을 연결하세요.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSavePhone}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {saved ? '저장완료!' : '설정 저장'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
