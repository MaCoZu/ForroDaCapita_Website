import type { FC, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month}. ${year}`
}
interface Message {
  id: number
  content: string
  created_at: string
  user_id?: number | string
}

interface MessageBoardProps {
  extraClasses?: string
}

const MessageBoard: FC<MessageBoardProps> = ({ extraClasses }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const baseContentClasses = 'flex items-center justify-center w-full'
  const mergedContentClasses = twMerge(baseContentClasses, extraClasses)

  // Fetch messages from server-side API
  async function fetchMessages() {
    try {
      const res = await fetch('/api/messages')
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to fetch messages')
      setMessages(result as Message[])
    } catch (err: any) {
      setError(err.message || String(err))
      console.error('Fetch messages error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth', { method: 'POST' })
        const result = await res.json()

        if (result.user) {
          setUserId(result.user.id)
          await fetchMessages()
        } else {
          throw new Error(result.error || 'Failed to authenticate')
        }
      } catch (err: any) {
        setError(err.message || String(err))
        console.error('Initialization error:', err)
      }
    }
    // Uncomment to enable authentication/init logic
    // init();
    // For now, just fetch messages without auth
    fetchMessages()
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim()) return

    const payload = { content: message.trim() }
    console.log('Sending payload:', payload)

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok) {
        console.error('Failed to post:', result.error)
        setError(result.error || 'Failed to post message')
      } else {
        setMessage('')
        setError('')
        await fetchMessages()
      }
    } catch (err: any) {
      setError(err.message || String(err))
      console.error('Post error:', err)
    }
  }

  return (
    <div className={mergedContentClasses}>
      <div className="w-full">
        <h2 className="text-secondary font-gokhan text-center text-2xl font-bold tracking-wider">
          Guest Book
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <textarea
            className="textarea textarea-bordered text-base-content bg-base-100 placeholder-base-content/80 text-md focus:ring-primary mt-4 h-14 w-full rounded-md focus:border-transparent focus:ring-1 focus:outline-none"
            placeholder="Feedback, wish, or link to your playlist."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
          <button
            className="btn btn-secondary text-base-100 my-2 rounded-md"
            disabled={!message.trim()}
          >
            Post
          </button>
        </form>

        <div className="h-[50vh] w-full space-y-4 overflow-y-auto">
          {error && <div className="text-error mt-2">{error}</div>}
          {loading ? (
            <p>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-gray-500">No messages yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="text-base-content bg-base-100 rounded border p-2"
                >
                  <p>{msg.content}</p>
                  <small className="text-gray-500">
                    {formatDate(msg.created_at)}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default MessageBoard
