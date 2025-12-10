'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

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

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUserNickname, setOtherUserNickname] = useState('')
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    
    // 상대방 닉네임 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', otherUserId)
      .single()

    if (profile) {
      setOtherUserNickname(profile.nickname)
    }
  }

  const loadMessages = async () => {
    if (!params.id) return

    const { data, error } = await supabase
      .from('messages')
      .select('id, chat_room_id, sender_id, content, created_at')
      .eq('chat_room_id', params.id as string)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
    } else {
      setMessages(data || [])
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
      })

    if (error) {
      console.error('Error sending message:', error)
      alert('메시지 전송에 실패했습니다.')
    } else {
      setNewMessage('')
      // 메시지 목록 새로고침
      loadMessages()
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-pink-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 상단 헤더 */}
      <div className="bg-pink-500 text-white p-4 flex items-center gap-4 shadow-md">
        <button
          onClick={() => router.back()}
          className="text-white hover:text-gray-200"
        >
          ← 뒤로
        </button>
        <h1 className="text-lg font-semibold flex-1">
          {otherUserNickname || '채팅 상대'}
        </h1>
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
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isMyMessage
                      ? 'bg-pink-500 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMyMessage ? 'text-pink-100' : 'text-gray-500'
                    }`}
                  >
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
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 placeholder-gray-400"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="bg-pink-500 text-white px-6 py-2 rounded-full hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {sending ? '전송 중...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  )
}

