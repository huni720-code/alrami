import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { CoachMessage } from '../../types/coach'
import type { DashboardKpi } from '../../lib/api'
import { answerQuestion } from '../../services/coachService'
import CoachSuggestionChips from './CoachSuggestionChips'

const WELCOME: CoachMessage = {
  id: 'welcome',
  role: 'coach',
  text: '안녕하세요! 알라미 절약 코치입니다.\n현재 소비와 카드 실적을 분석해서 절약 조언을 드려요.\n무엇이 궁금하신가요?',
  timestamp: new Date().toISOString(),
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function Bubble({ msg }: { msg: CoachMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 코치 아바타 */}
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
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const handleSend = async (text: string) => {
    const question = text.trim()
    if (!question || typing) return

    const userMsg: CoachMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setTyping(true)

    // 짧은 딜레이로 타이핑 효과 (규칙 기반이지만 응답감을 위해)
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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 질문 제안 칩 */}
      <CoachSuggestionChips onSelect={handleSend} />

      {/* 메시지 목록 */}
      <div className="space-y-4 min-h-[40vh]">
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="sticky bottom-0 bg-gray-50 pt-2 pb-1">
        <div className="flex gap-2 items-end bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm focus-within:border-[#10b981] transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="메시지를 입력하세요..."
            disabled={typing}
            className="flex-1 text-[14px] text-gray-800 placeholder:text-gray-300 bg-transparent outline-none resize-none leading-relaxed max-h-28 overflow-y-auto disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || typing}
            className="shrink-0 w-8 h-8 rounded-xl bg-[#10b981] disabled:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() && !typing ? 'white' : '#d1d5db'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-300 text-center mt-1.5">
          Enter로 전송 · Shift+Enter 줄바꿈
        </p>
      </div>
    </div>
  )
}
