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
  otherUserAvatarUrl: string | null
  lastMessage?: {
    content: string
    created_at: string
  }
  unreadCount: number
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
    const { data: roomsData } = await supabase
      .from('chat_rooms')
      .select('id, user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('id', { ascending: false })

    if (!roomsData || roomsData.length === 0) {
      setChatRooms([])
      return
    }

    // 2단계: 상대방 프로필 조회 (닉네임, avatar_url)
    const allOtherUserIds = roomsData.map(room => 
      room.user1_id === user.id ? room.user2_id : room.user1_id
    )
    const uniqueOtherUserIds = Array.from(new Set(allOtherUserIds))

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', uniqueOtherUserIds)

    // 3단계: 각 채팅방의 마지막 메시지 조회
    const roomIds = roomsData.map(room => room.id)
    const { data: lastMessagesData } = await supabase
      .from('messages')
      .select('chat_room_id, content, created_at')
      .in('chat_room_id', roomIds)
      .order('created_at', { ascending: false })

    // 4단계: 읽지 않은 메시지 개수 조회
    const { data: unreadMessagesData } = await supabase
      .from('messages')
      .select('chat_room_id')
      .in('chat_room_id', roomIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    // 각 채팅방별로 마지막 메시지와 읽지 않은 메시지 개수 찾기
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

    const unreadCountByRoom: Record<string, number> = {}
    if (unreadMessagesData) {
      unreadMessagesData.forEach(msg => {
        unreadCountByRoom[msg.chat_room_id] = (unreadCountByRoom[msg.chat_room_id] || 0) + 1
      })
    }

    // 5단계: 데이터 합치기
    const mergedRooms = roomsData.map(room => {
      const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id
      const otherUserProfile = profilesData?.find(p => p.id === otherUserId)
      const lastMessage = lastMessagesByRoom[room.id]
      const unreadCount = unreadCountByRoom[room.id] || 0

      return {
        ...room,
        otherUserNickname: otherUserProfile?.nickname || '알 수 없음',
        otherUserAvatarUrl: otherUserProfile?.avatar_url || null,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          created_at: lastMessage.created_at
        } : undefined,
        unreadCount
      }
    })

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
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF2F4] pb-24">
      {/* 상단 헤더 */}
      <div 
        className="pt-12 pb-6 px-4"
        style={{
          background: 'linear-gradient(135deg, #F472B6 0%, #ec4899 100%)'
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white">채팅</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {chatRooms.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-500">아직 채팅이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatRooms.map((room) => (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* 프로필 이미지 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                      {room.otherUserAvatarUrl ? (
                        <img
                          src={room.otherUserAvatarUrl}
                          alt={room.otherUserNickname}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4='
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                          <span className="text-2xl">👤</span>
                        </div>
                      )}
                    </div>
                    {/* 읽지 않은 메시지 빨간 점 */}
                    {room.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>

                  {/* 채팅방 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
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
    </div>
  )
}
