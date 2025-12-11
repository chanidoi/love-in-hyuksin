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
  requester?: {
    nickname: string
  }
  receiver?: {
    nickname: string
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
  const [acceptedMatches, setAcceptedMatches] = useState<LunchRequest[]>([])
  const [message, setMessage] = useState('')
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LunchRequest | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [restaurantName, setRestaurantName] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadRequests()
      loadAcceptedMatches()
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

  const loadRequests = async () => {
    if (!user) return

    // 받은 제안: 1단계 - lunch_requests 조회
    const { data: receivedRequestsData, error: receivedError } = await supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, status, restaurant_id')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('proposed_date', { ascending: true })

    console.log('받은 제안 조회 결과:', receivedRequestsData)
    console.log('받은 제안 조회 오류:', receivedError)

    if (receivedRequestsData && receivedRequestsData.length > 0) {
      // 2단계 - requester_id들로 profiles에서 닉네임 조회
      const requesterIds = receivedRequestsData.map(req => req.requester_id)
      const { data: requesterProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', requesterIds)

      console.log('요청자 프로필 조회 결과:', requesterProfiles)
      console.log('요청자 프로필 조회 오류:', profilesError)

      // 3단계 - 데이터 합치기
      const mergedReceived = receivedRequestsData.map(request => {
        const requesterProfile = requesterProfiles?.find(p => p.id === request.requester_id)
        return {
          ...request,
          requester: requesterProfile ? { nickname: requesterProfile.nickname } : undefined
        }
      })

      console.log('합쳐진 받은 제안 데이터:', mergedReceived)
      setReceivedRequests(mergedReceived as any)
    } else {
      setReceivedRequests([])
    }

    // 보낸 제안: 1단계 - lunch_requests 조회
    const { data: sentRequestsData, error: sentError } = await supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, status')
      .eq('requester_id', user.id)
      .order('proposed_date', { ascending: false })

    console.log('보낸 제안 조회 결과:', sentRequestsData)
    console.log('보낸 제안 조회 오류:', sentError)

    if (sentRequestsData && sentRequestsData.length > 0) {
      // 2단계 - receiver_id들로 profiles에서 닉네임 조회
      const receiverIds = sentRequestsData.map(req => req.receiver_id)
      const { data: receiverProfiles, error: receiverProfilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', receiverIds)

      console.log('수신자 프로필 조회 결과:', receiverProfiles)
      console.log('수신자 프로필 조회 오류:', receiverProfilesError)

      // 3단계 - 데이터 합치기
      const mergedSent = sentRequestsData.map(request => {
        const receiverProfile = receiverProfiles?.find(p => p.id === request.receiver_id)
        return {
          ...request,
          receiver: receiverProfile ? { nickname: receiverProfile.nickname } : undefined
        }
      })

      console.log('합쳐진 보낸 제안 데이터:', mergedSent)
      setSentRequests(mergedSent as any)
    } else {
      setSentRequests([])
    }
  }

  const loadAcceptedMatches = async () => {
    if (!user) return

    // 수락된 약속: 1단계 - lunch_requests 조회
    const { data: acceptedData, error: acceptedError } = await supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, status')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('proposed_date', { ascending: true })

    console.log('수락된 약속 조회 결과:', acceptedData)
    console.log('수락된 약속 조회 오류:', acceptedError)

    if (acceptedData && acceptedData.length > 0) {
      // 2단계 - requester_id와 receiver_id들로 profiles에서 닉네임 조회
      const allUserIds = [
        ...acceptedData.map(req => req.requester_id),
        ...acceptedData.map(req => req.receiver_id)
      ]
      const uniqueUserIds = Array.from(new Set(allUserIds))
      
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', uniqueUserIds)

      console.log('모든 프로필 조회 결과:', allProfiles)
      console.log('모든 프로필 조회 오류:', allProfilesError)

      // 3단계 - reviews 테이블에서 평가 여부 조회
      const requestIds = acceptedData.map(req => req.id)
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('lunch_request_id, reviewer_id, want_to_chat')
        .in('lunch_request_id', requestIds)

      console.log('평가 조회 결과:', reviews)
      console.log('평가 조회 오류:', reviewsError)

      // 4단계 - 데이터 합치기
      const mergedAccepted = acceptedData.map(request => {
        const requesterProfile = allProfiles?.find(p => p.id === request.requester_id)
        const receiverProfile = allProfiles?.find(p => p.id === request.receiver_id)
        
        // 현재 사용자가 평가했는지 확인
        const userReview = reviews?.find(r => 
          r.lunch_request_id === request.id && r.reviewer_id === user.id
        )
        const hasReviewed = !!userReview

        // 양쪽 모두 평가했는지 확인
        const allReviews = reviews?.filter(r => r.lunch_request_id === request.id) || []
        const bothReviewed = allReviews.length === 2
        
        // 양쪽 모두 want_to_chat이 true인지 확인
        const canChat = bothReviewed && allReviews.every(r => r.want_to_chat === true)

        return {
          ...request,
          requester: requesterProfile ? { nickname: requesterProfile.nickname } : undefined,
          receiver: receiverProfile ? { nickname: receiverProfile.nickname } : undefined,
          hasReviewed,
          canChat
        }
      })

      console.log('합쳐진 수락된 약속 데이터:', mergedAccepted)
      setAcceptedMatches(mergedAccepted as any)
    } else {
      setAcceptedMatches([])
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
    
    // 식당 정보 불러오기
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', request.restaurant_id)
      .single()
    
    if (restaurantData) {
      setRestaurantName(restaurantData.name)
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
      loadAcceptedMatches()
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

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return '대기중'
      case 'accepted':
        return '수락됨'
      case 'rejected':
        return '거절됨'
      default:
        return status
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600'
      case 'accepted':
        return 'text-green-600'
      case 'rejected':
        return 'text-red-600'
      default:
        return 'text-gray-600'
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

  const getOtherPersonNickname = (request: LunchRequest): string => {
    if (request.requester_id === user?.id) {
      return request.receiver?.nickname || '알 수 없음'
    } else {
      return request.requester?.nickname || '알 수 없음'
    }
  }

  const getOtherPersonId = (request: LunchRequest): string => {
    if (request.requester_id === user?.id) {
      return request.receiver_id
    } else {
      return request.requester_id
    }
  }

  const handleStartChat = async (lunchRequestId: string) => {
    if (!user) return

    try {
      // 1. chat_rooms 테이블에서 lunch_request_id로 채팅방 조회
      const { data: existingRoom, error: searchError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('lunch_request_id', lunchRequestId)
        .maybeSingle()

      console.log('기존 채팅방 조회 결과:', existingRoom)
      console.log('기존 채팅방 조회 오류:', searchError)

      if (existingRoom) {
        // 채팅방이 이미 있으면 바로 이동
        router.push(`/chat/${existingRoom.id}`)
        return
      }

      // 2. 채팅방이 없으면 새로 생성
      // lunch_request에서 상대방 ID 찾기
      const { data: lunchRequest, error: lunchError } = await supabase
        .from('lunch_requests')
        .select('requester_id, receiver_id')
        .eq('id', lunchRequestId)
        .single()

      if (lunchError || !lunchRequest) {
        alert('점심 약속 정보를 찾을 수 없습니다.')
        return
      }

      const otherUserId = lunchRequest.requester_id === user.id 
        ? lunchRequest.receiver_id 
        : lunchRequest.requester_id

      // user1_id는 항상 현재 사용자, user2_id는 상대방
      const { data: newRoom, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          user1_id: user.id,
          user2_id: otherUserId,
          lunch_request_id: lunchRequestId,
        })
        .select('id')
        .single()

      console.log('새 채팅방 생성 결과:', newRoom)
      console.log('새 채팅방 생성 오류:', createError)

      if (createError || !newRoom) {
        alert('채팅방 생성에 실패했습니다.')
        return
      }

      // 3. 채팅방 id로 이동
      router.push(`/chat/${newRoom.id}`)
    } catch (error) {
      console.error('채팅 시작 오류:', error)
      alert('채팅을 시작하는 중 오류가 발생했습니다.')
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
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-pink-500 mb-6">점심 매칭</h1>

        {/* 내일 점심 등록하기 카드 */}
        <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-6 mb-6 shadow-md">
          <h2 className="text-xl font-bold text-pink-600 mb-2">
            🍽️ 내일 점심 가능하신가요?
          </h2>
          <p className="text-gray-700 mb-4">
            등록하면 다른 회원과 매칭될 수 있어요
          </p>
          <Link
            href="/lunch/available"
            className="inline-block bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            내일 점심 등록하기
          </Link>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-md">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            받은 제안
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            보낸 제안
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            message.includes('오류') || message.includes('거절')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* 받은 제안 탭 */}
        {activeTab === 'received' && (
          <div className="space-y-4">
            {receivedRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-500">
                받은 제안이 없습니다.
              </div>
            ) : (
              receivedRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        {request.requester?.nickname || '알 수 없음'}
                      </h3>
                      <p className="text-gray-600">
                        📅 {formatDate(request.proposed_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAccept(request)}
                      className="flex-1 bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 font-medium"
                    >
                      수락
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 보낸 제안 탭 */}
        {activeTab === 'sent' && (
          <div className="space-y-4">
            {sentRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-500">
                보낸 제안이 없습니다.
              </div>
            ) : (
              sentRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        {request.receiver?.nickname || '알 수 없음'}
                      </h3>
                      <p className="text-gray-600 mb-1">
                        📅 {formatDate(request.proposed_date)}
                      </p>
                      <p className={`font-medium ${getStatusColor(request.status)}`}>
                        상태: {getStatusText(request.status)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 매칭된 점심 약속 목록 */}
        {acceptedMatches.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-pink-500 mb-4">매칭된 점심 약속</h2>
            <div className="space-y-4">
              {acceptedMatches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white p-6 rounded-lg shadow-md border-2 border-pink-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        {getOtherPersonNickname(match)}
                      </h3>
                      <p className="text-gray-600">
                        📅 {formatDate(match.proposed_date)}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      수락됨
                    </span>
                  </div>

                  {/* 채팅 가능 표시 */}
                  {match.canChat && (
                    <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                      <p className="text-pink-600 font-semibold mb-2">💕 채팅 가능!</p>
                      <button
                        onClick={() => handleStartChat(match.id)}
                        className="w-full bg-pink-500 text-white p-2 rounded-lg hover:bg-pink-600 font-medium"
                      >
                        채팅하기
                      </button>
                    </div>
                  )}

                  {/* 평가하기 버튼 */}
                  <div className="flex gap-3">
                    {match.hasReviewed ? (
                      <button
                        disabled
                        className="flex-1 bg-gray-200 text-gray-500 p-3 rounded-lg cursor-not-allowed font-medium"
                      >
                        평가 완료
                      </button>
                    ) : (
                      <Link
                        href={`/review/${match.id}`}
                        className="flex-1 bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 font-medium text-center"
                      >
                        평가하기
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 수락 모달 */}
      {showAcceptModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-pink-500 mb-4">점심 수락</h2>
            
            {/* 신청자 정보 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
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

            {/* 메뉴 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메뉴 선택
              </label>
              <p className="text-xs text-gray-500 mb-2">내가 먹을 메뉴를 선택하세요</p>
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

            {/* 선택한 메뉴 가격 표시 */}
            {selectedMenuId && (
              <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                <p className="text-sm font-medium text-pink-600">
                  선택한 메뉴: {menus.find(m => m.id === selectedMenuId)?.name} (₩{menus.find(m => m.id === selectedMenuId)?.price.toLocaleString()})
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
                onClick={handleCloseAcceptModal}
                className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleConfirmAccept}
                disabled={!selectedMenuId}
                className="flex-1 bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium"
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

