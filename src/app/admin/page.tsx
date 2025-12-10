'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  email: string
  nickname: string
  gender: string
  innovation_city: string
  organization: string
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

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'matches' | 'manual'>('users')
  
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
      }
    }
  }, [user, activeTab])

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

    setUser(user)
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
      setProfiles(data || [])
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
      setMaleUsers(allProfiles.filter(p => p.gender === 'male'))
      setFemaleUsers(allProfiles.filter(p => p.gender === 'female'))
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
      </div>
    </div>
  )
}

