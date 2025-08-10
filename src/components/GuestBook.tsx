import DOMPurify from 'dompurify'
import { marked, type Tokens } from 'marked'
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

// Custom renderer for marked to handle links, headings, lists, and images properly
const renderer = new marked.Renderer()

// Enhanced list renderer (token: Tokens.List)
renderer.list = (token: Tokens.List) => {
  const type = token.ordered ? 'ol' : 'ul'
  const startAttr =
    token.ordered && token.start !== 1 && token.start !== undefined
      ? ` start="${token.start}"`
      : ''
  const listClass = token.ordered
    ? 'list-decimal list-inside space-y-1 ml-4'
    : 'list-disc list-inside space-y-1 ml-4'
  const items = token.items.map((item) => renderer.listitem!(item)).join('')
  return `<${type}${startAttr} class="${listClass}">${items}</${type}>`
}

// Enhanced list item renderer (item: Tokens.ListItem)
renderer.listitem = (item: Tokens.ListItem) => {
  if (item.task) {
    const checkedAttr = item.checked ? 'checked' : ''
    return `<li class="flex items-center space-x-2">
      <input type="checkbox" ${checkedAttr} disabled class="rounded">
      <span class="${item.checked ? 'line-through text-gray-500' : ''}">${item.text}</span>
    </li>`
  }
  return `<li class="text-base-content">${item.text}</li>`
}

// Enhanced image rendering with proper styling
renderer.image = function ({ href, title, text }: { href?: string; title?: string | null; text?: string }) {
  if (!href) return text || ''
  const sanitizedHref = DOMPurify.sanitize(href)
  const sanitizedText = DOMPurify.sanitize(text || '')
  const sanitizedTitle = title ? DOMPurify.sanitize(title) : null

  const attributes = {
    src: sanitizedHref,
    alt: sanitizedText,
    loading: 'lazy',
    ...(sanitizedTitle && { title: sanitizedTitle }),
  }

  const attributeString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

  return `<div class="my-4 flex justify-center">
    <img ${attributeString} class="max-w-full h-auto rounded-lg shadow-md border border-base-content/20 max-h-96 object-contain" />
  </div>`
}

// Enhanced link renderer with better security and accessibility
renderer.link = ({ href = '', title, text = '' }: LinkRendererParams) => {
  const sanitizedHref = DOMPurify.sanitize(href.trim())
  const sanitizedText = DOMPurify.sanitize(text)
  const sanitizedTitle = title ? DOMPurify.sanitize(title) : null

  const isValidUrl = /^https?:\/\/.+/i.test(sanitizedHref)
  if (!isValidUrl && sanitizedHref !== '') {
    return sanitizedText
  }

  const attributes = {
    href: sanitizedHref,
    class:
      'text-accent hover:text-accent/80 underline transition-colors break-all',
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
    ...(sanitizedTitle && { title: sanitizedTitle }),
  }

  const attributeString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

  return `<a ${attributeString}>${sanitizedText}</a>`
}

// Render markdown headings
renderer.heading = ({ tokens, depth }: { tokens: any[]; depth: number }) => {
  const text = tokens.map((token) => token.raw ?? token.text ?? '').join('')
  const sanitizedText = DOMPurify.sanitize(text)

  const headingClasses = {
    1: 'text-2xl font-bold mb-4 mt-6 text-base-content',
    2: 'text-xl font-semibold mb-3 mt-5 text-base-content',
    3: 'text-lg font-medium mb-2 mt-4 text-base-content',
    4: 'text-base font-medium mb-2 mt-3 text-base-content',
    5: 'text-sm font-medium mb-1 mt-2 text-base-content',
    6: 'text-xs font-medium mb-1 mt-2 text-base-content',
  }

  const className =
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
  HeadingClasses?: string
}

