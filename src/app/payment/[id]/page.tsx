'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface LunchRequest {
  id: string
  requester_id: string
  receiver_id: string
  proposed_date: string
  restaurant_id: string
  requester_menu_id: string | null
  receiver_menu_id: string | null
  requester?: {
    nickname: string
  }
  receiver?: {
    nickname: string
  }
}

interface Menu {
  id: string
  name: string
  price: number
}

interface Restaurant {
  id: string
  name: string
}

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lunchRequest, setLunchRequest] = useState<LunchRequest | null>(null)
  const [myMenu, setMyMenu] = useState<Menu | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'kakao' | 'transfer'>('kakao')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadLunchRequest(params.id as string)
    }
  }, [user, params.id])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setLoading(false)
  }

  const loadLunchRequest = async (requestId: string) => {
    // lunch_request 정보 불러오기
    const { data: requestData, error: requestError } = await supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, restaurant_id, requester_menu_id, receiver_menu_id')
      .eq('id', requestId)
      .single()

    if (requestError || !requestData) {
      setMessage('점심 요청 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    // requester와 receiver 프로필 불러오기
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', requestData.requester_id)
      .single()

    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', requestData.receiver_id)
      .single()

    const requestWithProfiles: LunchRequest = {
      ...requestData,
      requester: requesterProfile ? { nickname: requesterProfile.nickname } : undefined,
      receiver: receiverProfile ? { nickname: receiverProfile.nickname } : undefined,
    }

    setLunchRequest(requestWithProfiles)

    // 식당 정보 불러오기
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', requestData.restaurant_id)
      .single()

    if (restaurantData) {
      setRestaurant(restaurantData)
    }

    // 내 메뉴 정보 불러오기
    const isRequester = requestData.requester_id === user?.id
    const menuId = isRequester ? requestData.requester_menu_id : requestData.receiver_menu_id

    if (menuId) {
      const { data: menuData } = await supabase
        .from('menus')
        .select('id, name, price')
        .eq('id', menuId)
        .single()

      if (menuData) {
        setMyMenu(menuData)
      }
    }

    setLoading(false)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  const getOtherPersonNickname = (): string => {
    if (!lunchRequest || !user) return ''
    
    if (lunchRequest.requester_id === user.id) {
      return lunchRequest.receiver?.nickname || '알 수 없음'
    } else {
      return lunchRequest.requester?.nickname || '알 수 없음'
    }
  }

  const calculateKakaoPrice = (): number => {
    if (!myMenu) return 0
    return Math.round(myMenu.price * 1.03)
  }

  const handleKakaoPayment = () => {
    alert('카카오페이 연동 준비 중입니다')
  }

  const handleTransferSubmit = async () => {
    if (!user || !lunchRequest || !myMenu) return

    setSubmitting(true)
    setMessage('')

    const { error } = await supabase
      .from('lunch_payments')
      .insert({
        lunch_request_id: lunchRequest.id,
        user_id: user.id,
        amount: myMenu.price,
        payment_method: 'transfer',
        status: 'pending',
      })

    if (error) {
      setMessage('오류: ' + error.message)
      setSubmitting(false)
    } else {
      setMessage('입금 확인 요청이 완료되었습니다')
      setTimeout(() => {
        router.push('/lunch')
      }, 1500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  if (!lunchRequest || !myMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-4">{message || '점심 요청 정보를 찾을 수 없습니다.'}</p>
          <Link
            href="/lunch"
            className="text-pink-500 hover:underline"
          >
            점심 현황으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-pink-500 mb-6">점심 결제</h1>

          {/* 매칭 정보 */}
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-pink-600 mb-3">매칭 정보</h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <span className="font-medium">상대방:</span> {getOtherPersonNickname()}
              </p>
              <p>
                <span className="font-medium">날짜:</span> {formatDate(lunchRequest.proposed_date)}
              </p>
              {restaurant && (
                <p>
                  <span className="font-medium">식당:</span> {restaurant.name}
                </p>
              )}
            </div>
          </div>

          {/* 내 메뉴 정보 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">내 메뉴</h2>
            <p className="text-xl text-gray-700">
              {myMenu.name} (₩{myMenu.price.toLocaleString()})
            </p>
          </div>

          {/* 결제 방법 선택 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">결제 방법 선택</h2>
            <div className="space-y-4">
              {/* 카카오페이 */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="kakao"
                  checked={paymentMethod === 'kakao'}
                  onChange={() => setPaymentMethod('kakao')}
                  className="mt-1 w-5 h-5 text-pink-500 border-gray-300 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800 mb-1">카카오페이</div>
                  <div className="text-sm text-gray-600">
                    메뉴가격 + 수수료 3%: ₩{calculateKakaoPrice().toLocaleString()}
                  </div>
                </div>
              </label>

              {/* 계좌이체 */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={() => setPaymentMethod('transfer')}
                  className="mt-1 w-5 h-5 text-pink-500 border-gray-300 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800 mb-1">계좌이체</div>
                  <div className="text-sm text-gray-600">
                    메뉴가격: ₩{myMenu.price.toLocaleString()}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 카카오페이 결제 버튼 */}
          {paymentMethod === 'kakao' && (
            <div className="mb-6">
              <button
                onClick={handleKakaoPayment}
                className="w-full bg-yellow-400 text-gray-800 p-4 rounded-lg hover:bg-yellow-500 font-medium text-lg transition-colors"
              >
                카카오페이로 결제하기
              </button>
            </div>
          )}

          {/* 계좌이체 정보 */}
          {paymentMethod === 'transfer' && (
            <div className="mb-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-3">입금 계좌 정보</h3>
                <div className="space-y-2 text-gray-700">
                  <p>
                    <span className="font-medium">은행:</span> 국민은행
                  </p>
                  <p>
                    <span className="font-medium">계좌번호:</span> 123-456-789012
                  </p>
                  <p>
                    <span className="font-medium">예금주:</span> 러인혁
                  </p>
                  <p className="text-sm text-blue-600 mt-3">
                    ⚠️ 입금자명은 본인 닉네임으로 입금해주세요
                  </p>
                </div>
              </div>

              {message && (
                <div className={`mb-4 p-3 rounded-lg text-center ${
                  message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              <button
                onClick={handleTransferSubmit}
                disabled={submitting}
                className="w-full bg-pink-500 text-white p-4 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium text-lg transition-colors"
              >
                {submitting ? '처리 중...' : '입금 완료 신청'}
              </button>
            </div>
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

