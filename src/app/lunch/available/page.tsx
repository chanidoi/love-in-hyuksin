'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Restaurant {
  id: string
  name: string
  category: string
  location: string
  innovation_city: string
  is_outside: boolean
}

interface LunchAvailability {
  id: string
  user_id: string
  available_date: string
  restaurant_ids: string[]
}

export default function LunchAvailablePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([])
  const [existingAvailability, setExistingAvailability] = useState<LunchAvailability | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadRestaurants()
      checkExistingAvailability()
      checkDeadline()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setLoading(false)
  }

  const getTomorrowDate = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getTomorrowDateDisplay = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  const checkDeadline = () => {
    const now = new Date()
    const hour = now.getHours()
    // 밤 10시(22시) 이후면 마감
    setIsDeadlinePassed(hour >= 22)
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

  const checkExistingAvailability = async () => {
    if (!user) return

    const tomorrow = getTomorrowDate()

    const { data, error } = await supabase
      .from('lunch_availability')
      .select('id, user_id, available_date, restaurant_ids')
      .eq('user_id', user.id)
      .eq('available_date', tomorrow)
      .maybeSingle()

    if (error) {
      console.error('Error checking availability:', error)
    } else if (data) {
      setExistingAvailability(data as LunchAvailability)
      setSelectedRestaurantIds(data.restaurant_ids || [])
    }
  }

  const handleRestaurantToggle = (restaurantId: string) => {
    if (selectedRestaurantIds.includes(restaurantId)) {
      setSelectedRestaurantIds(selectedRestaurantIds.filter(id => id !== restaurantId))
    } else {
      setSelectedRestaurantIds([...selectedRestaurantIds, restaurantId])
    }
  }

  const handleSubmit = async () => {
    if (selectedRestaurantIds.length === 0) {
      setMessage('최소 1개 이상의 식당을 선택해주세요.')
      return
    }

    if (!user) return

    setSubmitting(true)
    setMessage('')

    const tomorrow = getTomorrowDate()

    if (existingAvailability) {
      // 업데이트
      const { error } = await supabase
        .from('lunch_availability')
        .update({
          restaurant_ids: selectedRestaurantIds,
        })
        .eq('id', existingAvailability.id)

      if (error) {
        setMessage('오류: ' + error.message)
        setSubmitting(false)
      } else {
        setMessage('등록이 수정되었습니다!')
        setSubmitting(false)
        checkExistingAvailability()
      }
    } else {
      // 새로 등록
      const { error } = await supabase
        .from('lunch_availability')
        .insert({
          user_id: user.id,
          available_date: tomorrow,
          restaurant_ids: selectedRestaurantIds,
        })

      if (error) {
        setMessage('오류: ' + error.message)
        setSubmitting(false)
      } else {
        setMessage('등록 완료!')
        setSubmitting(false)
        checkExistingAvailability()
      }
    }
  }

  const handleCancel = async () => {
    if (!existingAvailability) return

    if (!confirm('정말 등록을 취소하시겠습니까?')) {
      return
    }

    const { error } = await supabase
      .from('lunch_availability')
      .delete()
      .eq('id', existingAvailability.id)

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('등록이 취소되었습니다.')
      setExistingAvailability(null)
      setSelectedRestaurantIds([])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-pink-500 mb-2">내일 점심 등록</h1>
          <p className="text-gray-600 mb-6">
            내일 점심 가능하시면 등록해주세요! (밤 10시까지)
          </p>

          {/* 내일 날짜 표시 */}
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
            <p className="text-lg font-semibold text-pink-600">
              {getTomorrowDateDisplay()}
            </p>
          </div>

          {/* 마감 안내 */}
          {isDeadlinePassed && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 font-semibold">등록 마감되었습니다</p>
              <p className="text-sm text-red-500 mt-1">밤 10시 이후에는 등록할 수 없습니다.</p>
            </div>
          )}

          {/* 이미 등록한 경우 */}
          {existingAvailability && !isDeadlinePassed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-600 font-semibold">등록 완료!</p>
              <button
                onClick={handleCancel}
                className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
              >
                등록 취소하기
              </button>
            </div>
          )}

          {/* 식당 선택 */}
          {!isDeadlinePassed && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">식당 선택</h2>
              {restaurants.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                  등록된 식당이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {restaurants.map((restaurant) => (
                    <label
                      key={restaurant.id}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-pink-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRestaurantIds.includes(restaurant.id)}
                        onChange={() => handleRestaurantToggle(restaurant.id)}
                        disabled={isDeadlinePassed}
                        className="w-5 h-5 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {restaurant.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {restaurant.category} • {restaurant.location}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 메시지 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg text-center ${
              message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          {/* 등록 버튼 */}
          {!isDeadlinePassed && (
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedRestaurantIds.length === 0}
              className="w-full bg-pink-500 text-white p-4 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium text-lg transition-colors"
            >
              {submitting ? '등록 중...' : existingAvailability ? '수정하기' : '등록하기'}
            </button>
          )}

          {/* 돌아가기 링크 */}
          <div className="mt-6 text-center">
            <Link
              href="/lunch"
              className="text-pink-500 hover:text-pink-600 underline"
            >
              점심 현황으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

