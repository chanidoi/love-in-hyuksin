'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface LunchRequest {
  id: string
  requester_id: string
  receiver_id: string
  proposed_date: string
  status: string
}

export default function ReviewPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lunchRequest, setLunchRequest] = useState<LunchRequest | null>(null)
  const [reviewedUserId, setReviewedUserId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // 평가 항목들
  const [firstImpression, setFirstImpression] = useState('')
  const [conversation, setConversation] = useState('')
  const [manner, setManner] = useState('')
  const [punctuality, setPunctuality] = useState('')
  const [overall, setOverall] = useState('')
  const [wantToChat, setWantToChat] = useState<boolean | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadLunchRequest(params.id as string)
    }
  }, [user, params.id])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setLoading(false)
  }

  const loadLunchRequest = async (requestId: string) => {
    const { data, error } = await supabase
      .from('lunch_requests')
      .select('id, requester_id, receiver_id, proposed_date, status')
      .eq('id', requestId)
      .single()

    if (error) {
      console.error('Error loading lunch request:', error)
      setMessage('점심 약속 정보를 찾을 수 없습니다.')
      setLoading(false)
    } else {
      setLunchRequest(data)
      // 상대방 ID 찾기
      const otherUserId = data.requester_id === user?.id ? data.receiver_id : data.requester_id
      setReviewedUserId(otherUserId)
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user || !lunchRequest || !reviewedUserId) return

    // 모든 평가 항목이 선택되었는지 확인
    if (!firstImpression || !conversation || !manner || !punctuality || !overall) {
      setMessage('모든 평가 항목을 선택해주세요.')
      return
    }

    // want_to_chat이 선택되었는지 확인
    if (wantToChat === null) {
      setMessage('대화 이어가기 여부를 선택해주세요.')
      return
    }

    setSubmitting(true)
    setMessage('')

    const { error } = await supabase
      .from('reviews')
      .insert({
        lunch_request_id: params.id as string,
        reviewer_id: user.id,
        reviewed_id: reviewedUserId,
        first_impression: firstImpression,
        conversation: conversation,
        manner: manner,
        punctuality: punctuality,
        overall: overall,
        want_to_chat: wantToChat,
      })

    if (error) {
      setMessage('오류: ' + error.message)
      setSubmitting(false)
    } else {
      setMessage('평가가 완료되었습니다!')
      setTimeout(() => {
        router.push('/lunch')
      }, 1500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  if (!lunchRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-4">점심 약속 정보를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push('/lunch')}
            className="text-pink-500 hover:underline"
          >
            점심 페이지로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-pink-500 mb-6">만남 후 평가</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            오늘의 만남은 어떠셨나요?
          </h2>

          <div className="space-y-6">
            {/* 첫인상 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. 첫인상
              </label>
              <select
                value={firstImpression}
                onChange={(e) => setFirstImpression(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <optgroup label="좋은평">
                  <option value="첫인상이 좋았어요">첫인상이 좋았어요</option>
                  <option value="깔끔한 스타일이에요">깔끔한 스타일이에요</option>
                  <option value="밝은 분위기예요">밝은 분위기예요</option>
                </optgroup>
                <optgroup label="중립평">
                  <option value="기대와 조금 달랐어요">기대와 조금 달랐어요</option>
                  <option value="무난한 인상이에요">무난한 인상이에요</option>
                  <option value="조금 어색했어요">조금 어색했어요</option>
                </optgroup>
              </select>
            </div>

            {/* 대화 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. 대화
              </label>
              <select
                value={conversation}
                onChange={(e) => setConversation(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <optgroup label="좋은평">
                  <option value="대화가 잘 통했어요">대화가 잘 통했어요</option>
                  <option value="말을 잘 들어줘요">말을 잘 들어줘요</option>
                  <option value="유머 감각이 있어요">유머 감각이 있어요</option>
                </optgroup>
                <optgroup label="중립평">
                  <option value="대화가 조금 어려웠어요">대화가 조금 어려웠어요</option>
                  <option value="말수가 적은 편이에요">말수가 적은 편이에요</option>
                  <option value="대화 주제가 제한적이었어요">대화 주제가 제한적이었어요</option>
                </optgroup>
              </select>
            </div>

            {/* 매너 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. 매너
              </label>
              <select
                value={manner}
                onChange={(e) => setManner(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <optgroup label="좋은평">
                  <option value="예의가 바른 분이에요">예의가 바른 분이에요</option>
                  <option value="배려심이 느껴졌어요">배려심이 느껴졌어요</option>
                  <option value="편안한 분위기를 만들어줘요">편안한 분위기를 만들어줘요</option>
                </optgroup>
                <optgroup label="중립평">
                  <option value="조금 서툰 느낌이 있었어요">조금 서툰 느낌이 있었어요</option>
                  <option value="배려가 아쉬웠어요">배려가 아쉬웠어요</option>
                  <option value="긴장한 모습이 보였어요">긴장한 모습이 보였어요</option>
                </optgroup>
              </select>
            </div>

            {/* 시간/약속 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4. 시간/약속
              </label>
              <select
                value={punctuality}
                onChange={(e) => setPunctuality(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <optgroup label="좋은평">
                  <option value="시간 약속을 잘 지켜요">시간 약속을 잘 지켜요</option>
                  <option value="준비를 잘 해오셨어요">준비를 잘 해오셨어요</option>
                </optgroup>
                <optgroup label="중립평">
                  <option value="시간이 조금 늦었어요">시간이 조금 늦었어요</option>
                  <option value="준비가 아쉬웠어요">준비가 아쉬웠어요</option>
                </optgroup>
              </select>
            </div>

            {/* 전체 느낌 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                5. 전체 느낌
              </label>
              <select
                value={overall}
                onChange={(e) => setOverall(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700"
              >
                <option value="">선택하세요</option>
                <optgroup label="좋은평">
                  <option value="다시 만나고 싶어요">다시 만나고 싶어요</option>
                  <option value="시간 가는 줄 몰랐어요">시간 가는 줄 몰랐어요</option>
                  <option value="호감이 생겼어요">호감이 생겼어요</option>
                </optgroup>
                <optgroup label="중립평">
                  <option value="좋은 분이지만 저와는 달랐어요">좋은 분이지만 저와는 달랐어요</option>
                  <option value="무난한 만남이었어요">무난한 만남이었어요</option>
                  <option value="친구로는 좋을 것 같아요">친구로는 좋을 것 같아요</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* 대화 이어가기 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            오늘의 인연과 대화를 이어가시겠어요?
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => setWantToChat(true)}
              className={`flex-1 p-4 rounded-lg font-medium transition-colors ${
                wantToChat === true
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              예
            </button>
            <button
              onClick={() => setWantToChat(false)}
              className={`flex-1 p-4 rounded-lg font-medium transition-colors ${
                wantToChat === false
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              아니오
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-pink-500 text-white p-4 rounded-lg hover:bg-pink-600 disabled:bg-gray-400 font-medium text-lg"
        >
          {submitting ? '제출 중...' : '평가 완료'}
        </button>
      </div>
    </div>
  )
}

