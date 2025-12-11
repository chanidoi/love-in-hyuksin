'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Message {
  id: string
  chat_room_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: {
    nickname: string
  }
}

interface ChatRoom {
  id: string
  user1_id: string
  user2_id: string
}

interface OtherUser {
  nickname: string
  avatar_url: string | null
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user && params.id) {
      loadChatRoom()
      loadMessages()
      // 5초마다 메시지 새로고침
      const interval = setInterval(() => {
        loadMessages()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [user, params.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setLoading(false)
  }

  const loadChatRoom = async () => {
    if (!user || !params.id) return

    const { data, error } = await supabase
      .from('chat_rooms')
      .select('id, user1_id, user2_id')
      .eq('id', params.id as string)
      .single()

    if (error) {
      console.error('Error loading chat room:', error)
      return
    }

    setChatRoom(data)
    
    // 상대방 ID 찾기
    const otherUserId = data.user1_id === user.id ? data.user2_id : data.user1_id
    
    // 상대방 프로필 조회 (닉네임, avatar_url)
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('id', otherUserId)
      .single()

    if (profile) {
      setOtherUser({
        nickname: profile.nickname,
        avatar_url: profile.avatar_url
      })
    }
  }

  const loadMessages = async () => {
    if (!params.id || !user) return

    const { data, error } = await supabase
      .from('messages')
      .select('id, chat_room_id, sender_id, content, created_at')
      .eq('chat_room_id', params.id as string)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
    } else {
      setMessages(data || [])
      
      // 읽지 않은 메시지를 읽음으로 표시
      const unreadMessages = (data || []).filter(
        msg => msg.sender_id !== user.id
      )
      
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id)
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', messageIds)
      }
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !params.id || sending) return

    setSending(true)

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: params.id as string,
        sender_id: user.id,
        content: newMessage.trim(),
        is_read: false,
      })

    if (error) {
      console.error('Error sending message:', error)
      alert('메시지 전송에 실패했습니다.')
    } else {
      setNewMessage('')
      // 메시지 목록 새로고침
      loadMessages()
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }

    setSending(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF2F4]">
        <p className="text-[#F472B6]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDF2F4]">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* 프로필 이미지 */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.nickname}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+RiDwvdGV4dD48L3N2Zz4='
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
          )}
        </div>

        {/* 이름 + Active Now */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {otherUser?.nickname || '채팅 상대'}
          </h1>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Active Now
          </p>
        </div>

        {/* 더보기 버튼 */}
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            아직 메시지가 없습니다.
          </div>
        ) : (
          messages.map((message) => {
            const isMyMessage = message.sender_id === user?.id
            return (
              <div
                key={message.id}
                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-xs lg:max-w-md">
                  <div
                    className={`px-4 py-2 ${
                      isMyMessage
                        ? 'bg-[#F9A8D4] text-white rounded-2xl rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                  </div>
                  <p className={`text-xs mt-1 px-1 ${isMyMessage ? 'text-right' : 'text-left'} text-gray-400`}>
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력창 */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          {/* 첨부 버튼 */}
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* 입력 필드 */}
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#F472B6] text-gray-700 placeholder-gray-400"
            disabled={sending}
          />

          {/* 전송 버튼 */}
          <button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="p-2 bg-[#F472B6] text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
