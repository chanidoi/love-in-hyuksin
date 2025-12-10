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
}

export default function ExplorePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])
  
  const [genderFilter, setGenderFilter] = useState('전체')
  const [cityFilter, setCityFilter] = useState('전체')

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [profiles, genderFilter, cityFilter])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    await loadProfiles(user.id)
    setLoading(false)
  }

  const loadProfiles = async (currentUserId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, gender, birth_year, organization, innovation_city, job_level, job_field')
      .neq('id', currentUserId)
      .not('nickname', 'is', null)

    if (error) {
      console.error('Error loading profiles:', error)
    } else {
      setProfiles(data || [])
    }
  }

  const applyFilters = () => {
    let filtered = [...profiles]

    // 성별 필터
    if (genderFilter !== '전체') {
      const genderValue = genderFilter === '남성' ? 'male' : 'female'
      filtered = filtered.filter(p => p.gender === genderValue)
    }

    // 혁신도시 필터
    if (cityFilter !== '전체') {
      filtered = filtered.filter(p => p.innovation_city === cityFilter)
    }

    setFilteredProfiles(filtered)
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

  const getUniqueCities = (): string[] => {
    const cities = profiles
      .map(p => p.innovation_city)
      .filter((city): city is string => city !== null && city !== '')
    return Array.from(new Set(cities)).sort()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-pink-500 mb-6">회원 탐색</h1>

        {/* 필터 섹션 */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                성별
              </label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="전체">전체</option>
                <option value="남성">남성</option>
                <option value="여성">여성</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                혁신도시
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
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

        {/* 회원 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredProfiles.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              조건에 맞는 회원이 없습니다.
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/explore/${profile.id}`}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {profile.nickname || '닉네임 없음'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{getGenderDisplay(profile.gender)}</span>
                    {profile.birth_year && (
                      <>
                        <span>•</span>
                        <span>{calculateAge(profile.birth_year)}세</span>
                      </>
                    )}
                  </div>
                  {profile.organization && (
                    <p className="text-sm text-gray-600">
                      {profile.organization}
                    </p>
                  )}
                  {profile.innovation_city && (
                    <p className="text-sm text-gray-600">
                      📍 {profile.innovation_city}
                    </p>
                  )}
                  {profile.job_level && (
                    <p className="text-sm text-gray-600">
                      직급: {profile.job_level}
                    </p>
                  )}
                  {profile.job_field && (
                    <p className="text-sm text-gray-600">
                      업무분야: {profile.job_field}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* 하단 링크 */}
        <div className="flex justify-center gap-4 pb-8">
          <Link
            href="/"
            className="text-pink-500 hover:underline"
          >
            홈으로 돌아가기
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/profile"
            className="text-pink-500 hover:underline"
          >
            내 프로필
          </Link>
        </div>
      </div>
    </div>
  )
}

