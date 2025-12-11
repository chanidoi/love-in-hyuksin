'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ADMIN_EMAILS = ['pjc77@kalis.or.kr']

interface Profile {
  id: string
  email: string
  nickname: string
  gender: string
  birth_year: number
  organization: string
  innovation_city: string
  job_level: string
  job_field: string
  created_at: string
}

interface LunchRequest {
  id: string
  requester_id: string
  receiver_id: string
  proposed_date: string
  status: string
  requester_nickname?: string
  receiver_nickname?: string
}

interface Restaurant {
  id: string
  name: string
  category: string
  location: string
  innovation_city: string
  is_outside: boolean
  created_at: string
}

interface Menu {
  id: string
  restaurant_id: string
  name: string
  price: number
  description: string | null
  is_available: boolean
  created_at: string
}

interface Payment {
  id: string
  lunch_request_id: string
  user_id: string
  amount: number
  payment_method: string
  status: string
  created_at: string
  confirmed_at: string | null
  user_nickname?: string
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'matches' | 'manual' | 'restaurants' | 'menus' | 'payments'>('users')
  
  // 회원 관리
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // 매칭 현황
  const [lunchRequests, setLunchRequests] = useState<LunchRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('전체')
  
  // 수동 매칭
  const [maleUsers, setMaleUsers] = useState<Profile[]>([])
  const [femaleUsers, setFemaleUsers] = useState<Profile[]>([])
  const [selectedMale, setSelectedMale] = useState('')
  const [selectedFemale, setSelectedFemale] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  
  // 식당 관리
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantCategory, setRestaurantCategory] = useState('')
  const [restaurantLocation, setRestaurantLocation] = useState('')
  const [restaurantCity, setRestaurantCity] = useState('')
  const [restaurantIsOutside, setRestaurantIsOutside] = useState(false)
  const [addingRestaurant, setAddingRestaurant] = useState(false)
  
  // 메뉴 관리
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [menus, setMenus] = useState<Menu[]>([])
  const [menuName, setMenuName] = useState('')
  const [menuPrice, setMenuPrice] = useState('')
  const [menuDescription, setMenuDescription] = useState('')
  const [addingMenu, setAddingMenu] = useState(false)
  
  // 결제 관리
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      if (activeTab === 'users') {
        loadProfiles()
      } else if (activeTab === 'matches') {
        loadLunchRequests()
      } else if (activeTab === 'manual') {
        loadUsersForMatching()
      } else if (activeTab === 'restaurants') {
        loadRestaurants()
      } else if (activeTab === 'menus') {
        loadAllRestaurants()
      } else if (activeTab === 'payments') {
        loadPayments()
      }
    }
  }, [user, activeTab])

  useEffect(() => {
    if (activeTab === 'menus' && selectedRestaurantId) {
      loadMenus(selectedRestaurantId)
    } else {
      setMenus([])
    }
  }, [activeTab, selectedRestaurantId])

  useEffect(() => {
    if (activeTab === 'matches') {
      loadLunchRequests()
    }
  }, [statusFilter])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // 관리자 권한 체크
    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      setUser(null)
      setIsAdmin(false)
      setLoading(false)
      return
    }

    setUser(user)
    setIsAdmin(true)
    setLoading(false)
  }

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nickname, gender, innovation_city, organization, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading profiles:', error)
    } else {
      setProfiles((data || []) as Profile[])
    }
  }

  const loadLunchRequests = async () => {
    // 1단계: lunch_requests 조회
    let query = supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, status')
      .order('proposed_date', { ascending: false })

    if (statusFilter !== '전체') {
      const statusMap: Record<string, string> = {
        '대기중': 'pending',
        '수락됨': 'accepted',
        '거절됨': 'rejected'
      }
      query = query.eq('status', statusMap[statusFilter])
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error loading lunch requests:', error)
      return
    }

    if (!requests || requests.length === 0) {
      setLunchRequests([])
      return
    }

    // 2단계: 프로필 조회
    const allUserIds = [
      ...requests.map(r => r.requester_id),
      ...requests.map(r => r.receiver_id)
    ]
    const uniqueUserIds = Array.from(new Set(allUserIds))

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', uniqueUserIds)

    // 3단계: 데이터 합치기
    const merged = requests.map(request => {
      const requesterProfile = profiles?.find(p => p.id === request.requester_id)
      const receiverProfile = profiles?.find(p => p.id === request.receiver_id)
      return {
        ...request,
        requester_nickname: requesterProfile?.nickname || '알 수 없음',
        receiver_nickname: receiverProfile?.nickname || '알 수 없음'
      }
    })

    setLunchRequests(merged)
  }

  const loadUsersForMatching = async () => {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, nickname, gender')
      .order('nickname', { ascending: true })

    if (allProfiles) {
      const typedProfiles: Profile[] = (allProfiles || []) as Profile[]
      setMaleUsers(typedProfiles.filter((p: Profile) => p.gender === 'male') as Profile[])
      setFemaleUsers(typedProfiles.filter((p: Profile) => p.gender === 'female') as Profile[])
    }
  }

  const handleCreateManualMatch = async () => {
    if (!selectedMale || !selectedFemale || !matchDate) {
      setMessage('모든 항목을 선택해주세요.')
      return
    }

    setCreating(true)
    setMessage('')

    const { error } = await supabase
      .from('lunch_requests')
      .insert({
        requester_id: selectedMale,
        receiver_id: selectedFemale,
        proposed_date: matchDate,
        status: 'accepted',
      })

    if (error) {
      setMessage('오류: ' + error.message)
      setCreating(false)
    } else {
      setMessage('매칭이 생성되었습니다!')
      setSelectedMale('')
      setSelectedFemale('')
      setMatchDate('')
      setCreating(false)
      // 매칭 현황 탭으로 전환하여 새로고침
      setTimeout(() => {
        setActiveTab('matches')
        loadLunchRequests()
      }, 1500)
    }
  }

  const loadRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, category, location, innovation_city, is_outside, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading restaurants:', error)
    } else {
      setRestaurants((data || []) as Restaurant[])
    }
  }

  const handleAddRestaurant = async () => {
    if (!restaurantName || !restaurantCategory || !restaurantLocation || !restaurantCity) {
      setMessage('모든 필수 항목을 입력해주세요.')
      return
    }

    setAddingRestaurant(true)
    setMessage('')

    const { error } = await supabase
      .from('restaurants')
      .insert({
        name: restaurantName,
        category: restaurantCategory,
        location: restaurantLocation,
        innovation_city: restaurantCity,
        is_outside: restaurantIsOutside,
      })

    if (error) {
      setMessage('오류: ' + error.message)
      setAddingRestaurant(false)
    } else {
      setMessage('식당이 추가되었습니다!')
      setRestaurantName('')
      setRestaurantCategory('')
      setRestaurantLocation('')
      setRestaurantCity('')
      setRestaurantIsOutside(false)
      setAddingRestaurant(false)
      loadRestaurants()
    }
  }

  const handleDeleteRestaurant = async (restaurantId: string) => {
    if (!confirm('정말 이 식당을 삭제하시겠습니까?')) {
      return
    }

    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId)

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('식당이 삭제되었습니다!')
      loadRestaurants()
    }
  }

  const loadAllRestaurants = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, category, location, innovation_city, is_outside, created_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading restaurants:', error)
    } else {
      setAllRestaurants((data || []) as Restaurant[])
    }
  }

  const loadMenus = async (restaurantId: string) => {
    const { data, error } = await supabase
      .from('menus')
      .select('id, restaurant_id, name, price, description, is_available, created_at')
      .eq('restaurant_id', restaurantId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading menus:', error)
      setMessage('오류: ' + error.message)
    } else {
      setMenus((data || []) as Menu[])
    }
  }

  const handleAddMenu = async () => {
    if (!selectedRestaurantId || !menuName || !menuPrice) {
      setMessage('식당, 메뉴명, 가격을 모두 입력해주세요.')
      return
    }

    const price = parseFloat(menuPrice)
    if (isNaN(price) || price < 0) {
      setMessage('올바른 가격을 입력해주세요.')
      return
    }

    setAddingMenu(true)
    setMessage('')

    const { error } = await supabase
      .from('menus')
      .insert({
        restaurant_id: selectedRestaurantId,
        name: menuName,
        price: price,
        description: menuDescription || null,
        is_available: true,
      })

    if (error) {
      setMessage('오류: ' + error.message)
      setAddingMenu(false)
    } else {
      setMessage('메뉴가 추가되었습니다!')
      setMenuName('')
      setMenuPrice('')
      setMenuDescription('')
      setAddingMenu(false)
      loadMenus(selectedRestaurantId)
    }
  }

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm('정말 이 메뉴를 삭제하시겠습니까?')) {
      return
    }

    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId)

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('메뉴가 삭제되었습니다!')
      if (selectedRestaurantId) {
        loadMenus(selectedRestaurantId)
      }
    }
  }

  const handleToggleAvailable = async (menuId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('menus')
      .update({ is_available: !currentStatus })
      .eq('id', menuId)

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      if (selectedRestaurantId) {
        loadMenus(selectedRestaurantId)
      }
    }
  }

  const loadPayments = async () => {
    // 1단계: lunch_payments 조회
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('lunch_payments')
      .select('id, lunch_request_id, user_id, amount, payment_method, status, created_at, confirmed_at')
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('Error loading payments:', paymentsError)
      setMessage('오류: ' + paymentsError.message)
      return
    }

    if (!paymentsData || paymentsData.length === 0) {
      setPayments([])
      return
    }

    // 2단계: user_id들로 profiles에서 닉네임 조회
    const userIds = paymentsData.map(payment => payment.user_id)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error loading user profiles:', profilesError)
    }

    // 3단계: 데이터 합치기
    const mergedPayments = paymentsData.map(payment => {
      const userProfile = userProfiles?.find(p => p.id === payment.user_id)
      return {
        ...payment,
        user_nickname: userProfile?.nickname || '알 수 없음'
      }
    })

    setPayments(mergedPayments as Payment[])
  }

  const handleConfirmPayment = async (paymentId: string) => {
    if (!confirm('입금을 확인하시겠습니까?')) {
      return
    }

    const { error } = await supabase
      .from('lunch_payments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('입금 확인이 완료되었습니다!')
      loadPayments()
    }
  }

  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      profile.nickname?.toLowerCase().includes(query) ||
      profile.email?.toLowerCase().includes(query)
    )
  })

  const filteredLunchRequests = lunchRequests

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  if (!isAdmin || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">관리자 권한이 없습니다</h1>
          <p className="text-gray-600 mb-6">
            이 페이지는 관리자만 접근할 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-block bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors font-medium"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-24">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-pink-500 mb-6">관리자 페이지</h1>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-md">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            회원 관리
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'matches'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            매칭 현황
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'manual'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            수동 매칭
          </button>
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'restaurants'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            식당 관리
          </button>
          <button
            onClick={() => setActiveTab('menus')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'menus'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            메뉴 관리
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'payments'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            결제 관리
          </button>
        </div>

        {/* 회원 관리 탭 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="닉네임 또는 이메일로 검색..."
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-pink-600">닉네임</th>
                    <th className="text-left p-3 text-pink-600">이메일</th>
                    <th className="text-left p-3 text-pink-600">성별</th>
                    <th className="text-left p-3 text-pink-600">혁신도시</th>
                    <th className="text-left p-3 text-pink-600">소속기관</th>
                    <th className="text-left p-3 text-pink-600">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        회원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredProfiles.map((profile) => (
                      <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-700">{profile.nickname || '-'}</td>
                        <td className="p-3 text-gray-700">{profile.email || '-'}</td>
                        <td className="p-3 text-gray-700">{profile.gender === 'male' ? '남' : profile.gender === 'female' ? '여' : '-'}</td>
                        <td className="p-3 text-gray-700">{profile.innovation_city || '-'}</td>
                        <td className="p-3 text-gray-700">{profile.organization || '-'}</td>
                        <td className="p-3 text-gray-700">{formatDate(profile.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 매칭 현황 탭 */}
        {activeTab === 'matches' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="전체">전체</option>
                <option value="대기중">대기중</option>
                <option value="수락됨">수락됨</option>
                <option value="거절됨">거절됨</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-pink-600">신청자</th>
                    <th className="text-left p-3 text-pink-600">수신자</th>
                    <th className="text-left p-3 text-pink-600">날짜</th>
                    <th className="text-left p-3 text-pink-600">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLunchRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-gray-500">
                        매칭이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredLunchRequests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-700">{request.requester_nickname}</td>
                        <td className="p-3 text-gray-700">{request.receiver_nickname}</td>
                        <td className="p-3 text-gray-700">{formatDate(request.proposed_date)}</td>
                        <td className={`p-3 font-medium ${getStatusColor(request.status)}`}>
                          {getStatusText(request.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 수동 매칭 탭 */}
        {activeTab === 'manual' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  남성 회원
                </label>
                <select
                  value={selectedMale}
                  onChange={(e) => setSelectedMale(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
                >
                  <option value="">선택하세요</option>
                  {maleUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nickname || user.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  여성 회원
                </label>
                <select
                  value={selectedFemale}
                  onChange={(e) => setSelectedFemale(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
                >
                  <option value="">선택하세요</option>
                  {femaleUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nickname || user.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜 선택
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
                />
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-center ${
                  message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              <button
                onClick={handleCreateManualMatch}
                disabled={creating}
                className="w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium"
              >
                {creating ? '생성 중...' : '매칭 생성'}
              </button>
            </div>
          </div>
        )}

        {/* 식당 관리 탭 */}
        {activeTab === 'restaurants' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-pink-500 mb-6">식당 관리</h2>

            {/* 식당 추가 폼 */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">식당 추가</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    식당 이름 *
                  </label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="식당 이름 입력"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 *
                  </label>
                  <select
                    value={restaurantCategory}
                    onChange={(e) => setRestaurantCategory(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
                  >
                    <option value="">선택하세요</option>
                    <option value="한식">한식</option>
                    <option value="중식">중식</option>
                    <option value="양식">양식</option>
                    <option value="일식">일식</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    위치 *
                  </label>
                  <input
                    type="text"
                    value={restaurantLocation}
                    onChange={(e) => setRestaurantLocation(e.target.value)}
                    placeholder="식당 위치 입력"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    혁신도시 *
                  </label>
                  <select
                    value={restaurantCity}
                    onChange={(e) => setRestaurantCity(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
                  >
                    <option value="">선택하세요</option>
                    <option value="부산">부산</option>
                    <option value="대구">대구</option>
                    <option value="광주">광주</option>
                    <option value="울산">울산</option>
                    <option value="강원">강원</option>
                    <option value="충북">충북</option>
                    <option value="전북">전북</option>
                    <option value="경북">경북</option>
                    <option value="경남(진주)">경남(진주)</option>
                    <option value="제주">제주</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restaurantIsOutside}
                      onChange={(e) => setRestaurantIsOutside(e.target.checked)}
                      className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      혁신도시 외곽
                    </span>
                  </label>
                </div>
              </div>

              {message && (
                <div className={`mt-4 p-3 rounded-lg text-center ${
                  message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              <button
                onClick={handleAddRestaurant}
                disabled={addingRestaurant}
                className="mt-4 w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium"
              >
                {addingRestaurant ? '추가 중...' : '식당 추가'}
              </button>
            </div>

            {/* 식당 목록 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-pink-600">이름</th>
                    <th className="text-left p-3 text-pink-600">카테고리</th>
                    <th className="text-left p-3 text-pink-600">위치</th>
                    <th className="text-left p-3 text-pink-600">혁신도시</th>
                    <th className="text-left p-3 text-pink-600">외곽 여부</th>
                    <th className="text-left p-3 text-pink-600">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        등록된 식당이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    restaurants.map((restaurant) => (
                      <tr key={restaurant.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-700">{restaurant.name}</td>
                        <td className="p-3 text-gray-700">{restaurant.category}</td>
                        <td className="p-3 text-gray-700">{restaurant.location}</td>
                        <td className="p-3 text-gray-700">{restaurant.innovation_city}</td>
                        <td className="p-3 text-gray-700">
                          {restaurant.is_outside ? '외곽' : '내곽'}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteRestaurant(restaurant.id)}
                            className="text-red-500 hover:text-red-700 font-medium"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 메뉴 관리 탭 */}
        {activeTab === 'menus' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-pink-500 mb-6">메뉴 관리</h2>

            {/* 식당 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                식당 선택
              </label>
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">식당을 선택하세요</option>
                {allRestaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name} ({restaurant.category})
                  </option>
                ))}
              </select>
            </div>

            {/* 메뉴 추가 폼 */}
            {selectedRestaurantId && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">메뉴 추가</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      메뉴명 *
                    </label>
                    <input
                      type="text"
                      value={menuName}
                      onChange={(e) => setMenuName(e.target.value)}
                      placeholder="메뉴명 입력"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      가격 (원) *
                    </label>
                    <input
                      type="number"
                      value={menuPrice}
                      onChange={(e) => setMenuPrice(e.target.value)}
                      placeholder="가격 입력"
                      min="0"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명 (선택사항)
                    </label>
                    <input
                      type="text"
                      value={menuDescription}
                      onChange={(e) => setMenuDescription(e.target.value)}
                      placeholder="메뉴 설명"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
                    />
                  </div>
                </div>

                {message && (
                  <div className={`mt-4 p-3 rounded-lg text-center ${
                    message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {message}
                  </div>
                )}

                <button
                  onClick={handleAddMenu}
                  disabled={addingMenu}
                  className="mt-4 w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium"
                >
                  {addingMenu ? '추가 중...' : '메뉴 추가'}
                </button>
              </div>
            )}

            {/* 메뉴 목록 */}
            {selectedRestaurantId && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-pink-600">메뉴명</th>
                      <th className="text-left p-3 text-pink-600">가격</th>
                      <th className="text-left p-3 text-pink-600">설명</th>
                      <th className="text-left p-3 text-pink-600">판매중</th>
                      <th className="text-left p-3 text-pink-600">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menus.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-gray-500">
                          등록된 메뉴가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      menus.map((menu) => (
                        <tr key={menu.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-700 font-medium">{menu.name}</td>
                          <td className="p-3 text-gray-700">{menu.price.toLocaleString()}원</td>
                          <td className="p-3 text-gray-700">{menu.description || '-'}</td>
                          <td className="p-3">
                            <button
                              onClick={() => handleToggleAvailable(menu.id, menu.is_available)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                menu.is_available
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {menu.is_available ? '판매중' : '품절'}
                            </button>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteMenu(menu.id)}
                              className="text-red-500 hover:text-red-700 font-medium"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!selectedRestaurantId && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                식당을 선택하면 메뉴를 관리할 수 있습니다.
              </div>
            )}
          </div>
        )}

        {/* 결제 관리 탭 */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-pink-500 mb-6">결제 관리</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 text-pink-600">날짜</th>
                    <th className="text-left p-3 text-pink-600">입금자</th>
                    <th className="text-left p-3 text-pink-600">금액</th>
                    <th className="text-left p-3 text-pink-600">결제방법</th>
                    <th className="text-left p-3 text-pink-600">상태</th>
                    <th className="text-left p-3 text-pink-600">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        결제 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-700">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="p-3 text-gray-700">
                          {payment.user_nickname || '알 수 없음'}
                        </td>
                        <td className="p-3 text-gray-700">
                          ₩{payment.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-gray-700">
                          {payment.payment_method === 'transfer' ? '계좌이체' : payment.payment_method === 'kakao' ? '카카오페이' : payment.payment_method}
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : payment.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : payment.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.status === 'pending'
                              ? '확인 대기'
                              : payment.status === 'confirmed'
                              ? '확인 완료'
                              : payment.status === 'cancelled'
                              ? '취소됨'
                              : payment.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {payment.status === 'pending' ? (
                            <button
                              onClick={() => handleConfirmPayment(payment.id)}
                              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium transition-colors"
                            >
                              입금 확인
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

