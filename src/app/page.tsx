'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  nickname: string
  gender: string
  birth_year: string
  organization: string
  innovation_city: string
  avatar_url: string | null
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [todayLunch, setTodayLunch] = useState<any>(null)
  const [newProposals, setNewProposals] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [recommendedProfiles, setRecommendedProfiles] = useState<Profile[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadProfile()
      loadTodayLunch()
      loadNewProposals()
      loadUnreadMessages()
      loadRecommendedProfiles()
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
      .select('nickname, gender, birth_year, organization, innovation_city')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data as Profile)
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

    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (chatRoomsError || !chatRooms || chatRooms.length === 0) {
      setUnreadMessages(0)
      return
    }

    const chatRoomIds = chatRooms.map(room => room.id)

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

  const loadRecommendedProfiles = async () => {
    if (!user || !profile) return

    // 현재 사용자와 반대 성별의 프로필 추천 (최대 10개)
    const oppositeGender = profile.gender === 'male' ? 'female' : 'male'
    
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, gender, birth_year, organization, innovation_city, avatar_url')
      .eq('gender', oppositeGender)
      .neq('id', user.id)
      .not('nickname', 'is', null)
      .limit(10)

    if (data) {
      setRecommendedProfiles(data as Profile[])
    }
  }

  const calculateAge = (birthYear: string): number => {
    if (!birthYear) return 0
    const currentYear = new Date().getFullYear()
    return currentYear - parseInt(birthYear)
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
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  // 로그인 안 된 상태
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDF2F4] flex items-center justify-center pb-24">
        <div className="max-w-md mx-auto px-4 w-full text-center">
          {/* 로고 */}
          <div className="mb-8">
            <div className="text-6xl mb-4">💕</div>
            <h1 className="text-4xl font-bold text-[#F472B6] mb-2">러인혁</h1>
            <p className="text-lg text-gray-600">혁신도시 공공기관의 설레는 만남</p>
          </div>

          {/* 버튼 */}
          <div className="flex flex-col gap-4 max-w-sm mx-auto">
            <Link
              href="/login"
              className="w-full bg-[#F472B6] text-white p-4 rounded-2xl hover:opacity-90 font-medium text-lg text-center shadow-card transition-opacity"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="w-full bg-white text-[#F472B6] border-2 border-[#F472B6] p-4 rounded-2xl hover:bg-[#FDF2F4] font-medium text-lg text-center shadow-card transition-colors"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 로그인 된 상태
  return (
    <div className="min-h-screen bg-[#FDF2F4] py-6 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* 상단 인사말 + 프로필 */}
        <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">안녕하세요</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.nickname || '회원'}님 💕
              </h2>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F472B6] to-[#ec4899] flex items-center justify-center text-white text-2xl font-bold">
              {profile?.nickname?.charAt(0) || 'U'}
            </div>
          </div>
        </div>

        {/* 알림 카드 */}
        {(newProposals > 0 || unreadMessages > 0) && (
          <div className="mb-4 space-y-2">
            {newProposals > 0 && (
              <Link
                href="/lunch"
                className="block bg-gradient-notification text-white rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xl">🍽️</span>
                    </div>
                    <div>
                      <p className="font-semibold">새로운 점심 제안</p>
                      <p className="text-sm text-white/90">{newProposals}건의 제안이 있습니다</p>
                    </div>
                  </div>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )}
            {unreadMessages > 0 && (
              <Link
                href="/chat"
                className="block bg-gradient-notification text-white rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xl">💬</span>
                    </div>
                    <div>
                      <p className="font-semibold">읽지 않은 메시지</p>
                      <p className="text-sm text-white/90">{unreadMessages}개의 메시지가 있습니다</p>
                    </div>
                  </div>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* 오늘의 추천 */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3 px-1">오늘의 추천</h3>
          {recommendedProfiles.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card p-8 text-center">
              <p className="text-gray-500">아직 추천 프로필이 없습니다</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {recommendedProfiles.map((recProfile) => (
                <Link
                  key={recProfile.id}
                  href={`/explore/${recProfile.id}`}
                  className="w-[140px] flex-shrink-0 bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* 프로필 이미지 */}
                  <div className="relative h-[180px] rounded-2xl overflow-hidden">
                    {recProfile.avatar_url ? (
                      <img
                        src={recProfile.avatar_url}
                        alt={recProfile.nickname}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4='
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
                        <span className="text-4xl text-white font-bold">
                          {recProfile.nickname?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    {/* 그라데이션 오버레이 */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent"></div>
                    {/* 하단 텍스트 */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-semibold text-sm mb-1 truncate">
                        {recProfile.nickname}
                      </p>
                      <div className="flex items-center gap-2 text-white text-xs">
                        {recProfile.birth_year && (
                          <span>{calculateAge(recProfile.birth_year)}세</span>
                        )}
                        {recProfile.organization && (
                          <span className="truncate">{recProfile.organization}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 바로가기 */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/explore"
            className="bg-pink-50 rounded-2xl shadow-card p-4 hover:shadow-lg transition-shadow flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🔍</span>
            </div>
            <p className="font-semibold text-gray-900">회원 탐색</p>
          </Link>
          <Link
            href="/lunch"
            className="bg-orange-50 rounded-2xl shadow-card p-4 hover:shadow-lg transition-shadow flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🍽️</span>
            </div>
            <p className="font-semibold text-gray-900">점심 현황</p>
          </Link>
          <Link
            href="/chat"
            className="bg-purple-50 rounded-2xl shadow-card p-4 hover:shadow-lg transition-shadow flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💬</span>
            </div>
            <p className="font-semibold text-gray-900">채팅</p>
          </Link>
          <Link
            href="/profile"
            className="bg-blue-50 rounded-2xl shadow-card p-4 hover:shadow-lg transition-shadow flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">👤</span>
            </div>
            <p className="font-semibold text-gray-900">프로필</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
