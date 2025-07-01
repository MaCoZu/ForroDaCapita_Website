import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { FC, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month}. ${year}`
}

//TODO: _blank not working, Markdown Headings not working
const renderer = new marked.Renderer()
renderer.link = function ({
  href = '',
  title,
  text = '',
}: {
  href?: string
  title?: string | null
  text?: string
}) {
  const sanitizedHref = DOMPurify.sanitize(href)
  return `<a href="${sanitizedHref}" class="text-accent" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`
}

interface Message {
  id: number
  content: string
  created_at: string
  user_id?: number | string
}

interface MessageBoardProps {
  containerClasses?: string
}

const MessageBoard: FC<MessageBoardProps> = ({ containerClasses }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const baseContentClasses = 'flex items-center justify-center w-full'
  const mergedContentClasses = twMerge(baseContentClasses, containerClasses)

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
    // init()
    // For now, just fetch messages without auth
    fetchMessages()
  }, [])

  const preprocessMessage = (text: string) => {
    // Replace single newlines not followed by another newline with two spaces + newline (Markdown line break)
    return text.replace(/([^\n])\n(?!\n)/g, '$1  \n')
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim()) return

    const payload = { content: preprocessMessage(message.trim()) }
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
        <h2 className="text-secondary-content font-gokhan text-center text-2xl font-bold tracking-wider">
          Guest Book
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="right-0 mt-2 flex justify-end gap-3">
            {/* bold  */}
            <button
              type="button"
              className=""
              onClick={() => {
                const start = message.slice(
                  0,
                  textareaRef.current?.selectionStart ?? 0
                )
                const end = message.slice(
                  textareaRef.current?.selectionEnd ?? 0
                )
                setMessage(`${start}**bold**${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.5em"
                height="1.5em"
                viewBox="0 0 256 256"
              >
                <path
                  fill="currentColor"
                  d="M185.08 114.46A48 48 0 0 0 148 36H80a12 12 0 0 0-12 12v152a12 12 0 0 0 12 12h80a52 52 0 0 0 25.08-97.54M92 60h56a24 24 0 0 1 0 48H92Zm68 128H92v-56h68a28 28 0 0 1 0 56"
                />
              </svg>
            </button>
            {/* italic  */}
            <button
              type="button"
              className=""
              onClick={() => {
                const start = message.slice(
                  0,
                  textareaRef.current?.selectionStart ?? 0
                )
                const end = message.slice(
                  textareaRef.current?.selectionEnd ?? 0
                )
                setMessage(`${start}*italic*${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.5em"
                height="1.5em"
                viewBox="0 0 256 256"
              >
                <path
                  fill="currentColor"
                  d="M204 56a12 12 0 0 1-12 12h-31.35l-40 120H144a12 12 0 0 1 0 24H64a12 12 0 0 1 0-24h31.35l40-120H112a12 12 0 0 1 0-24h80a12 12 0 0 1 12 12"
                />
              </svg>
            </button>
            {/* soft return  */}
            <button
              type="button"
              className=""
              onClick={() => {
                const start = message.slice(
                  0,
                  textareaRef.current?.selectionStart ?? 0
                )
                const end = message.slice(
                  textareaRef.current?.selectionEnd ?? 0
                )
                setMessage(`${start}\n${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2em"
                height="2em"
                viewBox="0 0 256 256"
              >
                <path
                  fill="currentColor"
                  d="M180 104v32a4 4 0 0 1-4 4H89.66l17.17 17.17a4 4 0 0 1-5.66 5.66l-24-24a4 4 0 0 1 0-5.66l24-24a4 4 0 0 1 5.66 5.66L89.66 132H172v-28a4 4 0 0 1 8 0m48-48v144a12 12 0 0 1-12 12H40a12 12 0 0 1-12-12V56a12 12 0 0 1 12-12h176a12 12 0 0 1 12 12m-8 0a4 4 0 0 0-4-4H40a4 4 0 0 0-4 4v144a4 4 0 0 0 4 4h176a4 4 0 0 0 4-4Z"
                />
              </svg>
            </button>
          </div>

          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered text-base-content bg-base-100 placeholder-base-content/80 focus:ring-base-content mt-1 h-18 w-full rounded-md text-lg focus:border-transparent focus:ring-1 focus:outline-none"
            placeholder={`Feedback, wish, or link to your playlist.\nUse Markdown formatting or the buttons above.`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
          <button
            className="btn btn-secondary my-2 rounded-md font-bold"
            disabled={!message.trim()}
          >
            Post
          </button>
        </form>

        <div className="border-base-content h-[72vh] w-full resize-y space-y-4 overflow-y-auto rounded-md border p-2">
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
                  className="text-base-content bg-base-100 border-base-content/20 border-b p-2 text-lg"
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        marked(msg.content, { renderer }) as string
                      ),
                    }}
                  />
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
