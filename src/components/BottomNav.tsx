'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { icon: '🏠', label: '홈', path: '/' },
    { icon: '🔍', label: '탐색', path: '/explore' },
    { icon: '🍽️', label: '점심', path: '/lunch' },
    { icon: '💬', label: '채팅', path: '/chat' },
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
              className="flex flex-col items-center justify-center flex-1 h-full"
            >
              <span className="text-2xl mb-1">{item.icon}</span>
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

