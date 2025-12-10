'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [todayLunch, setTodayLunch] = useState<any>(null)
  const [newProposals, setNewProposals] = useState(0)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadProfile()
      loadTodayLunch()
      loadNewProposals()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  const loadProfile = async () => {
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
    }
  }

  const loadTodayLunch = async () => {
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('lunch_requests')
      .select(`
        id,
        proposed_date,
        requester_id,
        receiver_id,
        requester:profiles!lunch_requests_requester_id_fkey(nickname),
        receiver:profiles!lunch_requests_receiver_id_fkey(nickname)
      `)
      .eq('status', 'accepted')
      .eq('proposed_date', today)
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .maybeSingle()

    if (data) {
      setTodayLunch(data)
    }
  }

  const loadNewProposals = async () => {
    if (!user) return

    const { data } = await supabase
      .from('lunch_requests')
      .select('id')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')

    if (data) {
      setNewProposals(data.length)
    }
  }

  const getOtherPersonNickname = (lunch: any): string => {
    if (lunch.requester_id === user?.id) {
      return lunch.receiver?.nickname || '알 수 없음'
    } else {
      return lunch.requester?.nickname || '알 수 없음'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  // 로그인 안 된 상태
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full mx-4 text-center">
          <h1 className="text-5xl font-bold text-pink-500 mb-4">
            러인혁
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            혁신도시 공공기관 남녀의 설레는 만남
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="w-full bg-pink-500 text-white p-4 rounded-lg hover:bg-pink-600 font-medium text-lg"
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className="w-full bg-white border-2 border-pink-500 text-pink-500 p-4 rounded-lg hover:bg-pink-50 font-medium text-lg"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 로그인 된 상태
  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-pink-500 mb-2">
            안녕하세요, {profile?.nickname || '회원'}님!
          </h2>
          <p className="text-gray-600">오늘도 좋은 만남이 있기를 바랍니다 💕</p>
        </div>

        {/* 오늘의 점심 약속 */}
        {todayLunch && (
          <div className="bg-gradient-to-r from-pink-100 to-pink-50 border-2 border-pink-300 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🍽️</span>
              <h3 className="text-xl font-bold text-pink-600">오늘의 점심 약속</h3>
            </div>
            <p className="text-gray-700 text-lg">
              <span className="font-semibold">{getOtherPersonNickname(todayLunch)}</span>님과 점심 약속이 있습니다!
            </p>
          </div>
        )}

        {/* 새로운 제안 알림 */}
        {newProposals > 0 && (
          <Link
            href="/lunch"
            className="block bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-md p-6 mb-6 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔔</span>
              <h3 className="text-xl font-bold text-yellow-700">새로운 점심 제안</h3>
            </div>
            <p className="text-gray-700">
              <span className="font-semibold text-yellow-700">{newProposals}개</span>의 새로운 점심 제안이 있습니다.
            </p>
            <p className="text-sm text-gray-600 mt-2">클릭하여 확인하기 →</p>
          </Link>
        )}

        {/* 회원 탐색하기 버튼 */}
        <Link
          href="/explore"
          className="block w-full bg-pink-500 text-white p-4 rounded-lg hover:bg-pink-600 font-medium text-lg text-center shadow-md"
        >
          회원 탐색하기
        </Link>
      </div>
    </div>
  )
}
