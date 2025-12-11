'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white py-12">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-pink-500 hover:text-pink-600 transition-colors">
              러인혁
            </h1>
          </Link>
          <div className="text-4xl mt-2">🎉</div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">회원가입</h2>
        <p className="text-gray-600 text-center mb-6">혁신도시 공공기관 남녀의 설레는 만남</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일 (공공기관)</label>
            <input
              type="email"
              placeholder="example@lh.or.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all text-gray-700 placeholder-gray-400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              placeholder="6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all text-gray-700 placeholder-gray-400"
            />
          </div>

          <button
            type="button"
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 transition-colors transform hover:scale-[1.02] active:scale-[0.98] font-medium"
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>

          {message && (
            <p className={`text-center ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}

          <p className="text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <a href="/login" className="text-pink-500 hover:underline">로그인</a>
          </p>
        </div>
      </div>
    </div>
  )
}