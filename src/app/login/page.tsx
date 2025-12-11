'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('오류: 이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('로그인 성공!')
      window.location.href = '/profile'
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin()
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
          <h1 className="text-2xl font-bold text-white mb-2">러인혁 로그인</h1>
          <p className="text-white/80">이메일과 비밀번호를 입력하세요</p>
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
          </div>
          
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-[#F472B6] rounded-full py-4 font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
          >
            {loading ? '처리 중...' : '로그인'}
          </button>
        </div>

        {/* 하단 링크 */}
        <p className="text-center text-white mt-6">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-semibold underline hover:opacity-80">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
