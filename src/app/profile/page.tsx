'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [organization, setOrganization] = useState('')
  const [city, setCity] = useState('')
  const [position, setPosition] = useState('')
  const [field, setField] = useState('')

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
    }

    setLoading(false)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-pink-500">프로필</h1>
          <div className="flex flex-col gap-2">
            <Link
              href="/matching"
              className="bg-pink-100 text-pink-500 hover:bg-pink-200 px-4 py-2 rounded-lg text-center"
            >
              매칭 정보 설정 →
            </Link>
            <button
              onClick={handleLogout}
              className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
            >
              로그아웃
            </button>
          </div>
        </div>

        {user && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">이메일</p>
            <p className="text-lg font-medium text-gray-800">{user.email}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              성별
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
            >
              <option value="">선택하세요</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              출생연도
            </label>
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              소속기관
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="소속기관을 입력하세요"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              혁신도시
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              직급
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              업무분야
            </label>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
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

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium"
          >
            {saving ? '저장 중...' : '프로필 저장'}
          </button>

          {message && (
            <p className={`text-center ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

