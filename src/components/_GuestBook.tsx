import DOMPurify from 'dompurify'
import { marked } from 'marked'
import type { ChangeEvent, FC, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month}. ${year}`
}

// Type for marked renderer link function parameters
interface LinkRendererParams {
  href?: string
  title?: string | null
  text?: string
}

// Custom renderer for marked to handle links and headings properly
const renderer = new marked.Renderer()

renderer.list = (token: List) => {
  const items = token.items
    .map((item) => {
      if (item.task) {
        return `<li><input type="checkbox" ${item.checked ? 'checked' : ''} disabled>${item.text}</input></li>`
      } else {
        return `<li>${item.text}</li>`
      }
    })
    .join('\n')

  if (token.ordered) {
    let start = ''
    if (token.start !== 1 && token.start !== undefined) {
      start = ` start="${token.start}"`
    }
    return `<ol${start}>\n${items}\n</ol>`
  } else {
    return `<ul>\n${items}\n</ul>`
  }
}

// Customize image rendering
renderer.image = (href: string | null, title: string | null, text: string) => {
  if (!href) return text
  const sanitizedHref = DOMPurify.sanitize(href)
  const sanitizedText = DOMPurify.sanitize(text)
  const sanitizedTitle = title ? DOMPurify.sanitize(title) : null

  const attributes = {
    src: sanitizedHref,
    alt: sanitizedText,
    ...(sanitizedTitle && { title: sanitizedTitle }),
  }

  const attributeString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

  return `<img ${attributeString} class="custom-image-class" />`
}

// Enhanced link renderer with better security and accessibility
renderer.link = function ({ href = '', title, text = '' }: LinkRendererParams) {
  // Sanitize both href and text content
  const sanitizedHref = DOMPurify.sanitize(href.trim())
  const sanitizedText = DOMPurify.sanitize(text)
  const sanitizedTitle = title ? DOMPurify.sanitize(title) : null

  // Validate URL format to prevent javascript: and other dangerous protocols
  const isValidUrl = /^https?:\/\/.+/i.test(sanitizedHref)
  if (!isValidUrl && sanitizedHref !== '') {
    // If it's not a valid HTTP(S) URL, treat it as plain text
    return sanitizedText
  }

  // Build attributes object for better maintainability
  const attributes = {
    href: sanitizedHref,
    class: 'text-accent hover:text-accent/80 underline transition-colors',
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
    ...(sanitizedTitle && { title: sanitizedTitle }),
  }

  // Convert attributes object to string
  const attributeString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

  return `<a ${attributeString}>${sanitizedText}</a>`
}

// Render markdown headings
renderer.heading = function ({
  tokens,
  depth,
}: {
  tokens: any[]
  depth: number
}) {
  // Extract text from tokens
  const text = tokens.map((token) => token.raw ?? token.text ?? '').join('')
  const sanitizedText = DOMPurify.sanitize(text)
  const headingClasses = {
    1: 'text-2xl font-bold mb-4 mt-6',
    2: 'text-xl font-semibold mb-3 mt-5',
    3: 'text-lg font-medium mb-2 mt-4',
    4: 'text-base font-medium mb-2 mt-3',
    5: 'text-sm font-medium mb-1 mt-2',
    6: 'text-xs font-medium mb-1 mt-2',
  }

  const className =
    // Determine the appropriate class name for the heading based on its depth.
    // If the depth is not found in headingClasses, default to the class for depth 6.
    headingClasses[depth as keyof typeof headingClasses] || headingClasses[6]
  return `<h${depth} class="${className}">${sanitizedText}</h${depth}>`
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
      if (!res.ok) throw new Error(result.error ?? 'Failed to fetch messages')
      setMessages(result as Message[])
    } catch (err: any) {
      setError(err.message ?? String(err))
      console.error('Fetch messages error:', err)
    } finally {
      setLoading(false)
    }
  }

  // 1. Set up polling for real-time updates
  useEffect(() => {
    // Fetch immediately on component mount
    fetchMessages()

    // Then poll every 10 seconds
    const pollInterval = setInterval(fetchMessages, 100000)

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth', { method: 'POST' })
        const result = await res.json()

        if (result.user) {
          setUserId(result.user.id)
          await fetchMessages()
        } else {
          throw new Error(result.error ?? 'Failed to authenticate')
        }
      } catch (err: any) {
        setError(err.message ?? String(err))
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

  // 1. Polling/Realtime Logic (useEffect)
  useEffect(() => {
    fetchMessages() // Initial load
    const interval = setInterval(fetchMessages, 10000) // Polling fallback
    return () => clearInterval(interval)
  }, [])

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
        setError(result.error ?? 'Failed to post message')
      } else {
        setMessage('')
        setError('')
        await fetchMessages()
      }
    } catch (err: any) {
      setError(err.message ?? String(err))
      console.error('Post error:', err)
    }
  }

  const renderMessages = () => {
    if (loading) {
      return <p>Loading messages...</p>
    }

    if (messages.length === 0) {
      return <p className="text-gray-500">No messages yet. Be the first!</p>
    }

    return (
      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="text-base-content bg-base-100 border-base-content/20 border-b p-2 text-lg"
          >
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  marked(msg.content, {
                    renderer,
                    breaks: true, // Convert line breaks to <br>
                    gfm: true, // Enable GitHub Flavored Markdown
                  }) as string,
                  {
                    // Allow target attribute for links to open in new tab
                    ADD_ATTR: ['target', 'rel'],
                    ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel'],
                  }
                ),
              }}
            />
            <small className="text-gray-500">
              {formatDate(msg.created_at)}
            </small>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={mergedContentClasses}>
      <div className="w-full">
        <h2 className="text-secondary-content font-gokhan text-center text-xl font-bold tracking-wider">
          Guest Book
        </h2>

        {/* Markdown Buttons  */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="right-0 mt-2 flex justify-end gap-3">
            {/* H1  */}
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
                setMessage(`${start}# Heading 1\n${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M13 2.5a1.5 1.5 0 0 1 1.493 1.356L14.5 4v16a1.5 1.5 0 0 1-2.993.144L11.5 20v-6.5h-6V20a1.5 1.5 0 0 1-2.993.144L2.5 20V4a1.5 1.5 0 0 1 2.993-.144L5.5 4v6.5h6V4A1.5 1.5 0 0 1 13 2.5m6 11.019V20a1 1 0 1 1-2 0v-4.634a1 1 0 0 1-1.055-1.698l1.485-.99a1.01 1.01 0 0 1 1.57.84Z"
                  />
                </g>
              </svg>
            </button>
            {/* H2  */}
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
                setMessage(`${start}## Heading 2\n${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M13 2.5a1.5 1.5 0 0 1 1.493 1.356L14.5 4v16a1.5 1.5 0 0 1-2.993.144L11.5 20v-6.5h-6V20a1.5 1.5 0 0 1-2.993.144L2.5 20V4a1.5 1.5 0 0 1 2.993-.144L5.5 4v6.5h6V4A1.5 1.5 0 0 1 13 2.5m4.657 10.18a2.7 2.7 0 0 1 1.873.219c1.166.582 1.757 1.92 1.443 3.177a2.8 2.8 0 0 1-.537 1.08l-.133.153L18.724 19h1.63a1 1 0 0 1 .117 1.993l-.117.007H16.65a1.01 1.01 0 0 1-1.01-1.01c0-.292.023-.569.191-.807l.081-.1l2.93-3.138c.472-.507.05-1.513-.699-1.325c-.313.078-.466.335-.496.626l-.006.111a1 1 0 1 1-2 0c0-1.246.782-2.369 2.017-2.678Z"
                  />
                </g>
              </svg>
            </button>

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
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M13 2.5a5.5 5.5 0 0 1 4.213 9.036a5.5 5.5 0 0 1-2.992 9.96L14 21.5H6.1a1.6 1.6 0 0 1-1.593-1.454L4.5 19.9V4.1a1.6 1.6 0 0 1 1.454-1.593L6.1 2.5zm1 11H7.5v5H14a2.5 2.5 0 0 0 0-5m-1-8H7.5v5H13a2.5 2.5 0 0 0 0-5"
                  />
                </g>
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
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M9 4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2h-2.117l-1.75 14H14a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h2.117l1.75-14H10a1 1 0 0 1-1-1"
                  />
                </g>
              </svg>
            </button>

            {/* bolditalic  */}
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
                setMessage(`${start}***bold italics***${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M16 2.5h-6a1.5 1.5 0 0 0 0 3h1.3l-1.624 13H8a1.5 1.5 0 0 0 0 3h6a1.5 1.5 0 0 0 0-3h-1.3l1.624-13H16a1.5 1.5 0 0 0 0-3"
                  />
                </g>
              </svg>
            </button>
            {/* striketrough  */}
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
                setMessage(`${start}~striketrough~${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M19 12a1 1 0 0 1 .117 1.993L19 14h-2.11q.327.492.518 1.063c.953 2.859-1.109 5.809-4.083 5.933L13.13 21h-1.702a5.74 5.74 0 0 1-5.02-2.958l-.112-.213l-.182-.365a1 1 0 0 1-.105-.6a1 1 0 0 1 1.817-.427l.042.066l.217.431a3.74 3.74 0 0 0 3.131 2.06l.212.006h1.701a2.51 2.51 0 0 0 1.297-4.66l-.174-.096l-.488-.244H5a1 1 0 0 1-.117-1.993L5 12zm-6.428-9a5.74 5.74 0 0 1 5.132 3.171l.18.363a1.002 1.002 0 0 1-1.405 1.32a1 1 0 0 1-.316-.306l-.035-.058l-.213-.424A3.74 3.74 0 0 0 12.572 5h-1.701a2.51 2.51 0 0 0-1.123 4.756L12.236 11H8.013A4.5 4.5 0 0 1 6.59 8.937C5.618 6.017 7.791 3 10.871 3z"
                  />
                </g>
              </svg>
            </button>
            {/* dividing line  */}
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
                setMessage(`${start}\n\n---\n\n${end}`)
                setTimeout(() => {
                  textareaRef.current?.focus()
                }, 0)
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M6 18a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2zm7 0a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2zm7 0a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2zm0-7a1 1 0 0 1 .117 1.993L20 13H4a1 1 0 0 1-.117-1.993L4 11zM6 4a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm7 0a1 1 0 0 1 .117 1.993L13 6h-2a1 1 0 0 1-.117-1.993L11 4zm7 0a1 1 0 0 1 .117 1.993L20 6h-2a1 1 0 0 1-.117-1.993L18 4z"
                  />
                </g>
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
            className="textarea textarea-bordered text-base-content bg-base-100 placeholder-base-content/40 focus:ring-base-content mt-1 h-28 w-full rounded-md text-lg focus:border-transparent focus:ring-1 focus:outline-none md:h-18"
            placeholder={`Feedback, wish, or link to your playlist.\nUse Markdown formatting or the buttons above.`}
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setMessage(e.target.value)
            }
          ></textarea>
          <button
            className="btn bg-base-200 my-2 rounded-md font-bold"
            disabled={!message.trim()}
          >
            Post
          </button>
        </form>

        <div className="border-base-content h-[72vh] w-full resize-y space-y-4 overflow-y-auto rounded-md border p-2">
          {error && <div className="text-error mt-2">{error}</div>}
          {renderMessages()}
        </div>
      </div>
    </div>
  )
}
export default MessageBoard
