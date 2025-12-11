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
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadProfile()
      loadTodayLunch()
      loadNewProposals()
      loadUnreadMessages()
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

  const loadUnreadMessages = async () => {
    if (!user) return

    // 현재 사용자가 참여한 채팅방 목록 조회
    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (chatRoomsError || !chatRooms || chatRooms.length === 0) {
      setUnreadMessages(0)
      return
    }

    const chatRoomIds = chatRooms.map(room => room.id)

    // 읽지 않은 메시지 개수 조회
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .in('chat_room_id', chatRoomIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    if (!messagesError && messages) {
      setUnreadMessages(messages.length)
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
      <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-white flex items-center justify-center pb-24">
        <div className="max-w-md mx-auto px-4 w-full">
          {/* 상단 원형 프로필 이미지 자리 */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-purple-400 bg-white flex items-center justify-center">
              <span className="text-4xl">💕</span>
            </div>
          </div>

          {/* 중앙 원형 디자인 */}
          <div className="flex justify-center mb-8">
            <div className="relative w-64 h-64">
              {/* 보라색 그라데이션 링 */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 p-1">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-purple-100 via-pink-50 to-white"></div>
              </div>
            </div>
          </div>

          {/* 슬로건 */}
          <div className="text-center mb-12">
            <p className="text-2xl font-medium mb-2">
              <span className="text-purple-600">러인혁에서</span>
            </p>
            <p className="text-2xl font-medium text-gray-900">
              당신의 인연을 찾아보세요
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex flex-col gap-4 max-w-sm mx-auto">
            <Link
              href="/login"
              className="w-full bg-gray-900 text-white p-4 rounded-2xl hover:bg-gray-800 font-medium text-lg text-center shadow-soft transition-colors"
            >
              로그인
            </Link>
            <div className="text-center">
              <Link
                href="/signup"
                className="text-purple-600 hover:text-purple-700 font-medium underline"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 로그인 된 상태
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-white py-8 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* 환영 메시지 */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">
            안녕하세요, {profile?.nickname || '회원'}님! 💕
          </h2>
          <p className="text-gray-600">오늘도 좋은 만남이 있기를 바랍니다</p>
        </div>

        {/* 새 점심 제안 알림 배너 */}
        {newProposals > 0 && (
          <div className="bg-pink-100 border border-pink-300 rounded-2xl p-4 mb-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-gray-800 font-medium">
                🍽️ 새로운 점심 제안이 {newProposals}건 있습니다!
              </p>
              <Link
                href="/lunch"
                className="bg-pink-500 text-white px-4 py-2 rounded-xl hover:bg-pink-600 font-medium transition-colors"
              >
                확인하기
              </Link>
            </div>
          </div>
        )}

        {/* 읽지 않은 메시지 알림 배너 */}
        {unreadMessages > 0 && (
          <div className="bg-blue-100 border border-blue-300 rounded-2xl p-4 mb-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-gray-800 font-medium">
                💬 읽지 않은 메시지가 {unreadMessages}건 있습니다!
              </p>
              <Link
                href="/chat"
                className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 font-medium transition-colors"
              >
                확인하기
              </Link>
            </div>
          </div>
        )}

        {/* 오늘의 점심 약속 */}
        {todayLunch && (
          <div className="bg-gradient-to-r from-pink-100 to-pink-50 border-2 border-pink-300 rounded-2xl shadow-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🍽️</span>
              <h3 className="text-xl font-bold text-pink-600">오늘의 점심 약속</h3>
            </div>
            <p className="text-gray-700 text-lg">
              <span className="font-semibold">{getOtherPersonNickname(todayLunch)}</span>님과 점심 약속이 있습니다!
            </p>
          </div>
        )}

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Link
            href="/explore"
            className="bg-white rounded-2xl shadow-card p-4 text-center hover:shadow-soft transition-shadow"
          >
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-semibold text-gray-800 text-sm">회원 탐색</p>
          </Link>
          <Link
            href="/lunch"
            className="bg-white rounded-2xl shadow-card p-4 text-center hover:shadow-soft transition-shadow"
          >
            <div className="text-3xl mb-2">🍽️</div>
            <p className="font-semibold text-gray-800 text-sm">점심 현황</p>
          </Link>
          <Link
            href="/chat"
            className="bg-white rounded-2xl shadow-card p-4 text-center hover:shadow-soft transition-shadow"
          >
            <div className="text-3xl mb-2">💬</div>
            <p className="font-semibold text-gray-800 text-sm">채팅</p>
          </Link>
        </div>

        {/* 회원 탐색하기 버튼 (큰 버튼) */}
        <Link
          href="/explore"
          className="block w-full bg-gradient-button text-white p-4 rounded-2xl hover:opacity-90 font-medium text-lg text-center shadow-card transition-opacity"
        >
          회원 탐색하기
        </Link>
      </div>
    </div>
  )
}
