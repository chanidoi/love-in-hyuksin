'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LunchRequest {
  id: string
  requester_id: string
  receiver_id: string
  proposed_date: string
  status: string
  restaurant_id?: string
  requester_menu_id?: string
  receiver_menu_id?: string
  requester?: {
    nickname: string
    avatar_url: string | null
    birth_year: string | null
    organization: string | null
    innovation_city: string | null
  }
  receiver?: {
    nickname: string
    avatar_url: string | null
    birth_year: string | null
    organization: string | null
    innovation_city: string | null
  }
  restaurant?: {
    name: string
  }
  requester_menu?: {
    name: string
    price: number
  }
  receiver_menu?: {
    name: string
    price: number
  }
  hasReviewed?: boolean
  canChat?: boolean
}

interface Menu {
  id: string
  restaurant_id: string
  name: string
  price: number
}

export default function LunchPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
  const [receivedRequests, setReceivedRequests] = useState<LunchRequest[]>([])
  const [sentRequests, setSentRequests] = useState<LunchRequest[]>([])
  const [message, setMessage] = useState('')
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LunchRequest | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [paidRequests, setPaidRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadRequests()
      loadPaymentStatus()
    }
  }, [user, activeTab])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setLoading(false)
  }

  const loadRequests = async () => {
    if (!user) return

    // 현재 사용자 프로필 로드 (소속기관 확인용)
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('organization')
      .eq('id', user.id)
      .single()

    // 받은 제안
    const { data: receivedRequestsData } = await supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, status, restaurant_id, requester_menu_id, receiver_menu_id')
      .eq('receiver_id', user.id)
      .in('status', ['pending', 'accepted', 'rejected', 'completed'])
      .order('proposed_date', { ascending: false })

    if (receivedRequestsData && receivedRequestsData.length > 0) {
      const requesterIds = receivedRequestsData.map(req => req.requester_id)
      const restaurantIds = receivedRequestsData
        .map(req => req.restaurant_id)
        .filter((id): id is string => id !== null && id !== undefined)
      
      const { data: requesterProfiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, birth_year, organization, innovation_city')
        .in('id', requesterIds)

      const { data: restaurants } = restaurantIds.length > 0 ? await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', restaurantIds) : { data: [] }

      const { data: allMenus } = await supabase
        .from('menus')
        .select('id, restaurant_id, name, price')

      const mergedReceived = receivedRequestsData
        .map(request => {
          const requesterProfile = requesterProfiles?.find(p => p.id === request.requester_id)
          const restaurant = restaurants?.find(r => r.id === request.restaurant_id)
          const requesterMenu = allMenus?.find(m => m.id === request.requester_menu_id)
          const receiverMenu = allMenus?.find(m => m.id === request.receiver_menu_id)

          return {
            ...request,
            requester: requesterProfile ? {
              nickname: requesterProfile.nickname,
              avatar_url: requesterProfile.avatar_url,
              birth_year: requesterProfile.birth_year,
              organization: requesterProfile.organization,
              innovation_city: requesterProfile.innovation_city,
            } : undefined,
            restaurant: restaurant ? { name: restaurant.name } : undefined,
            requester_menu: requesterMenu ? { name: requesterMenu.name, price: requesterMenu.price } : undefined,
            receiver_menu: receiverMenu ? { name: receiverMenu.name, price: receiverMenu.price } : undefined,
          }
        })
        // 같은 소속기관 제외
        .filter(request => {
          const requesterProfile = requesterProfiles?.find(p => p.id === request.requester_id)
          if (!currentUserProfile?.organization || !requesterProfile?.organization) return true
          return requesterProfile.organization !== currentUserProfile.organization
        })

      setReceivedRequests(mergedReceived as any)
    } else {
      setReceivedRequests([])
    }

    // 보낸 제안
    const { data: sentRequestsData } = await supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, status, restaurant_id, requester_menu_id, receiver_menu_id')
      .eq('requester_id', user.id)
      .order('proposed_date', { ascending: false })

    if (sentRequestsData && sentRequestsData.length > 0) {
      const receiverIds = sentRequestsData.map(req => req.receiver_id)
      const restaurantIds = sentRequestsData
        .map(req => req.restaurant_id)
        .filter((id): id is string => id !== null && id !== undefined)

      const { data: receiverProfiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, birth_year, organization, innovation_city')
        .in('id', receiverIds)

      const { data: restaurants } = restaurantIds.length > 0 ? await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', restaurantIds) : { data: [] }

      const { data: allMenus } = await supabase
        .from('menus')
        .select('id, restaurant_id, name, price')

      const mergedSent = sentRequestsData
        .map(request => {
          const receiverProfile = receiverProfiles?.find(p => p.id === request.receiver_id)
          const restaurant = restaurants?.find(r => r.id === request.restaurant_id)
          const requesterMenu = allMenus?.find(m => m.id === request.requester_menu_id)
          const receiverMenu = allMenus?.find(m => m.id === request.receiver_menu_id)

          return {
            ...request,
            receiver: receiverProfile ? {
              nickname: receiverProfile.nickname,
              avatar_url: receiverProfile.avatar_url,
              birth_year: receiverProfile.birth_year,
              organization: receiverProfile.organization,
              innovation_city: receiverProfile.innovation_city,
            } : undefined,
            restaurant: restaurant ? { name: restaurant.name } : undefined,
            requester_menu: requesterMenu ? { name: requesterMenu.name, price: requesterMenu.price } : undefined,
            receiver_menu: receiverMenu ? { name: receiverMenu.name, price: receiverMenu.price } : undefined,
          }
        })
        // 같은 소속기관 제외
        .filter(request => {
          const receiverProfile = receiverProfiles?.find(p => p.id === request.receiver_id)
          if (!currentUserProfile?.organization || !receiverProfile?.organization) return true
          return receiverProfile.organization !== currentUserProfile.organization
        })

      setSentRequests(mergedSent as any)
    } else {
      setSentRequests([])
    }
  }

  const loadPaymentStatus = async () => {
    if (!user) return

    const { data } = await supabase
      .from('lunch_payments')
      .select('lunch_request_id')
      .eq('user_id', user.id)

    if (data) {
      const paidSet = new Set(data.map(payment => payment.lunch_request_id))
      setPaidRequests(paidSet)
    }
  }

  const loadMenus = async (restaurantId: string) => {
    const { data, error } = await supabase
      .from('menus')
      .select('id, restaurant_id, name, price')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading menus:', error)
      setMessage('메뉴를 불러오는 중 오류가 발생했습니다.')
    } else {
      setMenus((data || []) as Menu[])
    }
  }

  const handleAccept = async (request: LunchRequest) => {
    if (!request.restaurant_id) {
      setMessage('식당 정보가 없습니다.')
      return
    }

    setSelectedRequest(request)
    setSelectedMenuId('')
    setShowAcceptModal(true)
    setMessage('')
    
    if (request.restaurant) {
      setRestaurantName(request.restaurant.name)
    }
    
    await loadMenus(request.restaurant_id)
  }

  const handleCloseAcceptModal = () => {
    setShowAcceptModal(false)
    setSelectedRequest(null)
    setMenus([])
    setSelectedMenuId('')
    setRestaurantName('')
    setMessage('')
  }

  const handleConfirmAccept = async () => {
    if (!selectedRequest || !selectedMenuId) {
      setMessage('메뉴를 선택해주세요.')
      return
    }

    setMessage('')
    const { error } = await supabase
      .from('lunch_requests')
      .update({ 
        status: 'accepted',
        receiver_menu_id: selectedMenuId
      })
      .eq('id', selectedRequest.id)

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('점심 약속이 수락되었습니다!')
      handleCloseAcceptModal()
      loadRequests()
      loadPaymentStatus()
    }
  }

  const handleReject = async (requestId: string) => {
    setMessage('')
    const { error } = await supabase
      .from('lunch_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('점심 제안이 거절되었습니다.')
      loadRequests()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">대기중</span>
      case 'accepted':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">수락됨</span>
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">거절됨</span>
      case 'completed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">완료</span>
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const calculateAge = (birthYear: string | null): number | null => {
    if (!birthYear) return null
    const currentYear = new Date().getFullYear()
    return currentYear - parseInt(birthYear)
  }

  const getOtherPerson = (request: LunchRequest) => {
    if (request.requester_id === user?.id) {
      return request.receiver
    } else {
      return request.requester
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests

  return (
    <div className="min-h-screen bg-[#FDF2F4] pb-24">
      {/* 상단 헤더 */}
      <div 
        className="pt-12 pb-6 px-4"
        style={{
          background: 'linear-gradient(135deg, #F472B6 0%, #ec4899 100%)'
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white">점심 매칭 🍽️</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* 내일 점심 등록 카드 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F472B6] flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🍽️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">내일 점심 가능하신가요?</h3>
              <p className="text-sm text-gray-600 mb-3">등록하면 다른 회원과 매칭될 수 있어요</p>
              <Link
                href="/lunch/available"
                className="inline-block bg-[#F472B6] text-white px-6 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                내일 점심 등록하기
              </Link>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-gray-100 rounded-xl p-1 mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'received'
                  ? 'bg-gradient-to-r from-[#F472B6] to-[#ec4899] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              받은 제안
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'sent'
                  ? 'bg-gradient-to-r from-[#F472B6] to-[#ec4899] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              보낸 제안
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-center ${
            message.includes('오류') || message.includes('거절')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* 제안 카드 목록 */}
        <div className="space-y-4">
          {currentRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <p className="text-gray-500">아직 점심 제안이 없습니다</p>
            </div>
          ) : (
            currentRequests.map((request) => {
              const otherPerson = getOtherPerson(request)
              const isReceived = activeTab === 'received'
              const isPending = request.status === 'pending'
              const isAccepted = request.status === 'accepted'
              const isPaid = paidRequests.has(request.id)

              return (
                <div key={request.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* 프로필 정보 */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {otherPerson?.avatar_url ? (
                        <img
                          src={otherPerson.avatar_url}
                          alt={otherPerson.nickname}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4='
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                          <span className="text-2xl">👤</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {otherPerson?.nickname || '알 수 없음'}
                        </h3>
                        {otherPerson?.birth_year && (
                          <span className="text-gray-500 text-sm">
                            {calculateAge(otherPerson.birth_year)}세
                          </span>
                        )}
                        {getStatusBadge(request.status)}
                      </div>
                      {otherPerson?.organization && (
                        <p className="text-sm text-gray-600 truncate">{otherPerson.organization}</p>
                      )}
                      {otherPerson?.innovation_city && (
                        <p className="text-sm text-gray-500">📍 {otherPerson.innovation_city}</p>
                      )}
                    </div>
                  </div>

                  {/* 날짜, 식당, 메뉴 정보 */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">📅</span>
                      <span className="text-gray-700">{formatDate(request.proposed_date)}</span>
                    </div>
                    {request.restaurant && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">🍽️</span>
                        <span className="text-gray-700">{request.restaurant.name}</span>
                      </div>
                    )}
                    {isReceived && request.requester_menu && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">상대 메뉴:</span>
                        <span className="text-gray-700 font-medium">
                          {request.requester_menu.name} (₩{request.requester_menu.price.toLocaleString()})
                        </span>
                      </div>
                    )}
                    {!isReceived && request.requester_menu && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">내 메뉴:</span>
                        <span className="text-gray-700 font-medium">
                          {request.requester_menu.name} (₩{request.requester_menu.price.toLocaleString()})
                        </span>
                      </div>
                    )}
                    {isReceived && request.receiver_menu && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">내 메뉴:</span>
                        <span className="text-gray-700 font-medium">
                          {request.receiver_menu.name} (₩{request.receiver_menu.price.toLocaleString()})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    {isPending && isReceived && (
                      <>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                        >
                          거절
                        </button>
                        <button
                          onClick={() => handleAccept(request)}
                          className="flex-1 bg-[#F472B6] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                        >
                          수락
                        </button>
                      </>
                    )}
                    {isAccepted && !isPaid && (
                      <Link
                        href={`/payment/${request.id}`}
                        className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity text-center"
                      >
                        결제하기
                      </Link>
                    )}
                    {isAccepted && isPaid && (
                      <Link
                        href={`/review/${request.id}`}
                        className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity text-center"
                      >
                        평가하기
                      </Link>
                    )}
                    {request.status === 'rejected' && (
                      <div className="flex-1 text-center text-gray-500 py-3">
                        거절됨
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 수락 모달 */}
      {showAcceptModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">점심 수락</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">신청자</p>
              <p className="font-semibold text-gray-800">
                {selectedRequest.requester?.nickname || '알 수 없음'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                📅 {formatDate(selectedRequest.proposed_date)}
              </p>
              {restaurantName && (
                <p className="text-sm text-gray-600 mt-1">
                  🍽️ {restaurantName}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메뉴 선택
              </label>
              <p className="text-xs text-gray-500 mb-2">내가 먹을 메뉴를 선택하세요</p>
              {menus.length === 0 ? (
                <div className="w-full p-3 border rounded-xl bg-gray-50 text-gray-500 text-center">
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

            {selectedMenuId && (
              <div className="mb-4 p-3 bg-[#FDF2F4] border border-[#F472B6]/20 rounded-xl">
                <p className="text-sm font-medium text-[#F472B6]">
                  선택한 메뉴: {menus.find(m => m.id === selectedMenuId)?.name} (₩{menus.find(m => m.id === selectedMenuId)?.price.toLocaleString()})
                </p>
              </div>
            )}

            {message && (
              <p className={`mb-4 text-center text-sm ${
                message.includes('오류') ? 'text-red-500' : 'text-green-500'
              }`}>
                {message}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCloseAcceptModal}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmAccept}
                disabled={!selectedMenuId}
                className="flex-1 bg-[#F472B6] text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                수락하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
