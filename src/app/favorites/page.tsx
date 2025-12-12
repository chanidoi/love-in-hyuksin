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
  avatar_url: string | null
}

export default function FavoritesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [favoriteProfiles, setFavoriteProfiles] = useState<Profile[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadFavorites()
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

  const loadFavorites = async () => {
    if (!user) return

    // favorites 테이블과 profiles 테이블 조인
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        favorite_user_id,
        profile:profiles!favorites_favorite_user_id_fkey (
          id,
          nickname,
          gender,
          birth_year,
          organization,
          innovation_city,
          avatar_url
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading favorites:', error)
      setFavoriteProfiles([])
      return
    }

    if (data) {
      // profile이 null이 아닌 것만 필터링하고 타입 변환
      const profiles = data
        .filter(item => item.profile !== null)
        .map(item => item.profile as Profile)
      setFavoriteProfiles(profiles)
    }
  }

  const handleRemoveFavorite = async (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지

    if (!user) return

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('favorite_user_id', profileId)

    if (error) {
      console.error('Error removing favorite:', error)
      return
    }

    // 로컬 상태에서 제거
    setFavoriteProfiles(favoriteProfiles.filter(p => p.id !== profileId))
  }

  const calculateAge = (birthYear: string): number => {
    if (!birthYear) return 0
    const currentYear = new Date().getFullYear()
    return currentYear - parseInt(birthYear)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF2F4] pb-24">
      {/* 상단 헤더 */}
      <div className="bg-gradient-to-r from-pink-400 to-pink-600 pt-4 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white">찜한 프로필 ⭐</h1>
        </div>
      </div>

      {/* 찜 목록 */}
      <div className="max-w-md mx-auto px-4 mt-6">
        {favoriteProfiles.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">⭐</div>
            <p className="text-gray-500 text-lg mb-2">아직 찜한 프로필이 없습니다</p>
            <p className="text-gray-400 text-sm mb-6">
              회원 탐색에서 마음에 드는 분을 찜해보세요!
            </p>
            <Link
              href="/explore"
              className="inline-block bg-[#F472B6] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#F472B6]/90 transition-colors"
            >
              회원 탐색 가기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favoriteProfiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/explore/${profile.id}`}
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
                  
                  {/* 찜 해제 버튼 */}
                  <button
                    onClick={(e) => handleRemoveFavorite(profile.id, e)}
                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

