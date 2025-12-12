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

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && currentUserProfile) {
      loadProfiles()
    }
  }, [user, currentUserProfile, genderFilter, cityFilter])

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
    
    setCurrentUserProfile(myProfile)

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
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleLike = () => {
    if (profiles[currentIndex]) {
      router.push(`/explore/${profiles[currentIndex].id}`)
    }
  }

  const handlePass = () => {
    handleNext()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  const currentProfile = profiles[currentIndex]

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

      {/* 프로필 카드 */}
      <div className="max-w-md mx-auto px-4">
        {!currentProfile ? (
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
          <>
            {/* 프로필 이미지 */}
            <div className="relative mb-4">
              <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-200 shadow-lg">
                {currentProfile.avatar_url ? (
                  <img
                    src={currentProfile.avatar_url}
                    alt={currentProfile.nickname}
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
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent rounded-b-2xl"></div>
              
              {/* 이름, 나이 */}
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {currentProfile.nickname || '닉네임 없음'}
                </h2>
                {currentProfile.birth_year && (
                  <p className="text-white/90">
                    {calculateAge(currentProfile.birth_year)}세
                  </p>
                )}
              </div>

              {/* 액션 버튼들 */}
              <div className="absolute bottom-4 right-4 flex gap-2">
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
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* 프로필 정보 카드 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <div className="space-y-4">
                {/* 기본 정보 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {currentProfile.nickname || '닉네임 없음'}
                    </h3>
                    {currentProfile.birth_year && (
                      <span className="text-gray-500">
                        {calculateAge(currentProfile.birth_year)}세
                      </span>
                    )}
                  </div>
                  {currentProfile.organization && (
                    <p className="text-gray-600 mb-1">{currentProfile.organization}</p>
                  )}
                  {currentProfile.innovation_city && (
                    <p className="text-gray-500 text-sm">
                      📍 {currentProfile.innovation_city}
                    </p>
                  )}
                </div>

                {/* About Me */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">About Me</h4>
                  <p className="text-gray-600 text-sm">
                    {currentProfile.bio || '안녕하세요! 좋은 만남을 기대합니다.'}
                  </p>
                </div>

                {/* Interests */}
                {currentProfile.interests && currentProfile.interests.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentProfile.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-[#FDF2F4] text-[#F472B6] rounded-full text-xs font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 다음 프로필 버튼 */}
            {currentIndex < profiles.length - 1 && (
              <button
                onClick={handleNext}
                className="w-full bg-white text-[#F472B6] rounded-full py-3 font-semibold shadow-sm hover:bg-gray-50 transition-colors"
              >
                다음 프로필 보기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
