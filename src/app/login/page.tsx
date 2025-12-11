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
                <span className="text-4xl">💕</span>
              </div>
            </div>
          </div>
        </div>

        {/* 슬로건 */}
        <div className="text-center mb-8">
          <p className="text-2xl font-medium mb-2">
            <span className="text-purple-600">다시 만나서 반가워요</span>
          </p>
          <p className="text-xl font-medium text-gray-900">
            로그인하고 인연을 이어가세요
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-card p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                placeholder="example@lh.or.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all text-gray-700 placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호 입력"
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
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl hover:bg-gray-800 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? '처리 중...' : '로그인'}
            </button>
          </div>
        </div>

        {/* 하단 링크 */}
        <p className="text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-purple-600 hover:text-purple-700 font-medium underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
