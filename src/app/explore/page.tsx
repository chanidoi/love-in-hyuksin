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
  job_level: string
  job_field: string
  avatar_url: string | null
  interests: string[] | null
  bio: string | null
}

export default function ExplorePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  
  const [showFilters, setShowFilters] = useState(false)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [cityFilter, setCityFilter] = useState('전체')
  
  // 프로필 로드 여부 추적
  const [isLoaded, setIsLoaded] = useState(false)
  
  // 뷰 모드 및 선택된 프로필
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  
  // 찜 목록
  const [favorites, setFavorites] = useState<string[]>([]) // favorite_user_id 배열

  useEffect(() => {
    checkUser()
  }, [])

  // 최초 로드
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !isLoaded) {
        await loadProfiles()
        await loadFavorites()
        setIsLoaded(true)
      }
    }
    init()
  }, []) // 빈 의존성 배열 - 최초 1회만 실행

  // 필터 변경 시에만 다시 로드
  useEffect(() => {
    if (isLoaded) {
      loadProfiles()
    }
  }, [genderFilter, cityFilter]) // 필터가 변경될 때만 실행

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    
    // 현재 사용자 프로필 로드
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setCurrentUserProfile(profile as Profile)
    }

    setLoading(false)
  }

  const loadProfiles = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 현재 사용자 프로필 가져오기
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!myProfile) return

    // 모든 프로필 가져오기 (닉네임 있는 것만)
    const { data: allProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .not('nickname', 'is', null)

    if (error) {
      console.error('Error loading profiles:', error)
      setProfiles([])
      return
    }

    console.log('All profiles:', allProfiles?.length)
    console.log('My org:', myProfile.organization)

    // 클라이언트에서 필터링
    let filtered = (allProfiles || []).filter(p => {
      // 본인 제외
      if (p.id === user.id) return false
      // 같은 기관 제외
      if (p.organization === myProfile.organization) return false
      return true
    })

    console.log('After org filter:', filtered.length)

    // 성별 필터
    if (genderFilter && genderFilter !== 'all') {
      filtered = filtered.filter(p => p.gender === genderFilter)
    }

    // 혁신도시 필터
    if (cityFilter && cityFilter !== '전체') {
      filtered = filtered.filter(p => p.innovation_city === cityFilter)
    }

    console.log('Final filtered:', filtered.length)

    // 랜덤 섞기
    const shuffled = filtered.sort(() => Math.random() - 0.5)
    setProfiles(shuffled as Profile[])
    setCurrentIndex(0)
  }

  const calculateAge = (birthYear: string): number => {
    if (!birthYear) return 0
    const currentYear = new Date().getFullYear()
    return currentYear - parseInt(birthYear)
  }

  const getUniqueCities = (): string[] => {
    const cities = profiles
      .map(p => p.innovation_city)
      .filter((city): city is string => city !== null && city !== '')
    return Array.from(new Set(cities)).sort()
  }

  const handleNext = () => {
    if (currentIndex < profiles.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setSelectedProfile(profiles[nextIndex])
    } else {
      // 프로필이 없으면 그리드 뷰로 돌아가기
      setViewMode('grid')
      setSelectedProfile(null)
    }
  }

  const handleLike = () => {
    if (selectedProfile) {
      router.push(`/explore/${selectedProfile.id}`)
    }
  }

  const handlePass = () => {
    handleNext()
  }

  const handleProfileClick = (profile: Profile) => {
    const index = profiles.findIndex(p => p.id === profile.id)
    setCurrentIndex(index)
    setSelectedProfile(profile)
    setViewMode('detail')
  }

  const handleBackToGrid = () => {
    setViewMode('grid')
    setSelectedProfile(null)
  }

  const loadFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('favorites')
      .select('favorite_user_id')
      .eq('user_id', user.id)
    
    if (data) {
      setFavorites(data.map(f => f.favorite_user_id))
    }
  }

  const toggleFavorite = async (profileId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isFavorite = favorites.includes(profileId)

    if (isFavorite) {
      // 찜 해제
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('favorite_user_id', profileId)
      
      setFavorites(favorites.filter(id => id !== profileId))
    } else {
      // 찜 추가
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, favorite_user_id: profileId })
      
      setFavorites([...favorites, profileId])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  // 그리드 뷰
  if (viewMode === 'grid') {
    return (
      <div className="min-h-screen bg-[#FDF2F4] pb-24">
        {/* 상단 헤더 */}
        <div className="sticky top-0 z-10 bg-[#FDF2F4] pt-4 pb-2 px-4">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">회원 탐색</h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-full hover:bg-white/50 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 필터 영역 */}
        {showFilters && (
          <div className="px-4 mb-4">
            <div className="max-w-md mx-auto bg-white rounded-2xl p-4 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGenderFilter('all')}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                        genderFilter === 'all'
                          ? 'bg-[#F472B6] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      전체
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('male')}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                        genderFilter === 'male'
                          ? 'bg-[#F472B6] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      남성
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('female')}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                        genderFilter === 'female'
                          ? 'bg-[#F472B6] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      여성
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">혁신도시</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
                  >
                    <option value="전체">전체</option>
                    {getUniqueCities().map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 그리드 뷰 */}
        <div className="max-w-md mx-auto px-4">
          {profiles.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <p className="text-gray-500 text-lg">더 이상 프로필이 없습니다</p>
              <Link
                href="/"
                className="mt-4 inline-block text-[#F472B6] font-semibold hover:underline"
              >
                홈으로 돌아가기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => handleProfileClick(profile)}
                  className="cursor-pointer"
                >
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.nickname}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4='
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <span className="text-4xl text-gray-500">👤</span>
                      </div>
                    )}
                    
                    {/* 찜한 프로필 표시 */}
                    {favorites.includes(profile.id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* 그라데이션 오버레이 */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent"></div>
                    
                    {/* 이름, 나이 */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {profile.nickname || '닉네임 없음'}
                      </h3>
                      {profile.birth_year && (
                        <p className="text-xs text-white/90">
                          {calculateAge(profile.birth_year)}세
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* 기관명 */}
                  {profile.organization && (
                    <p className="text-xs text-gray-600 mt-1 truncate px-1">
                      {profile.organization}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 상세 뷰
  if (viewMode === 'detail' && selectedProfile) {
    return (
      <div className="min-h-screen bg-[#FDF2F4] flex flex-col pb-24">
        {/* 뒤로가기 버튼 */}
        <div className="sticky top-0 z-10 bg-[#FDF2F4] pt-4 pb-2 px-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleBackToGrid}
              className="p-2 rounded-full hover:bg-white/50 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 flex-1 flex flex-col overflow-hidden">
          {/* 프로필 이미지 */}
          <div className="relative mb-3 flex-shrink-0">
            <div className="w-full h-[40vh] rounded-2xl overflow-hidden bg-gray-200 shadow-lg">
              {selectedProfile.avatar_url ? (
                <img
                  src={selectedProfile.avatar_url}
                  alt={selectedProfile.nickname}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4='
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <span className="text-6xl text-gray-500">👤</span>
                </div>
              )}
            </div>
            
            {/* 그라데이션 오버레이 */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent rounded-b-2xl"></div>
            
            {/* 이름, 나이 */}
            <div className="absolute bottom-3 left-4 right-4">
              <h2 className="text-2xl font-bold text-white mb-1">
                {selectedProfile.nickname || '닉네임 없음'}
              </h2>
              {selectedProfile.birth_year && (
                <p className="text-white/90">
                  {calculateAge(selectedProfile.birth_year)}세
                </p>
              )}
            </div>
          </div>

          {/* 프로필 정보 카드 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 flex-shrink-0">
            <div className="space-y-3">
              {/* 기본 정보 */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedProfile.nickname || '닉네임 없음'}
                  </h3>
                  {selectedProfile.birth_year && (
                    <span className="text-gray-500">
                      {calculateAge(selectedProfile.birth_year)}세
                    </span>
                  )}
                </div>
                {selectedProfile.organization && (
                  <p className="text-gray-600 text-sm mb-1">{selectedProfile.organization}</p>
                )}
                {selectedProfile.innovation_city && (
                  <p className="text-gray-500 text-xs">
                    📍 {selectedProfile.innovation_city}
                  </p>
                )}
              </div>

              {/* About Me (2줄 제한) */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">About Me</h4>
                <p className="text-gray-600 text-xs line-clamp-2">
                  {selectedProfile.bio || '안녕하세요! 좋은 만남을 기대합니다.'}
                </p>
              </div>

              {/* Interests */}
              {selectedProfile.interests && selectedProfile.interests.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-1">Interests</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedProfile.interests.slice(0, 5).map((interest, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-[#FDF2F4] text-[#F472B6] rounded-full text-xs font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단 고정 액션 버튼들 */}
          <div className="mt-auto pb-4">
            <div className="flex justify-center gap-3 mb-3">
              <button
                onClick={handlePass}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={handleLike}
                className="w-12 h-12 bg-[#F472B6] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(selectedProfile.id)
                }}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                {favorites.includes(selectedProfile.id) ? (
                  <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* 다음 프로필 보기 버튼 */}
            {currentIndex < profiles.length - 1 ? (
              <button
                onClick={handleNext}
                className="w-full bg-white text-[#F472B6] rounded-full py-3 font-semibold shadow-sm hover:bg-gray-50 transition-colors"
              >
                다음 프로필 보기
              </button>
            ) : (
              <button
                onClick={handleBackToGrid}
                className="w-full bg-white text-[#F472B6] rounded-full py-3 font-semibold shadow-sm hover:bg-gray-50 transition-colors"
              >
                그리드로 돌아가기
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
