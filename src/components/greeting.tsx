'use client'

import { useEffect, useState } from 'react'

interface GreetingProps {
  name: string
}

export function Greeting({ name }: GreetingProps) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting('Good morning')
    } else if (hour < 17) {
      setGreeting('Good afternoon')
    } else {
      setGreeting('Good evening')
    }
  }, [])

  const firstName = name.split(' ')[0]

  if (!greeting) return null

  return (
    <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight text-gray-900">
      {greeting}, {firstName}
    </h1>
  )
}
