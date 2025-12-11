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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white py-12">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-pink-500 hover:text-pink-600 transition-colors">
              러인혁
            </h1>
          </Link>
          <div className="text-4xl mt-2">💕</div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">로그인</h2>
        <p className="text-gray-600 text-center mb-6">혁신도시 공공기관 남녀의 설레는 만남</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
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
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all text-gray-700 placeholder-gray-400"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 transition-colors transform hover:scale-[1.02] active:scale-[0.98] font-medium"
          >
            {loading ? '처리 중...' : '로그인'}
          </button>

          {message && (
            <p className={`text-center ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}

          <p className="text-center text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <a href="/signup" className="text-pink-500 hover:underline">회원가입</a>
          </p>
        </div>
      </div>
    </div>
  )
}
