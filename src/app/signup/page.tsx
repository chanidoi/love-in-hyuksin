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
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!email || !password) {
      setMessage('오류: 이메일과 비밀번호를 입력해주세요.')
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
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-white flex items-center justify-center pb-24">
      <div className="max-w-md mx-auto px-4 w-full">
        {/* 상단 작은 원형 아이콘 */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full border-3 border-purple-400 bg-white flex items-center justify-center">
            <span className="text-3xl">💕</span>
          </div>
        </div>

        {/* 중앙 큰 원형 디자인 */}
        <div className="flex justify-center mb-8">
          <div className="relative w-56 h-56">
            {/* 보라색 그라데이션 링 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 p-1">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-purple-100 via-pink-50 to-white flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">러인혁</span>
              </div>
            </div>
          </div>
        </div>

        {/* 슬로건 */}
        <div className="text-center mb-8">
          <p className="text-2xl font-medium mb-2">
            <span className="text-purple-600">환영합니다</span>
          </p>
          <p className="text-xl font-medium text-gray-900">
            새로운 인연을 시작하세요
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-card p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일 (공공기관)</label>
              <input
                type="email"
                placeholder="example@lh.or.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all text-gray-700 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ 공공기관 이메일만 가입 가능합니다 (예: @lh.or.kr, @kalis.or.kr)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all text-gray-700 placeholder-gray-400"
              />
            </div>

            {message && (
              <p className={`text-center ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl hover:bg-gray-800 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </div>
        </div>

        {/* 하단 링크 */}
        <p className="text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}