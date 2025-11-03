"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  ChevronDown,
  Search,
  Lightbulb,
  MessageSquare,
  Keyboard,
  Heart,
  Target,
  Cloud,
  PartyPopper,
  Shield,
  ArrowLeftRight,
  AlertCircle,
  Info,
  GripHorizontal,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

interface Message {
  id: string
  type: "user" | "zara"
  content: string
  timestamp: Date
  quickActions?: { label: string; action: string; icon?: string }[]
  showCrisisNotice?: boolean
  isShortGreeting?: boolean // Added for short greetings
}

export function ZaraChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [askedTopics, setAskedTopics] = useState<Set<string>>(new Set())
  const [showTopGradient, setShowTopGradient] = useState(false)
  const [showBottomGradient, setShowBottomGradient] = useState(false)
  const [isInitialGreeting, setIsInitialGreeting] = useState(true)
  const [mode, setMode] = useState<"work" | "wellbeing">("work")
  const [hasSelectedMode, setHasSelectedMode] = useState(false)
  const [showingFullCapabilities, setShowingFullCapabilities] = useState(false)
  const [panelHeight, setPanelHeight] = useState(600)
  const [isResizing, setIsResizing] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatPanelRef = useRef<HTMLDivElement>(null) // Added ref for chat panel
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHeight = localStorage.getItem("zaraChartHeight")
      if (savedHeight) {
        setPanelHeight(Number.parseInt(savedHeight, 10))
      }
    }
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // On initial greeting, scroll to TOP to show Zara's welcome message
    if (isInitialGreeting && messages.length === 1) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        container.scrollTo({
          top: 0,
          behavior: "instant",
        })
      })
      setIsInitialGreeting(false)
    }
    // For subsequent messages during conversation
    else if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1]

      requestAnimationFrame(() => {
        if (lastMessage.type === "zara") {
          // Get all message divs (excluding the messagesEndRef)
          const messageElements = Array.from(container.children).filter((child) => child !== messagesEndRef.current)
          const lastMessageElement = messageElements[messageElements.length - 1] as HTMLElement

          if (lastMessageElement) {
            // Calculate position with 16px margin from top
            const messagePosition = lastMessageElement.offsetTop
            container.scrollTo({
              top: messagePosition - 16, // 16px margin from top for visual comfort
              behavior: prefersReducedMotion ? "auto" : "smooth",
            })
          }
        } else {
          // For user messages, scroll to bottom as usual
          messagesEndRef.current?.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
          })
        }
      })
    }
  }, [messages, isInitialGreeting])

  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      // Reset scroll position to top when panel opens
      messagesContainerRef.current.scrollTop = 0
    }
  }, [isOpen])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100
      const isScrolledDown = scrollTop > 20

      setShowScrollButton(isScrolledUp)
      setShowTopGradient(isScrolledDown)
      setShowBottomGradient(isScrolledUp)
    }

    handleScroll()

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Update useEffect to use the new addZaraMessage signature
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsInitialGreeting(true)
      setTimeout(() => {
        const greeting = getInitialGreeting()
        addZaraMessage(greeting.content, greeting.quickActions, false, greeting.isShortGreeting)
      }, 300)
    }
  }, [isOpen, messages.length, pathname])

  const getInitialGreeting = () => {
    // Check if user has seen full greeting before
    const hasSeenFullGreeting = typeof window !== "undefined" && localStorage.getItem("hasSeenZaraGreeting") === "true"

    if (hasSeenFullGreeting) {
      // Return visit - short greeting
      return {
        content: "Welcome back! 👋\n\nWhat can I help you with today?",
        quickActions: [
          { label: "Work Mode", action: "select:work", icon: "target" },
          { label: "Wellbeing Chat", action: "select:wellbeing", icon: "heart" },
        ],
        isShortGreeting: true,
      }
    }

    // First visit - full greeting
    if (typeof window !== "undefined") {
      localStorage.setItem("hasSeenZaraGreeting", "true")
    }

    return {
      content:
        "Hi! I'm Zara, your teaching assistant. 👋\n\nI'm here to help you with:\n\n**WORK MODE** 🎯\n• Finding the perfect template\n• Choosing the right tone\n• Understanding your analytics\n• Tips for better communication\n\n**WELLBEING CHAT** 💭\n• Talk about your day\n• Manage teaching stress\n• Celebrate your wins\n• Set healthy boundaries\n\nWhat would you like today?",
      quickActions: [
        { label: "Work Mode", action: "select:work", icon: "target" },
        { label: "Wellbeing Chat", action: "select:wellbeing", icon: "heart" },
      ],
      isShortGreeting: false,
    }
  }

  const resetConversation = () => {
    setMessages([])
    setInputValue("")
    setAskedTopics(new Set())
    setIsInitialGreeting(true)
    setHasSelectedMode(false)
    setMode("work")
    setShowingFullCapabilities(false) // Reset showingFullCapabilities

    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0
    }

    setTimeout(() => {
      const greeting = getInitialGreeting()
      addZaraMessage(greeting.content, greeting.quickActions, false, greeting.isShortGreeting)
    }, 300)
  }

  const scrollToBottom = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const addZaraMessage = (
    content: string,
    quickActions?: { label: string; action: string; icon?: string }[],
    showCrisisNotice?: boolean,
    isShortGreeting?: boolean, // Added parameter
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: "zara",
      content,
      timestamp: new Date(),
      quickActions,
      showCrisisNotice,
      isShortGreeting, // Added to message
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const getWellbeingResponse = (
    userInput: string,
  ): {
    content: string
    quickActions?: { label: string; action: string; icon?: string }[]
    showCrisisNotice?: boolean
  } => {
    const input = userInput.toLowerCase()

    if (
      input.includes("stress") ||
      input.includes("overwhelm") ||
      input.includes("tired") ||
      input.includes("burnout")
    ) {
      return {
        content:
          "I hear you - teaching can be really demanding. 💚\n\nI noticed you've been drafting communications at 9pm several nights this week. That's a lot on your plate.\n\nWhat's weighing on you most right now?\n\nRemember: You don't have to have it all figured out. Sometimes just naming what's hard can help.",
        quickActions: [
          { label: "Parent communication stress", action: "wellbeing:parent-stress", icon: "message" },
          { label: "Workload feeling overwhelming", action: "wellbeing:workload", icon: "cloud" },
          { label: "Work-life balance", action: "wellbeing:balance", icon: "shield" },
          { label: "Something else", action: "wellbeing:other", icon: "lightbulb" },
        ],
        showCrisisNotice: true,
      }
    }

    if (input.includes("celebrate") || input.includes("win") || input.includes("success") || input.includes("proud")) {
      return {
        content:
          "I love this! 🎉 What's going well?\n\n(And yes, 'small' wins absolutely count - progress is progress!)",
        quickActions: [
          { label: "Share my win", action: "wellbeing:share-win", icon: "party" },
          { label: "Different topic", action: "wellbeing:other", icon: "message" },
        ],
      }
    }

    if (input.includes("boundary") || input.includes("boundaries") || input.includes("saying no")) {
      return {
        content:
          "Setting boundaries is so important! 🛡️\n\nWhat boundary are you working on?\n\n• Protecting evening/weekend time\n• Limiting email responses\n• Saying no to extra duties\n• Taking proper lunch breaks\n\nAll of these are valid and necessary!",
        quickActions: [
          { label: "Evening/weekend time", action: "wellbeing:time-boundary", icon: "shield" },
          { label: "Email boundaries", action: "wellbeing:email-boundary", icon: "message" },
          { label: "Saying no", action: "wellbeing:saying-no", icon: "shield" },
        ],
      }
    }

    if (input.includes("perspective") || input.includes("challenge") || input.includes("difficult situation")) {
      return {
        content:
          "Let's talk through it. 💭\n\nWhat's the situation you're facing?\n\nI'm here to listen and help you think through different angles.",
        quickActions: [
          { label: "Difficult parent interaction", action: "wellbeing:parent-challenge", icon: "message" },
          { label: "Classroom management", action: "wellbeing:classroom", icon: "lightbulb" },
          { label: "Colleague situation", action: "wellbeing:colleague", icon: "message" },
        ],
      }
    }

    // Default wellbeing response
    return {
      content:
        "I'm here to listen. 💚\n\nHow are you really doing?\n\nYou can talk to me about:\n• What's stressing you out\n• Wins you want to celebrate\n• Boundaries you're working on\n• Challenges you're facing\n\nWhat's on your mind?",
      quickActions: [
        { label: "I'm feeling stressed", action: "wellbeing:stress", icon: "cloud" },
        { label: "Celebrate a win", action: "wellbeing:celebrate", icon: "party" },
        { label: "Set a boundary", action: "wellbeing:boundary", icon: "shield" },
        { label: "Need perspective", action: "wellbeing:perspective", icon: "lightbulb" },
      ],
    }
  }

  const getZaraResponse = (
    userInput: string,
  ): {
    content: string
    quickActions?: { label: string; action: string; icon?: string }[]
    showCrisisNotice?: boolean
  } => {
    const input = userInput.toLowerCase()

    if (mode === "wellbeing") {
      return getWellbeingResponse(userInput)
    }

    // ... existing work mode response logic ...
    if (input.includes("template") || input.includes("homework") || input.includes("email")) {
      if (askedTopics.has("templates")) {
        setAskedTopics(new Set(askedTopics).add("templates-repeat"))
        return {
          content:
            "I already shared some templates! Would you like me to:\n\n• Show different template categories\n• Help you pick the right one for your situation\n• Navigate to the full templates page\n\nWhat would be most helpful?",
          quickActions: [
            { label: "Go to templates page", action: "navigate:/templates", icon: "search" },
            { label: "Help me choose", action: "help choose template", icon: "lightbulb" },
          ],
        }
      }
      setAskedTopics(new Set(askedTopics).add("templates"))
      return {
        content:
          "I can help with that! Here are some templates for parent communication:\n\n📚 Homework Reminder - Warm & Encouraging\n📅 Assignment Due Tomorrow - Professional\n⚠️ Missing Homework Follow-up - Firm\n\nWhich situation matches yours?",
        quickActions: [
          { label: "Show all templates", action: "navigate:/templates", icon: "search" },
          { label: "Something else", action: "other", icon: "message" },
        ],
      }
    }

    // ... rest of existing work mode logic ...
    if (input.includes("quality tips") || input.includes("more tips")) {
      if (askedTopics.has("quality-tips")) {
        setAskedTopics(new Set(askedTopics).add("quality-tips-repeat"))
        return {
          content:
            "Here are some additional quality tips:\n\n1. Use templates as starting points, then personalize\n2. Match your tone to the situation urgency\n3. Keep messages concise but warm\n4. Proofread before sending\n\nRemember: Quality comes from relevance, not perfection!",
          quickActions: [
            { label: "Find a template", action: "find template", icon: "search" },
            { label: "Different topic", action: "other", icon: "message" },
          ],
        }
      }
      setAskedTopics(new Set(askedTopics).add("quality-tips"))
      return {
        content:
          "Here are tips to maintain high quality scores:\n\n1. Use specific details in your situation description\n2. Choose the right tone for your message\n3. Review drafts before sending\n4. Save favorites for similar situations\n\nYour quality score reflects how well drafts match your needs!",
        quickActions: [
          { label: "Find a template", action: "find template", icon: "search" },
          { label: "More tips", action: "more tips", icon: "message" },
        ],
      }
    }

    if (input.includes("quality score") || input.includes("metric") || input.includes("analytics")) {
      if (askedTopics.has("quality-score")) {
        return {
          content:
            "Earlier I explained quality score measures draft efficiency. Want to know about other metrics?\n\n• Time Saved - Hours reclaimed from drafting\n• Edit Depth - How much you modify drafts\n• Streak - Consecutive days using Zaza\n\nWhich interests you?",
          quickActions: [
            { label: "Explain time saved", action: "time saved metric", icon: "lightbulb" },
            { label: "View my analytics", action: "navigate:/analytics", icon: "search" },
          ],
        }
      }
      setAskedTopics(new Set(askedTopics).add("quality-score"))
      return {
        content:
          "Quality Score measures how polished your drafts are based on edit depth. A score of 90+ means you're using drafts with minimal changes - very efficient!\n\nYour current score: 92 ✨\n\nWant tips to maintain high quality?",
        quickActions: [
          { label: "Yes, show tips", action: "quality tips", icon: "lightbulb" },
          { label: "Explain other metrics", action: "other metrics", icon: "message" },
        ],
      }
    }

    if (input.includes("tip") || input.includes("advice") || input.includes("difficult") || input.includes("parent")) {
      if (askedTopics.has("communication-tips")) {
        return {
          content:
            "Let me add to those tips:\n\n5. Use 'I noticed...' instead of 'You didn't...'\n6. End with a clear next step or question\n7. Acknowledge parent perspective first\n8. Keep tone consistent throughout\n\nWhat specific situation are you dealing with?",
          quickActions: [
            { label: "Help me draft", action: "navigate:/", icon: "message" },
            { label: "Different topic", action: "other", icon: "lightbulb" },
          ],
        }
      }
      setAskedTopics(new Set(askedTopics).add("communication-tips"))
      return {
        content:
          "Here are some tips for difficult parent conversations:\n\n1. Start with empathy - use 'Empathetic' tone\n2. Focus on solutions, not just problems\n3. Invite collaboration: 'Let's work together...'\n4. Keep it concise (parents are busy too!)\n\nWant me to help you draft a message?",
        quickActions: [
          { label: "Yes, help me draft", action: "navigate:/", icon: "message" },
          { label: "More tips", action: "more tips", icon: "lightbulb" },
        ],
      }
    }

    if (input.includes("explain") || input.includes("what is") || input.includes("how does")) {
      if (askedTopics.has("explain-features")) {
        return {
          content:
            "We've covered several features! Is there something specific you'd like to dive deeper into?\n\nOr would you prefer to:\n• Try creating a draft\n• Browse templates\n• Check your analytics",
          quickActions: [
            { label: "Create a draft", action: "navigate:/", icon: "message" },
            { label: "Browse templates", action: "navigate:/templates", icon: "search" },
          ],
        }
      }
      setAskedTopics(new Set(askedTopics).add("explain-features"))
      return {
        content:
          "I'd be happy to explain! Which feature are you curious about?\n\n• Templates - Pre-written message structures\n• Tone Selector - Adjusts communication style\n• Quality Score - Measures draft efficiency\n• Edit Depth - Tracks how much you modify drafts\n• Favorites - Quick access to saved drafts\n\nJust ask about any of these!",
        quickActions: [
          { label: "Explain templates", action: "template", icon: "search" },
          { label: "Explain quality score", action: "quality score", icon: "lightbulb" },
        ],
      }
    }

    const defaultResponses = [
      {
        content:
          "I'm not sure I understand. Could you rephrase that?\n\nI can help with:\n• Finding templates\n• Explaining features\n• Communication tips\n• Navigation help\n• Understanding analytics\n\nWhat would you like to know?",
      },
      {
        content:
          "Hmm, I'm not quite following. Let me know if you need help with:\n\n• Drafting a message\n• Finding the right template\n• Understanding your analytics\n• Setting preferences\n\nWhat can I assist with?",
      },
    ]

    const randomResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
    return {
      ...randomResponse,
      quickActions: [
        { label: "Find a template", action: "find template", icon: "search" },
        { label: "Explain a feature", action: "explain feature", icon: "lightbulb" },
        { label: "Communication tips", action: "communication tips", icon: "message" },
      ],
    }
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    addUserMessage(inputValue)
    const userInput = inputValue
    setInputValue("")

    setIsTyping(true)

    setTimeout(
      () => {
        setIsTyping(false)
        const response = getZaraResponse(userInput)
        addZaraMessage(response.content, response.quickActions, response.showCrisisNotice)
      },
      800 + Math.random() * 400,
    )
  }

  const handleQuickAction = (action: string) => {
    if (action === "select:work") {
      setMode("work")
      setHasSelectedMode(true)
      addUserMessage("Work Mode")
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addZaraMessage(
          "Great! I'm here to help with templates, tones, analytics, and communication tips.\n\nWhat can I help you with?",
          [
            { label: "Find a template", action: "find template", icon: "search" },
            { label: "Explain a feature", action: "explain feature", icon: "lightbulb" },
            { label: "Communication tips", action: "communication tips", icon: "message" },
          ],
        )
      }, 800)
      return
    }

    if (action === "select:wellbeing") {
      setMode("wellbeing")
      setHasSelectedMode(true)
      addUserMessage("Wellbeing Chat")
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addZaraMessage("I'm here to listen and support you. 💚\n\nHow are you doing today?", [
          { label: "I'm feeling stressed", action: "wellbeing:stress", icon: "cloud" },
          { label: "Celebrate a win", action: "wellbeing:celebrate", icon: "party" },
          { label: "Set a boundary", action: "wellbeing:boundary", icon: "shield" },
          { label: "Need perspective", action: "wellbeing:perspective", icon: "lightbulb" },
        ])
      }, 800)
      return
    }

    if (action === "switch:work") {
      setMode("work")
      addUserMessage("Switch to Work Mode")
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addZaraMessage(
          "Switched to Work Mode! 🎯\n\nI'm ready to help with templates, tones, and communication tips.\n\nWhat do you need?",
          [
            { label: "Find a template", action: "find template", icon: "search" },
            { label: "Explain a feature", action: "explain feature", icon: "lightbulb" },
          ],
        )
      }, 800)
      return
    }

    if (action === "switch:wellbeing") {
      setMode("wellbeing")
      addUserMessage("Switch to Wellbeing Chat")
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addZaraMessage("Switched to Wellbeing Chat! 💚\n\nI'm here to listen and support you.\n\nHow are you doing?", [
          { label: "I'm feeling stressed", action: "wellbeing:stress", icon: "cloud" },
          { label: "Celebrate a win", action: "wellbeing:celebrate", icon: "party" },
        ])
      }, 800)
      return
    }

    if (action.startsWith("navigate:")) {
      const path = action.replace("navigate:", "")
      router.push(path)
      setIsOpen(false)
      return
    }

    addUserMessage(action)
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      const response = getZaraResponse(action)
      addZaraMessage(response.content, response.quickActions, response.showCrisisNotice)
    }, 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getIconComponent = (iconName?: string) => {
    switch (iconName) {
      case "search":
        return <Search className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      case "lightbulb":
        return <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case "message":
        return <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
      case "keyboard":
        return <Keyboard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      case "target":
        return <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      case "heart":
        return <Heart className="w-4 h-4 text-green-600 dark:text-green-400" />
      case "cloud":
        return <Cloud className="w-4 h-4 text-blue-500 dark:text-blue-400" />
      case "party":
        return <PartyPopper className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
      case "shield":
        return <Shield className="w-4 h-4 text-purple-500 dark:text-purple-400" />
      case "info": // Added case for Info icon
        return <Info className="w-4 h-4 text-white" />
      default:
        return null
    }
  }

  const showFullCapabilities = () => {
    setShowingFullCapabilities(true)
    addZaraMessage(
      "Here's everything I can help you with:\n\n**WORK MODE** 🎯\n• Finding the perfect template\n• Choosing the right tone\n• Understanding your analytics\n• Tips for better communication\n\n**WELLBEING CHAT** 💭\n• Talk about your day\n• Manage teaching stress\n• Celebrate your wins\n• Set healthy boundaries\n\nWhat would you like to explore?",
      [
        { label: "Work Mode", action: "select:work", icon: "target" },
        { label: "Wellbeing Chat", action: "select:wellbeing", icon: "heart" },
      ],
    )
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startY = e.clientY
    const startHeight = panelHeight

    const handleMouseMove = (e: MouseEvent) => {
      // Inverted: dragging up increases height
      const deltaY = startY - e.clientY
      const newHeight = Math.max(400, Math.min(window.innerHeight * 0.9, startHeight + deltaY))
      setPanelHeight(newHeight)

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("zaraChartHeight", newHeight.toString())
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 md:bottom-6 md:right-6 z-50 w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group"
        aria-label="Open Zara, your AI teaching assistant"
        title="Open Zara (⌘K)"
      >
        <Sparkles className="w-7 h-7 text-white" />
        <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
        <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          ⌘K
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />

          <div
            ref={chatPanelRef} // Applied ref to the chat panel
            style={{ height: `${panelHeight}px` }} // Dynamic height
            className={`fixed z-50 bg-white dark:bg-gray-900 shadow-2xl
              md:bottom-24 md:right-6 md:w-96 md:rounded-2xl
              inset-0 md:inset-auto
              border border-gray-200 dark:border-gray-800
              flex flex-col
              animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 fade-in duration-300
              ${isResizing ? "select-none" : ""} // Apply select-none during resize
            `}
          >
            <div
              className={`p-4 rounded-t-2xl md:rounded-t-2xl flex items-center justify-between ${
                mode === "wellbeing"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : "bg-gradient-to-r from-purple-500 to-purple-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {mode === "wellbeing" ? (
                    <Heart className="w-5 h-5 text-white" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Zara</h3>
                  <p className="text-sm text-white/90">
                    {mode === "wellbeing" ? "Here to Listen & Support" : "Your Teaching Assistant"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasSelectedMode && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      mode === "wellbeing" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {mode === "wellbeing" ? "Wellbeing Mode" : "Work Mode"}
                  </span>
                )}
                <button
                  onClick={resetConversation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Start new conversation"
                  title="Start new conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                  <span className="text-sm font-medium text-white hidden sm:inline">New Chat</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                  aria-label="Close Zara"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 space-y-4 relative scroll-smooth"
            >
              {showTopGradient && (
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-gray-50 dark:from-gray-950 to-transparent pointer-events-none z-10" />
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300 ease-out`}
                >
                  {message.type === "zara" && (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 ${
                        mode === "wellbeing"
                          ? "bg-gradient-to-br from-green-500 to-emerald-600"
                          : "bg-gradient-to-br from-purple-500 to-purple-600"
                      }`}
                    >
                      {mode === "wellbeing" ? (
                        <Heart className="w-4 h-4 text-white" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}
                  <div className="flex flex-col max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        message.type === "user"
                          ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-br-sm shadow-sm border border-gray-200 dark:border-gray-700"
                          : mode === "wellbeing"
                            ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-bl-sm shadow-sm"
                            : "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {message.type === "zara" &&
                      message.content.includes("📚") &&
                      message.content.includes("Homework Reminder") ? (
                        <div className="space-y-3">
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {message.content.split("\n\n")[0]}
                          </p>
                          <div className="flex flex-col gap-2 pt-2">
                            <button
                              onClick={() => handleQuickAction("navigate:/templates")}
                              className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 rounded-full px-4 py-2 text-sm text-white transition-all duration-150 text-left flex items-center gap-2"
                            >
                              <span>📚</span>
                              <span>Homework Reminder - Warm & Encouraging</span>
                            </button>
                            <button
                              onClick={() => handleQuickAction("navigate:/templates")}
                              className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 rounded-full px-4 py-2 text-sm text-white transition-all duration-150 text-left flex items-center gap-2"
                            >
                              <span>📅</span>
                              <span>Assignment Due Tomorrow - Professional</span>
                            </button>
                            <button
                              onClick={() => handleQuickAction("navigate:/templates")}
                              className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 rounded-full px-4 py-2 text-sm text-white transition-all duration-150 text-left flex items-center gap-2"
                            >
                              <span>⚠️</span>
                              <span>Missing Homework Follow-up - Firm</span>
                            </button>
                          </div>
                          <p className="text-sm leading-relaxed pt-2">Which situation matches yours?</p>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                      )}

                      {message.isShortGreeting && !showingFullCapabilities && (
                        <button
                          onClick={showFullCapabilities}
                          className="text-xs text-white/80 hover:text-white underline mt-2 flex items-center gap-1 transition-colors"
                        >
                          <Info className="h-3 w-3" />
                          See all Zara capabilities
                        </button>
                      )}
                    </div>

                    {message.showCrisisNotice && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-lg">
                        <div className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                              I'm here to listen, but I'm not a substitute for professional support.
                            </p>
                            <p className="text-amber-800 dark:text-amber-200 mb-1">
                              If you're struggling, please reach out to:
                            </p>
                            <ul className="space-y-0.5 text-amber-800 dark:text-amber-200">
                              <li>• Your GP or counselor</li>
                              <li>• Education Support Partnership: 08000 562 561</li>
                              <li>• Samaritans: 116 123 (24/7)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {message.quickActions && message.quickActions.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {message.quickActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickAction(action.action)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-750 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-150 font-medium text-gray-700 dark:text-gray-300"
                          >
                            {getIconComponent(action.icon)}
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {hasSelectedMode && message.quickActions && message.quickActions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleQuickAction(mode === "work" ? "switch:wellbeing" : "switch:work")}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                          <span>Switch to {mode === "work" ? "Wellbeing Mode" : "Work Mode"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start animate-in slide-in-from-bottom-2 fade-in duration-200">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 ${
                      mode === "wellbeing"
                        ? "bg-gradient-to-br from-green-500 to-emerald-600"
                        : "bg-gradient-to-br from-purple-500 to-purple-600"
                    }`}
                  >
                    {mode === "wellbeing" ? (
                      <Heart className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex gap-1">
                      <span
                        className={`w-2 h-2 rounded-full animate-bounce ${
                          mode === "wellbeing" ? "bg-green-400" : "bg-purple-400"
                        }`}
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className={`w-2 h-2 rounded-full animate-bounce ${
                          mode === "wellbeing" ? "bg-green-400" : "bg-purple-400"
                        }`}
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className={`w-2 h-2 rounded-full animate-bounce ${
                          mode === "wellbeing" ? "bg-green-400" : "bg-purple-400"
                        }`}
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="h-16" />
              <div ref={messagesEndRef} />

              {showScrollButton && (
                <div className="sticky bottom-0 left-0 right-0 flex justify-center pb-4 pointer-events-none">
                  <button
                    onClick={scrollToBottom}
                    className={`pointer-events-auto text-white rounded-full w-10 h-10 shadow-lg transition-all duration-200 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 hover:scale-110 active:scale-95 ${
                      mode === "wellbeing" ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"
                    }`}
                    aria-label="Scroll to bottom"
                    title="Scroll to latest message"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              )}

              {showBottomGradient && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 dark:from-gray-950 to-transparent pointer-events-none z-10" />
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 rounded-b-2xl">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isTyping ? "Zara is typing..." : "Ask Zara anything..."}
                  disabled={isTyping}
                  className={`w-full rounded-xl px-4 py-3 pr-12 text-sm resize-none transition-all duration-150 placeholder:text-gray-400 ${
                    isTyping
                      ? "bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60"
                      : mode === "wellbeing"
                        ? "bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 focus:border-green-500 dark:focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/50 focus:shadow-lg"
                        : "bg-white dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 focus:shadow-lg"
                  } focus:outline-none`}
                  rows={1}
                  style={{ maxHeight: "80px" }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className={`absolute right-2 bottom-2 rounded-lg p-2 transition-all duration-150 ${
                    inputValue.trim() && !isTyping
                      ? mode === "wellbeing"
                        ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer hover:scale-105 active:scale-95"
                        : "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer hover:scale-105 active:scale-95"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-40"
                  }`}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>

            <div
              onMouseDown={handleResizeStart}
              className={`absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize group transition-colors flex items-center justify-center ${
                mode === "wellbeing"
                  ? "hover:bg-green-100 dark:hover:bg-green-900/20"
                  : "hover:bg-purple-100 dark:hover:bg-purple-900/20"
              }`}
              title="Drag to resize"
            >
              <GripHorizontal
                className={`w-8 h-4 transition-colors ${
                  mode === "wellbeing"
                    ? "text-gray-300 dark:text-gray-600 group-hover:text-green-500 dark:group-hover:text-green-400"
                    : "text-gray-300 dark:text-gray-600 group-hover:text-purple-500 dark:group-hover:text-purple-400"
                }`}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
