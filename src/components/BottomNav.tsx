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
    { 
      path: '/', 
      count: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      )
    },
    { 
      path: '/explore', 
      count: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      )
    },
    { 
      path: '/lunch', 
      count: newLunchCount,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
        </svg>
      )
    },
    { 
      path: '/chat', 
      count: unreadChatCount,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      )
    },
    { 
      path: '/profile', 
      count: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      )
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="flex justify-around items-center py-3 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex items-center justify-center relative"
            >
              <div className={`relative ${isActive ? 'bg-[#F472B6] text-white rounded-full p-2' : 'text-gray-400'}`}>
                {item.icon}
                {item.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-2 h-2"></span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