const MessageBoard: FC<MessageBoardProps> = ({ containerClasses, HeadingClasses }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const baseContentClasses = 'flex items-center justify-center w-full'
  const mergedContentClasses = twMerge(baseContentClasses, containerClasses)

  const baseHeadingClasses = 'text-secondary-content font-gokhan mb-2 text-center text-3xl font-bold tracking-wider'
  const mergedHeadingClasses = twMerge(baseHeadingClasses, HeadingClasses)

  // Enhanced function to handle text selection and formatting
  const insertMarkdown = (before: string, after = '', placeholder = '') => {
    const textarea = textareaRef.current
    if (!textarea) {
      // If textarea is not focused, just add placeholder text
      setMessage((prev) => prev + before + placeholder + after)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.slice(start, end)

    let newText: string
    let newCursorPos: number

    if (selectedText) {
      // Text is selected - wrap it with formatting
      newText =
        message.slice(0, start) +
        before +
        selectedText +
        after +
        message.slice(end)
      newCursorPos = start + before.length + selectedText.length + after.length
    } else if (start === end && textarea === document.activeElement) {
      // Cursor is positioned but no selection - insert formatting with placeholder
      const textToInsert = placeholder || 'text'
      newText =
        message.slice(0, start) +
        before +
        textToInsert +
        after +
        message.slice(end)
      newCursorPos = start + before.length + textToInsert.length
    } else {
      // Textarea not focused or other case - append to end
      newText = message + before + placeholder + after
      newCursorPos = newText.length
    }

    setMessage(newText)

    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

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

  useEffect(() => {
    fetchMessages()
    const pollInterval = setInterval(fetchMessages, 10000)
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
    fetchMessages()
  }, [])

  const preprocessMessage = (text: string) => {
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
      return <p className="text-center text-gray-500">Loading messages...</p>
    }

    if (messages.length === 0) {
      return (
        <p className="text-center text-gray-500">
          No messages yet. Be the first!
        </p>
      )
    }

    return (
      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="text-base-content bg-base-100 border-base-content/20 border-b pb-4 text-lg"
          >
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  marked(msg.content, {
                    renderer,
                    breaks: true,
                    gfm: true,
                  }) as string,
                  {
                    ADD_ATTR: ['target', 'rel', 'loading'],
                    ALLOWED_ATTR: [
                      'href',
                      'title',
                      'class',
                      'target',
                      'rel',
                      'src',
                      'alt',
                      'loading',
                    ],
                    ALLOWED_TAGS: [
                      'p',
                      'br',
                      'strong',
                      'em',
                      'u',
                      's',
                      'del',
                      'h1',
                      'h2',
                      'h3',
                      'h4',
                      'h5',
                      'h6',
                      'ul',
                      'ol',
                      'li',
                      'a',
                      'img',
                      'div',
                      'span',
                      'hr',
                      'input',
                    ],
                  }
                ),
              }}
            />
            <small className="mt-2 block text-gray-500">
              {formatDate(msg.created_at)}
            </small>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={mergedContentClasses}>
      <div className="mx-auto w-full max-w-4xl">
        <h2 className={mergedHeadingClasses}>
          Guest Book
        </h2>

        <form onSubmit={handleSubmit} className="mb-2 flex flex-col">
          <div className="mb-0 flex flex-wrap justify-end gap-2">
            {/* H1 */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('# ', '\n', 'Heading 1')}
              title="Heading 1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
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

            {/* H2 */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('## ', '\n', 'Heading 2')}
              title="Heading 2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
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

            {/* Bold */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('**', '**', 'bold')}
              title="Bold"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
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

            {/* Italic */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('*', '*', 'italic')}
              title="Italic"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
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

            {/* Bold Italic */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('***', '***', 'bold italic')}
              title="Bold Italic"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
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

            {/* Strikethrough */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('~~', '~~', 'strikethrough')}
              title="Strikethrough"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
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

            {/* Horizontal Rule */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('\n\n---\n\n', '', '')}
              title="Horizontal Rule"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
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

            {/* Unordered List */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('\n- ', '\n', 'List item')}
              title="Unordered List"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M4.5 17.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3M20 18a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2zM4.5 10.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3M20 11a1 1 0 0 1 .117 1.993L20 13H9a1 1 0 0 1-.117-1.993L9 11zM4.5 3.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3M20 4a1 1 0 0 1 .117 1.993L20 6H9a1 1 0 0 1-.117-1.993L9 4z"
                  />
                </g>
              </svg>
            </button>

            {/* Ordered List */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('\n1. ', '\n', 'List item')}
              title="Ordered List"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:h-5 md:w-5"
              >
                <g fill="none">
                  <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                  <path
                    fill="currentColor"
                    d="M5.436 16.72a1.466 1.466 0 0 1 1.22 2.275a1.466 1.466 0 0 1-1.22 2.275c-.65 0-1.163-.278-1.427-.901a.65.65 0 1 1 1.196-.508a.18.18 0 0 0 .165.109c.109 0 .23-.03.23-.167c0-.1-.073-.143-.156-.154l-.051-.004a.65.65 0 0 1-.096-1.293l.096-.007c.102 0 .207-.037.207-.158c0-.137-.12-.167-.23-.167a.18.18 0 0 0-.164.11a.65.65 0 1 1-1.197-.509c.264-.622.777-.9 1.427-.9ZM20 18a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2zM6.08 9.945a1.552 1.552 0 0 1 .43 2.442l-.554.593h.47a.65.65 0 1 1 0 1.3H4.573a.655.655 0 0 1-.655-.654c0-.207.029-.399.177-.557L5.559 11.5c.11-.117.082-.321-.06-.392c-.136-.068-.249.01-.275.142l-.006.059a.65.65 0 0 1-.65.65c-.39 0-.65-.327-.65-.697a1.482 1.482 0 0 1 2.163-1.317ZM20 11a1 1 0 0 1 .117 1.993L20 13H9a1 1 0 0 1-.117-1.993L9 11zM6.15 3.39v3.24a.65.65 0 1 1-1.3 0V4.522a.65.65 0 0 1-.46-1.183l.742-.495a.655.655 0 0 1 1.018.545ZM20 4a1 1 0 0 1 .117 1.993L20 6H9a1 1 0 0 1-.117-1.993L9 4z"
                  />
                </g>
              </svg>
            </button>

            {/* Line Break */}
            <button
              type="button"
              className="hover:bg-base-200 rounded p-1 transition-colors md:p-2"
              onClick={() => insertMarkdown('\n', '', '')}
              title="Line Break"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
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
            className="textarea textarea-bordered text-base-content bg-base-100 placeholder-base-content/40 focus:ring-base-content mt-1 h-32 w-full resize-y rounded-md text-lg focus:border-transparent focus:ring-1 focus:outline-none"
            placeholder={`Share your feedback, thoughts, or links!\nUse Markdown formatting or the buttons above.`}
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setMessage(e.target.value)
            }
          />

          <button
            type="submit"
            className="btn bg-base-200 hover:bg-base-300 my-2 rounded-md font-bold transition-colors"
            disabled={!message.trim()}
          >
            Post Message
          </button>
        </form>

        <div className="border-base-content h-[92vh] w-full resize-y space-y-4 overflow-y-auto rounded-md border p-2">
          {error && <div className="text-error mt-2">{error}</div>}
          {renderMessages()}
        </div>
      </div>
    </div>
  )
}

export default MessageBoard
