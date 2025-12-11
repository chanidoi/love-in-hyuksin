'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function BottomNav() {
  const pathname = usePathname()
  const [newLunchCount, setNewLunchCount] = useState(0)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadNotifications()
      // 5초마다 알림 새로고침
      const interval = setInterval(() => {
        loadNotifications()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadNotifications = async () => {
    if (!user) return

    // 새 점심 제안 개수 조회
    const { data: lunchData, error: lunchError } = await supabase
      .from('lunch_requests')
      .select('id')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')

    if (!lunchError && lunchData) {
      setNewLunchCount(lunchData.length || 0)
    }

    // 읽지 않은 메시지 개수 조회
    // 먼저 현재 사용자가 참여한 채팅방 목록 조회
    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (!chatRoomsError && chatRooms) {
      const chatRoomIds = chatRooms.map(room => room.id)
      
      if (chatRoomIds.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id')
          .in('chat_room_id', chatRoomIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)

        if (!messagesError && messagesData) {
          setUnreadChatCount(messagesData.length || 0)
        }
      } else {
        setUnreadChatCount(0)
      }
    }
  }

  const navItems = [
    { icon: '🏠', label: '홈', path: '/' },
    { icon: '🔍', label: '탐색', path: '/explore' },
    { icon: '🍽️', label: '점심', path: '/lunch', count: newLunchCount },
    { icon: '💬', label: '채팅', path: '/chat', count: unreadChatCount },
    { icon: '💕', label: '매칭', path: '/matching' },
    { icon: '👤', label: '프로필', path: '/profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <span className="text-2xl mb-1 relative">
                {item.icon}
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </span>
              <span
                className={`text-xs ${
                  isActive ? 'text-pink-500' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

