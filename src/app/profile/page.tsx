'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const INTERESTS = ['카페', '맛집탐방', '영화', '독서', '운동', '여행', '음악', '게임', '요리']

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female')
  
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [organization, setOrganization] = useState('')
  const [city, setCity] = useState('')
  const [position, setPosition] = useState('')
  const [field, setField] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setEmail(user.email || '')
    
    // 기존 프로필 데이터 로드
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setNickname(profile.nickname || '')
      setGender(profile.gender || '')
      setBirthYear(profile.birth_year || '')
      setOrganization(profile.organization || '')
      setCity(profile.innovation_city || '')
      setPosition(profile.job_level || '')
      setField(profile.job_field || '')
      setAvatarUrl(profile.avatar_url || '')
      setInterests(profile.interests || [])
      if (profile.gender) {
        setSelectedGender(profile.gender as 'male' | 'female')
      }
    }

    setLoading(false)
  }

  const handleAvatarSelect = (avatarType: 'male' | 'female', index: number) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const avatarPath = `${supabaseUrl}/storage/v1/object/public/avatars/${avatarType}-${index + 1}.png`
    setAvatarUrl(avatarPath)
    setGender(avatarType)
    setSelectedGender(avatarType)
    setShowAvatarModal(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 파일 업로드 로직 (추후 구현)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
      setShowAvatarModal(false)
    }
  }

  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest))
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest])
      } else {
        setMessage('관심사는 최대 5개까지 선택할 수 있습니다.')
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        nickname,
        gender,
        birth_year: birthYear,
        organization,
        innovation_city: city,
        job_level: position,
        job_field: field,
        avatar_url: avatarUrl,
        interests,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('프로필이 저장되었습니다!')
    }

    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <div className="min-h-screen bg-[#FDF2F4] pb-24">
      {/* 상단 헤더 */}
      <div 
        className="pt-12 pb-6 px-4"
        style={{
          background: 'linear-gradient(135deg, #F472B6 0%, #ec4899 100%)'
        }}
      >
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">프로필</h1>
          <button
            onClick={handleLogout}
            className="bg-white/20 text-white px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8">
        {/* 프로필 사진 영역 */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-40 rounded-2xl bg-gray-200 overflow-hidden shadow-lg">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="프로필" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <span className="text-4xl text-gray-500">👤</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute bottom-0 right-0 bg-[#F472B6] text-white p-2 rounded-full shadow-lg hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGender('male')
                    setSelectedGender('male')
                  }}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    gender === 'male'
                      ? 'bg-[#F472B6] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  남성
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGender('female')
                    setSelectedGender('female')
                  }}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    gender === 'female'
                      ? 'bg-[#F472B6] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  여성
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">출생연도</label>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
              >
                <option value="">선택하세요</option>
                {Array.from({ length: 61 }, (_, i) => 2010 - i).map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}년
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">소속기관</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="소속기관을 입력하세요"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">혁신도시</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">직급</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="인턴/수습">인턴/수습</option>
                <option value="사원/주임">사원/주임</option>
                <option value="대리/선임">대리/선임</option>
                <option value="과장/책임">과장/책임</option>
                <option value="차장/수석 이상">차장/수석 이상</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">업무분야</label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F472B6] focus:border-[#F472B6] text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="기술/연구">기술/연구</option>
                <option value="경영/관리">경영/관리</option>
                <option value="사무/행정">사무/행정</option>
                <option value="IT/정보">IT/정보</option>
                <option value="안전/환경">안전/환경</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>
        </div>

        {/* 관심사 카드 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">관심사</h3>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => handleInterestToggle(interest)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  interests.includes(interest)
                    ? 'bg-[#F472B6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">최대 5개까지 선택 가능합니다 ({interests.length}/5)</p>
        </div>

        {/* 매칭 정보 설정 링크 */}
        <Link
          href="/matching"
          className="block w-full bg-white rounded-2xl p-4 shadow-sm mb-4 text-center text-[#F472B6] font-semibold hover:bg-gray-50 transition-colors"
        >
          매칭 정보 설정 →
        </Link>

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#F472B6] text-white rounded-full py-4 font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg mb-4"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>

        {message && (
          <p className={`text-center mb-4 ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </div>

      {/* 아바타 선택 모달 */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowAvatarModal(false)}>
          <div 
            className="bg-white rounded-t-3xl p-6 w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">프로필 사진 선택</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 성별 선택 */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                  selectedGender === 'female'
                    ? 'bg-[#F472B6] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                여성
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                  selectedGender === 'male'
                    ? 'bg-[#F472B6] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                남성
              </button>
            </div>

            {/* 아바타 그리드 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {Array.from({ length: 9 }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAvatarSelect(selectedGender, index)}
                  className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#F472B6] transition-colors"
                >
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/avatars/${selectedGender}-${index + 1}.png`}
                    alt={`${selectedGender === 'male' ? '남성' : '여성'} 아바타 ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4='
                    }}
                  />
                </button>
              ))}
            </div>

            {/* 구분선 */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-gray-500 text-sm">또는</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* 앨범에서 사진 선택 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              앨범에서 사진 선택
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  )
}
