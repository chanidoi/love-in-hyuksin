'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  nickname: string
  gender: string
  birth_year: string
  organization: string
  innovation_city: string
  job_level: string
  job_field: string
}

interface Review {
  id: string
  first_impression: string
  conversation: string
  manner: string
  punctuality: string
  overall: string
  created_at: string
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

export default function ProfileDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [proposedDate, setProposedDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
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
      loadReviews(params.id as string)
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
      .select('id, nickname, gender, birth_year, organization, innovation_city, job_level, job_field')
      .eq('id', profileId)
      .single()

    if (error) {
      console.error('Error loading profile:', error)
      setLoading(false)
    } else {
      setProfile(data)
      setLoading(false)
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

  const loadReviews = async (reviewedId: string) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, first_impression, conversation, manner, punctuality, overall, created_at')
      .eq('reviewed_id', reviewedId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error loading reviews:', error)
    } else {
      setReviews(data || [])
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

  const getGenderDisplay = (gender: string): string => {
    if (gender === 'male') return '남'
    if (gender === 'female') return '여'
    return gender
  }

  const handleLunchProposal = () => {
    if (hasPendingRequest) {
      setMessage('이미 제안을 보낸 상대입니다')
      return
    }
    setShowModal(true)
    setMessage('')
    // 내일 날짜를 기본값으로 설정
    setProposedDate(getTomorrowDate())
    setSelectedRestaurantId('')
    setSelectedMenuId('')
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setProposedDate('')
    setSelectedRestaurantId('')
    setSelectedMenuId('')
    setMessage('')
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
        menu_id: selectedMenuId,
        status: 'pending',
      })

    if (error) {
      setMessage('오류: ' + error.message)
      setSubmitting(false)
    } else {
      setMessage('점심 제안을 보냈습니다!')
      setHasPendingRequest(true)
      setSubmitting(false)
      setTimeout(() => {
        setShowModal(false)
        setMessage('')
        setSelectedRestaurantId('')
        setSelectedMenuId('')
      }, 2000)
    }
  }

  const selectedMenu = menus.find(menu => menu.id === selectedMenuId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-4">회원 정보를 찾을 수 없습니다.</p>
          <Link
            href="/explore"
            className="text-pink-500 hover:underline"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-pink-500 mb-4">
            {profile.nickname || '닉네임 없음'}
          </h1>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg text-gray-700">
              <span>{getGenderDisplay(profile.gender)}</span>
              {profile.birth_year && (
                <>
                  <span>•</span>
                  <span>{calculateAge(profile.birth_year)}세</span>
                </>
              )}
            </div>

            {profile.organization && (
              <div>
                <p className="text-sm text-gray-600 mb-1">소속기관</p>
                <p className="text-lg text-gray-800">{profile.organization}</p>
              </div>
            )}

            {profile.innovation_city && (
              <div>
                <p className="text-sm text-gray-600 mb-1">혁신도시</p>
                <p className="text-lg text-gray-800">{profile.innovation_city}</p>
              </div>
            )}

            {profile.job_level && (
              <div>
                <p className="text-sm text-gray-600 mb-1">직급</p>
                <p className="text-lg text-gray-800">{profile.job_level}</p>
              </div>
            )}

            {profile.job_field && (
              <div>
                <p className="text-sm text-gray-600 mb-1">업무분야</p>
                <p className="text-lg text-gray-800">{profile.job_field}</p>
              </div>
            )}
          </div>
        </div>

        {/* 받은 후기 섹션 */}
        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold text-pink-500 mb-4">받은 후기</h2>
          {reviews.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
              아직 받은 후기가 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-pink-50 border border-pink-200 rounded-lg p-4"
                >
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-pink-600">첫인상:</span>{' '}
                      <span className="text-gray-700">{review.first_impression}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-pink-600">대화:</span>{' '}
                      <span className="text-gray-700">{review.conversation}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-pink-600">매너:</span>{' '}
                      <span className="text-gray-700">{review.manner}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-pink-600">시간/약속:</span>{' '}
                      <span className="text-gray-700">{review.punctuality}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-pink-600">전체 느낌:</span>{' '}
                      <span className="text-gray-700">{review.overall}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 mt-8">
          <button
            onClick={handleLunchProposal}
            disabled={hasPendingRequest}
            className={`w-full p-3 rounded-lg font-medium ${
              hasPendingRequest
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-pink-500 text-white hover:bg-pink-600'
            }`}
          >
            {hasPendingRequest ? '이미 제안을 보낸 상대입니다' : '점심 제안하기'}
          </button>

          {message && !showModal && (
            <p className={`text-center ${
              message.includes('오류') || message.includes('이미')
                ? 'text-red-500'
                : 'text-green-500'
            }`}>
              {message}
            </p>
          )}

          <Link
            href="/explore"
            className="text-center text-pink-500 hover:underline"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-pink-500 mb-4">점심 제안하기</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                점심 날짜 선택
              </label>
              <input
                type="date"
                value={proposedDate}
                min={getTomorrowDate()}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                식당 선택
              </label>
              {restaurants.length === 0 ? (
                <div className="w-full p-3 border rounded-lg bg-gray-50 text-gray-500 text-center">
                  등록된 식당이 없습니다
                </div>
              ) : (
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
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
                {menus.length === 0 ? (
                  <div className="w-full p-3 border rounded-lg bg-gray-50 text-gray-500 text-center">
                    등록된 메뉴가 없습니다
                  </div>
                ) : (
                  <select
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
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
              <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                <p className="text-sm font-medium text-pink-600">
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

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSubmitProposal}
                disabled={submitting || !proposedDate || !selectedRestaurantId || !selectedMenuId}
                className="flex-1 bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium"
              >
                {submitting ? '제안 중...' : '제안하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

