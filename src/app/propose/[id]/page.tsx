'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

interface Profile {
  id: string
  nickname: string
  gender: string
  birth_year: string
  organization: string
  innovation_city: string
  avatar_url: string | null
}

interface Restaurant {
  id: string
  name: string
  category: string
  location: string
  innovation_city: string
  is_outside: boolean
}

interface Menu {
  id: string
  restaurant_id: string
  name: string
  price: number
  description: string | null
  is_available: boolean
}

export default function ProposePage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [proposedDate, setProposedDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [menus, setMenus] = useState<Menu[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadProfile(params.id as string)
      checkPendingRequest(params.id as string)
      loadRestaurants()
    }
  }, [user, params.id])

  useEffect(() => {
    if (selectedRestaurantId) {
      loadMenus(selectedRestaurantId)
    } else {
      setMenus([])
      setSelectedMenuId('')
    }
  }, [selectedRestaurantId])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
  }

  const loadProfile = async (profileId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, gender, birth_year, organization, innovation_city, avatar_url')
      .eq('id', profileId)
      .single()

    if (error) {
      console.error('Error loading profile:', error)
      setLoading(false)
    } else {
      setProfile(data)
      setLoading(false)
      // 내일 날짜를 기본값으로 설정
      setProposedDate(getTomorrowDate())
    }
  }

  const checkPendingRequest = async (receiverId: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from('lunch_requests')
      .select('*')
      .eq('requester_id', user.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle()

    if (!error && data) {
      setHasPendingRequest(true)
    }
  }

  const loadRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, category, location, innovation_city, is_outside')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading restaurants:', error)
    } else {
      setRestaurants((data || []) as Restaurant[])
    }
  }

  const loadMenus = async (restaurantId: string) => {
    const { data, error } = await supabase
      .from('menus')
      .select('id, restaurant_id, name, price, description, is_available')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading menus:', error)
    } else {
      setMenus((data || []) as Menu[])
    }
  }

  const getTomorrowDate = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const calculateAge = (birthYear: string): number => {
    if (!birthYear) return 0
    const currentYear = new Date().getFullYear()
    return currentYear - parseInt(birthYear)
  }

  const handleSubmitProposal = async () => {
    if (!user || !params.id || !proposedDate) {
      setMessage('날짜를 선택해주세요.')
      return
    }

    if (!selectedRestaurantId) {
      setMessage('식당을 선택해주세요.')
      return
    }

    if (!selectedMenuId) {
      setMessage('메뉴를 선택해주세요.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const { error } = await supabase
      .from('lunch_requests')
      .insert({
        requester_id: user.id,
        receiver_id: params.id as string,
        proposed_date: proposedDate,
        restaurant_id: selectedRestaurantId,
        requester_menu_id: selectedMenuId,
        status: 'pending',
      })

    if (error) {
      setMessage('오류: ' + error.message)
      setSubmitting(false)
    } else {
      setMessage('점심 제안을 보냈습니다!')
      setSubmitting(false)
      setTimeout(() => {
        router.push(`/explore/${params.id}`)
      }, 2000)
    }
  }

  const selectedMenu = menus.find(menu => menu.id === selectedMenuId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <div className="text-center">
          <p className="text-red-500 mb-4">회원 정보를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.back()}
            className="text-[#F472B6] hover:underline"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (hasPendingRequest) {
    return (
      <div className="min-h-screen bg-[#FDF2F4] pb-20">
        <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 className="text-xl font-bold">점심 제안하기</h1>
          </div>
        </div>
        <div className="p-5">
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-lg mb-4">이미 제안을 보낸 상대입니다</p>
            <button
              onClick={() => router.back()}
              className="bg-[#F472B6] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#F472B6]/90 transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF2F4] pb-20">
      {/* 상단 헤더 */}
      <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold">점심 제안하기</h1>
        </div>
      </div>
      
      {/* 내용 */}
      <div className="p-5">
        {/* 상대방 프로필 간단 표시 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.nickname}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold">
                {profile.nickname?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-900">{profile.nickname || '닉네임 없음'}</h2>
              {profile.birth_year && (
                <p className="text-sm text-gray-500">{calculateAge(profile.birth_year)}세</p>
              )}
            </div>
          </div>
        </div>
        
        {/* 제안 폼 (흰색 카드) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              점심 날짜 선택
            </label>
            <input
              type="date"
              value={proposedDate}
              min={getTomorrowDate()}
              onChange={(e) => setProposedDate(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              식당 선택
            </label>
            {restaurants.length === 0 ? (
              <div className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-center">
                등록된 식당이 없습니다
              </div>
            ) : (
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
              >
                <option value="">식당을 선택하세요</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name} ({restaurant.category})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedRestaurantId && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메뉴 선택
              </label>
              <p className="text-xs text-gray-500 mb-2">내가 먹을 메뉴를 선택하세요</p>
              {menus.length === 0 ? (
                <div className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-center">
                  등록된 메뉴가 없습니다
                </div>
              ) : (
                <select
                  value={selectedMenuId}
                  onChange={(e) => setSelectedMenuId(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
                >
                  <option value="">메뉴를 선택하세요</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name} - ₩{menu.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {selectedMenu && (
            <div className="mb-4 p-3 bg-[#FDF2F4] border border-pink-200 rounded-xl">
              <p className="text-sm font-medium text-[#F472B6]">
                선택한 메뉴: {selectedMenu.name} (₩{selectedMenu.price.toLocaleString()})
              </p>
            </div>
          )}

          {message && (
            <p className={`mb-4 text-center ${
              message.includes('오류') ? 'text-red-500' : 'text-green-500'
            }`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSubmitProposal}
            disabled={submitting || !proposedDate || !selectedRestaurantId || !selectedMenuId}
            className="w-full bg-[#F472B6] text-white p-3 rounded-xl hover:bg-[#F472B6]/90 disabled:bg-gray-400 font-medium transition-colors"
          >
            {submitting ? '제안 중...' : '제안하기'}
          </button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  )
}

