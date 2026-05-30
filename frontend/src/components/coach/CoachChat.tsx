import { useEffect, useRef, useState } from 'react'
import type { CoachMessage } from '../../types/coach'
import type { DashboardKpi } from '../../lib/api'
import { answerQuestion } from '../../services/coachService'
import CoachSuggestionChips from './CoachSuggestionChips'

const WELCOME: CoachMessage = {
  id: 'welcome',
  role: 'coach',
  text: '안녕하세요! 궁금한 내용을 아래에서 선택해 주세요.',
  timestamp: new Date().toISOString(),
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function Bubble({ msg }: { msg: CoachMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#10b981] flex items-center justify-center mb-1">
          <span className="text-white text-[11px] font-bold">알</span>
        </div>
      )}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-[#10b981] text-white rounded-tr-sm'
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
          }`}
        >
          {msg.text}
        </div>
        <span className="text-[10px] text-gray-300 px-1">{formatTime(msg.timestamp)}</span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[#10b981] flex items-center justify-center">
        <span className="text-white text-[11px] font-bold">알</span>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface Props {
  kpi: DashboardKpi
}

export default function CoachChat({ kpi }: Props) {
  const [messages, setMessages] = useState<CoachMessage[]>([WELCOME])
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const handleSend = async (question: string) => {
    if (typing) return

    const userMsg: CoachMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setTyping(true)

    await new Promise((r) => setTimeout(r, 600))

    const answer = answerQuestion(question, { kpi })
    const coachMsg: CoachMessage = {
      id: crypto.randomUUID(),
      role: 'coach',
      text: answer,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, coachMsg])
    setTyping(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 메시지 목록 */}
      <div className="space-y-4 min-h-[40vh]">
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* 질문 칩 — 유일한 입력 수단 */}
      <div className="sticky bottom-0 bg-gray-50 pt-3 pb-2">
        <CoachSuggestionChips onSelect={handleSend} disabled={typing} />
      </div>
    </div>
  )
}
