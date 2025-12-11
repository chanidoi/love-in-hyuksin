'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MatchingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // 본인 정보
  const [smoking, setSmoking] = useState('')
  const [height, setHeight] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [drinking, setDrinking] = useState('')
  const [mbti, setMbti] = useState('')
  const [religion, setReligion] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [hasChildren, setHasChildren] = useState('')
  const [pet, setPet] = useState('')

  // 상대 조건
  const [prefSmoking, setPrefSmoking] = useState('')
  const [prefMinHeight, setPrefMinHeight] = useState('')
  const [prefBodyType, setPrefBodyType] = useState('')
  const [prefDrinking, setPrefDrinking] = useState('')
  const [prefReligion, setPrefReligion] = useState('')
  const [prefMaritalStatus, setPrefMaritalStatus] = useState('')
  const [prefHasChildren, setPrefHasChildren] = useState('')
  const [prefMinAge, setPrefMinAge] = useState('')
  const [prefMaxAge, setPrefMaxAge] = useState('')
  const [excludeSameOrg, setExcludeSameOrg] = useState(false)

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
    
    // 기존 매칭 정보 로드
    const { data: preferences } = await supabase
      .from('matching_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (preferences) {
      setSmoking(preferences.smoking || '')
      setHeight(preferences.height || '')
      setBodyType(preferences.body_type || '')
      setDrinking(preferences.drinking || '')
      setMbti(preferences.mbti || '')
      setReligion(preferences.religion || '')
      setMaritalStatus(preferences.marriage_history || '')
      setHasChildren(preferences.has_children || '')
      setPet(preferences.pet || '')
      
      setPrefSmoking(preferences.prefer_smoking || '')
      setPrefMinHeight(preferences.prefer_height_min || '')
      setPrefBodyType(preferences.prefer_body_type || '')
      setPrefDrinking(preferences.prefer_drinking || '')
      setPrefReligion(preferences.prefer_religion || '')
      setPrefMaritalStatus(preferences.prefer_marriage_history || '')
      setPrefHasChildren(preferences.prefer_has_children || '')
      setPrefMinAge(preferences.prefer_age_min || '')
      setPrefMaxAge(preferences.prefer_age_max || '')
      setExcludeSameOrg(preferences.exclude_same_organization || false)
    }

    setLoading(false)
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('matching_preferences')
      .upsert({
        user_id: user.id,
        smoking,
        height,
        body_type: bodyType,
        drinking,
        mbti,
        religion,
        marriage_history: maritalStatus,
        has_children: hasChildren,
        pet,
        prefer_smoking: prefSmoking,
        prefer_height_min: prefMinHeight,
        prefer_body_type: prefBodyType,
        prefer_drinking: prefDrinking,
        prefer_religion: prefReligion,
        prefer_marriage_history: prefMaritalStatus,
        prefer_has_children: prefHasChildren,
        prefer_age_min: prefMinAge ? parseInt(prefMinAge) : null,
        prefer_age_max: prefMaxAge ? parseInt(prefMaxAge) : null,
        exclude_same_organization: excludeSameOrg,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      setMessage('오류: ' + error.message)
    } else {
      setMessage('매칭 정보가 저장되었습니다!')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  const mbtiTypes = [
    'INFP', 'ENFP', 'INFJ', 'ENFJ',
    'INTJ', 'ENTJ', 'INTP', 'ENTP',
    'ISFP', 'ESFP', 'ISTP', 'ESTP',
    'ISFJ', 'ESFJ', 'ISTJ', 'ESTJ'
  ]

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-pink-500">매칭 정보</h1>
          <Link
            href="/profile"
            className="text-pink-500 hover:underline"
          >
            프로필로 돌아가기
          </Link>
        </div>

        {/* 본인 정보 섹션 */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">본인 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                흡연
              </label>
              <select
                value={smoking}
                onChange={(e) => setSmoking(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="비흡연">비흡연</option>
                <option value="흡연">흡연</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                키
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="160cm 미만">160cm 미만</option>
                <option value="160-165cm">160-165cm</option>
                <option value="165-170cm">165-170cm</option>
                <option value="170-175cm">170-175cm</option>
                <option value="175-180cm">175-180cm</option>
                <option value="180-185cm">180-185cm</option>
                <option value="185cm 이상">185cm 이상</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                체형
              </label>
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="마름">마름</option>
                <option value="보통">보통</option>
                <option value="통통">통통</option>
                <option value="근육">근육</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                음주
              </label>
              <select
                value={drinking}
                onChange={(e) => setDrinking(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="안함">안함</option>
                <option value="가끔">가끔</option>
                <option value="자주">자주</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MBTI
              </label>
              <select
                value={mbti}
                onChange={(e) => setMbti(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                {mbtiTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종교
              </label>
              <select
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="무교">무교</option>
                <option value="기독교">기독교</option>
                <option value="천주교">천주교</option>
                <option value="불교">불교</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                결혼이력
              </label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="미혼">미혼</option>
                <option value="돌싱">돌싱</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                자녀유무
              </label>
              <select
                value={hasChildren}
                onChange={(e) => setHasChildren(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="없음">없음</option>
                <option value="있음">있음</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                반려동물
              </label>
              <select
                value={pet}
                onChange={(e) => setPet(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="없음">없음</option>
                <option value="강아지">강아지</option>
                <option value="고양이">고양이</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>
        </div>

        {/* 상대 조건 섹션 */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">상대 조건</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                흡연
              </label>
              <select
                value={prefSmoking}
                onChange={(e) => setPrefSmoking(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="상관없음">상관없음</option>
                <option value="비흡연만">비흡연만</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                최소키
              </label>
              <select
                value={prefMinHeight}
                onChange={(e) => setPrefMinHeight(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="상관없음">상관없음</option>
                <option value="160cm 이상">160cm 이상</option>
                <option value="165cm 이상">165cm 이상</option>
                <option value="170cm 이상">170cm 이상</option>
                <option value="175cm 이상">175cm 이상</option>
                <option value="180cm 이상">180cm 이상</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                체형
              </label>
              <select
                value={prefBodyType}
                onChange={(e) => setPrefBodyType(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="상관없음">상관없음</option>
                <option value="마름">마름</option>
                <option value="보통">보통</option>
                <option value="통통">통통</option>
                <option value="근육">근육</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                음주
              </label>
              <select
                value={prefDrinking}
                onChange={(e) => setPrefDrinking(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="상관없음">상관없음</option>
                <option value="안함">안함</option>
                <option value="가끔">가끔</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종교
              </label>
              <select
                value={prefReligion}
                onChange={(e) => setPrefReligion(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="상관없음">상관없음</option>
                <option value="무교">무교</option>
                <option value="기독교">기독교</option>
                <option value="천주교">천주교</option>
                <option value="불교">불교</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                결혼이력
              </label>
              <select
                value={prefMaritalStatus}
                onChange={(e) => setPrefMaritalStatus(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="상관없음">상관없음</option>
                <option value="미혼만">미혼만</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                자녀유무
              </label>
              <select
                value={prefHasChildren}
                onChange={(e) => setPrefHasChildren(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <option value="상관없음">상관없음</option>
                <option value="없음만">없음만</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                나이범위 (최소)
              </label>
              <input
                type="number"
                value={prefMinAge}
                onChange={(e) => setPrefMinAge(e.target.value)}
                placeholder="예: 25"
                min="20"
                max="60"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                나이범위 (최대)
              </label>
              <input
                type="number"
                value={prefMaxAge}
                onChange={(e) => setPrefMaxAge(e.target.value)}
                placeholder="예: 35"
                min="20"
                max="60"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={excludeSameOrg}
                  onChange={(e) => setExcludeSameOrg(e.target.checked)}
                  className="w-5 h-5 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  같은 직장 제외
                </span>
              </label>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-pink-500 text-white p-3 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium"
        >
          {saving ? '저장 중...' : '매칭 정보 저장'}
        </button>

        {message && (
          <p className={`text-center mt-4 ${message.includes('오류') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

