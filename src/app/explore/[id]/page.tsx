'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

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
  bio: string | null
  interests: string[] | null
}

interface Review {
  id: string
  first_impression: string
  conversation: string
  manner: string
  punctuality: string
  overall: string
  created_at: string
}

export default function ProfileDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadProfile()
      checkPendingRequest(params.id as string)
      loadReviews(params.id as string)
    } else if (user && !params.id) {
      // params.id가 없으면 로딩 종료
      setLoading(false)
    }
  }, [user, params.id])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
  }

  const loadProfile = async () => {
    if (!params.id) {
      console.log('No profile ID provided')
      setLoading(false)
      return
    }

    console.log('Loading profile for ID:', params.id)
    setLoading(true)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single()

    console.log('Profile data:', data, 'Error:', error)

    if (error || !data) {
      console.error('Failed to load profile:', error)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  const checkPendingRequest = async (receiverId: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from('lunch_requests')
      .select('*')
      .eq('requester_id', user.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle()

    if (!error && data) {
      setHasPendingRequest(true)
    }
  }

  const loadReviews = async (reviewedId: string) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, first_impression, conversation, manner, punctuality, overall, created_at')
      .eq('reviewed_id', reviewedId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error loading reviews:', error)
    } else {
      setReviews(data || [])
    }
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

  const handleLunchProposal = () => {
    if (hasPendingRequest) {
      setMessage('이미 제안을 보낸 상대입니다')
      return
    }
    // 모달 대신 별도 페이지로 이동
    router.push(`/propose/${params.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <div className="text-center">
          <p className="text-red-500 mb-4">회원 정보를 찾을 수 없습니다.</p>
          <Link
            href="/explore"
            className="text-pink-500 hover:underline"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF2F4] flex flex-col">
      {/* 상단 뒤로가기 */}
      <div className="p-4 flex-shrink-0">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className="w-6 h-6 text-gray-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 프로필 이미지 - 가운데 정렬, 오버레이 */}
      <div className="px-5 flex-shrink-0">
        <div className="relative h-[35vh] max-h-[280px] rounded-2xl overflow-hidden shadow-lg mx-auto max-w-[280px]">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.nickname || '프로필'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = document.createElement('div')
                  fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-300 to-pink-500 text-white text-6xl font-bold'
                  fallback.textContent = profile.nickname?.[0]?.toUpperCase() || '?'
                  parent.appendChild(fallback)
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-300 to-pink-500 text-white text-6xl font-bold">
              {profile.nickname?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          {/* 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* 닉네임, 나이 오버레이 */}
          <div className="absolute bottom-4 left-4">
            <h1 className="text-white text-xl font-bold">
              {profile.nickname || '닉네임 없음'}
            </h1>
            {profile.birth_year && (
              <p className="text-white/80">
                {calculateAge(profile.birth_year)}세
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 프로필 정보 카드 - 간결하게 */}
      <div className="flex-1 px-5 py-4 overflow-auto">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {/* 닉네임, 나이 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-[#F472B6]">
              {profile.nickname || '닉네임 없음'}
            </span>
            <span className="text-gray-500 text-sm">
              {getGenderDisplay(profile.gender)}
              {profile.birth_year && ` • ${calculateAge(profile.birth_year)}세`}
            </span>
          </div>
          
          {/* 기본 정보 - 2열 그리드 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-1">소속기관</p>
              <p className="font-medium text-gray-700">{profile.organization || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">혁신도시</p>
              <p className="font-medium text-gray-700">{profile.innovation_city || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">직급</p>
              <p className="font-medium text-gray-700">{profile.job_level || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">업무분야</p>
              <p className="font-medium text-gray-700">{profile.job_field || '-'}</p>
            </div>
          </div>
          
          {/* About Me */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">About Me</p>
            <p className="text-sm text-gray-600">
              {profile.bio || '안녕하세요! 좋은 만남을 기대합니다.'}
            </p>
          </div>
          
          {/* 관심사 */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">관심사</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-pink-50 text-[#F472B6] text-xs rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 받은 후기 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-[#F472B6] font-medium mb-2">받은 후기</p>
            {reviews.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-400 text-center">아직 받은 후기가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-pink-50 border border-pink-200 rounded-lg p-3"
                  >
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-pink-600">첫인상:</span>{' '}
                        <span className="text-gray-700">{review.first_impression}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-pink-600">대화:</span>{' '}
                        <span className="text-gray-700">{review.conversation}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-pink-600">매너:</span>{' '}
                        <span className="text-gray-700">{review.manner}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-pink-600">시간/약속:</span>{' '}
                        <span className="text-gray-700">{review.punctuality}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-pink-600">전체 느낌:</span>{' '}
                        <span className="text-gray-700">{review.overall}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 버튼 - 고정 */}
      <div className="flex-shrink-0 px-5 pb-24 pt-2">
        <button
          onClick={handleLunchProposal}
          disabled={hasPendingRequest}
          className={`w-full py-3 rounded-full font-semibold ${
            hasPendingRequest
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-[#F472B6] text-white'
          }`}
        >
          {hasPendingRequest ? '이미 제안을 보낸 상대입니다' : '점심 제안하기'}
        </button>
        {message && (
          <p className={`text-center mt-1 text-xs ${
            message.includes('오류') || message.includes('이미')
              ? 'text-red-500'
              : 'text-green-500'
          }`}>
            {message}
          </p>
        )}
        <button
          onClick={() => router.push('/explore')}
          className="w-full py-2 text-[#F472B6] text-center text-sm mt-1"
        >
          목록으로 돌아가기
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

