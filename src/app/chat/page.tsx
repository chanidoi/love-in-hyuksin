'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ChatRoomWithLastMessage {
  id: string
  user1_id: string
  user2_id: string
  otherUserNickname: string
  lastMessage?: {
    content: string
    created_at: string
  }
}

export default function ChatListPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chatRooms, setChatRooms] = useState<ChatRoomWithLastMessage[]>([])

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadChatRooms()
      // 5초마다 채팅방 목록 새로고침
      const interval = setInterval(() => {
        loadChatRooms()
      }, 5000)

      return () => clearInterval(interval)
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

  const loadChatRooms = async () => {
    if (!user) return

    // 1단계: 내가 참여한 채팅방 조회
    const { data: roomsData, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('id, user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('id', { ascending: false })

    console.log('채팅방 조회 결과:', roomsData)
    console.log('채팅방 조회 오류:', roomsError)

    if (!roomsData || roomsData.length === 0) {
      setChatRooms([])
      return
    }

    // 2단계: 상대방 닉네임 조회
    const allOtherUserIds = roomsData.map(room => 
      room.user1_id === user.id ? room.user2_id : room.user1_id
    )
    const uniqueOtherUserIds = Array.from(new Set(allOtherUserIds))

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', uniqueOtherUserIds)

    console.log('프로필 조회 결과:', profilesData)
    console.log('프로필 조회 오류:', profilesError)

    // 3단계: 각 채팅방의 마지막 메시지 조회
    const roomIds = roomsData.map(room => room.id)
    const { data: lastMessagesData, error: messagesError } = await supabase
      .from('messages')
      .select('chat_room_id, content, created_at')
      .in('chat_room_id', roomIds)
      .order('created_at', { ascending: false })

    console.log('마지막 메시지 조회 결과:', lastMessagesData)
    console.log('마지막 메시지 조회 오류:', messagesError)

    // 각 채팅방별로 마지막 메시지 찾기
    const lastMessagesByRoom: Record<string, { content: string; created_at: string }> = {}
    if (lastMessagesData) {
      lastMessagesData.forEach(msg => {
        if (!lastMessagesByRoom[msg.chat_room_id]) {
          lastMessagesByRoom[msg.chat_room_id] = {
            content: msg.content,
            created_at: msg.created_at
          }
        }
      })
    }

    // 4단계: 데이터 합치기
    const mergedRooms = roomsData.map(room => {
      const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id
      const otherUserProfile = profilesData?.find(p => p.id === otherUserId)
      const lastMessage = lastMessagesByRoom[room.id]

      return {
        ...room,
        otherUserNickname: otherUserProfile?.nickname || '알 수 없음',
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          created_at: lastMessage.created_at
        } : undefined
      }
    })

    console.log('합쳐진 채팅방 데이터:', mergedRooms)
    setChatRooms(mergedRooms)
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-pink-500 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">채팅</h1>
      </div>

      {chatRooms.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">아직 채팅방이 없습니다</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {chatRooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="block bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="p-4 flex items-center gap-4">
                {/* 프로필 이미지 영역 (나중에 추가 가능) */}
                <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-600 text-xl">👤</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {room.otherUserNickname}
                    </h3>
                    {room.lastMessage && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(room.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  {room.lastMessage ? (
                    <p className="text-sm text-gray-600 truncate">
                      {room.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      메시지가 없습니다
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

