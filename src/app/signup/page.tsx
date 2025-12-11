'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ALLOWED_DOMAINS = [
  'kalis.or.kr',
  'lh.or.kr'
]

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      setMessage('오류: 모든 항목을 입력해주세요.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('오류: 비밀번호가 일치하지 않습니다.')
      return
    }

    // 이메일 도메인 검증
    const emailDomain = email.split('@')[1]
    if (!emailDomain || !ALLOWED_DOMAINS.includes(emailDomain)) {
      setMessage('오류: 현재 허용된 공공기관 이메일만 가입 가능합니다')
      return
    }

    if (password.length < 6) {
      setMessage('오류: 비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('회원가입 성공! 로그인 페이지로 이동하세요.')
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSignup()
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center pb-24"
      style={{
        background: 'linear-gradient(to bottom, #F9A8D4, #FBCFE8, #FCE7F3)'
      }}
    >
      <div className="max-w-md mx-auto px-4 w-full">
        {/* 상단 로고 */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg">
            <span className="text-4xl">💕</span>
          </div>
        </div>

        {/* 제목 */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-white mb-2">회원가입</h1>
          <p className="text-white/80">혁신도시 공공기관 직원만 가입 가능합니다</p>
        </div>

        {/* 입력 폼 */}
        <div className="mt-8 space-y-4">
          <div>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/90 rounded-xl py-4 px-5 placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            />
            <p className="text-xs text-white/80 mt-2 ml-1">
              ※ 공공기관 이메일만 가입 가능합니다 (예: @lh.or.kr, @kalis.or.kr)
            </p>
          </div>
          
          <div>
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/90 rounded-xl py-4 px-5 placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/90 rounded-xl py-4 px-5 placeholder-gray-400 text-gray-700 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            />
          </div>

          {message && (
            <p className={`text-center ${message.includes('오류') ? 'text-red-100' : 'text-green-100'}`}>
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-white text-[#F472B6] rounded-full py-4 font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </div>

        {/* 하단 링크 */}
        <p className="text-center text-white mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold underline hover:opacity-80">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
