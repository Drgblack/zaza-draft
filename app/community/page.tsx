"use client";
export const revalidate = 0;

import { useState } from "react"
import { Users, FileText, Lightbulb, TrendingUp, MessageSquare, Star, ThumbsUp, Mail, Search } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { MobileNav } from "@/components/mobile-nav"
import { Header } from "@/components/header"

export default function CommunityPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<"discussion" | "templates" | "stories" | "tips">("discussion")

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row pb-16 lg:pb-0">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header title="Community" subtitle="Connect with other teachers" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mb-8">{/* Removed redundant title and subtitle */}</div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Active Teachers */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">2,847</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Teachers using Zaza Draft</div>
                </div>
              </div>

              {/* Templates Shared */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">1,234</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Community templates</div>
                </div>
              </div>

              {/* Tips Exchanged */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">5,621</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tips and best practices</div>
                </div>
              </div>

              {/* This Week */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">+156</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">New members this week</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-800 mb-8">
            <div className="flex gap-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab("discussion")}
                className={`pb-4 px-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "discussion"
                    ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Discussion
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`pb-4 px-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "templates"
                    ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Shared Templates
              </button>
              <button
                onClick={() => setActiveTab("stories")}
                className={`pb-4 px-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "stories"
                    ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Success Stories
              </button>
              <button
                onClick={() => setActiveTab("tips")}
                className={`pb-4 px-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === "tips"
                    ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Tips & Tricks
              </button>
            </div>
          </div>

          {/* Discussion Tab */}
          {activeTab === "discussion" && (
            <div className="space-y-8">
              {/* Post Categories */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Discussion Categories</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: "Parent Communication", count: 128, popular: true },
                    { name: "Behavior Management", count: 94 },
                    { name: "Work-Life Balance", count: 156 },
                    { name: "Technical Help", count: 67 },
                    { name: "Feature Requests", count: 89 },
                    { name: "General Chat", count: 203 },
                  ].map((category) => (
                    <div
                      key={category.name}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        {category.popular && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{category.count} discussions</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Discussions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Discussions</h2>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">+ Start a Discussion</Button>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: "How do you handle late homework submissions?",
                      author: "Sarah from Manchester",
                      preview:
                        "I've been struggling with students consistently turning in homework late. What strategies have worked for you?",
                      replies: 12,
                      time: "2 hours ago",
                      tags: ["Homework", "Year 6"],
                    },
                    {
                      title: "Best tone for first parent contact of the year?",
                      author: "James T., Primary Teacher",
                      preview:
                        "Starting with a new class next week. What tone do you recommend for the first parent email?",
                      replies: 8,
                      time: "5 hours ago",
                      tags: ["Communication", "Best Practice"],
                    },
                    {
                      title: "Zaza Draft saved my report card week!",
                      author: "Emma L., Year 3",
                      preview:
                        "Just finished report cards in half the time. This tool is incredible for maintaining consistency...",
                      replies: 24,
                      time: "1 day ago",
                      tags: ["Success Story", "Report Cards"],
                    },
                    {
                      title: "Tips for maintaining boundaries with parent emails?",
                      author: "Michael Chen",
                      preview:
                        "Parents expect instant responses. How do you set healthy boundaries while staying professional?",
                      replies: 15,
                      time: "1 day ago",
                      tags: ["Boundaries", "Wellbeing"],
                    },
                  ].map((discussion, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="flex gap-4">
                        <Avatar className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            {discussion.author.charAt(0)}
                          </span>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{discussion.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{discussion.author}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{discussion.preview}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {discussion.replies} replies
                            </span>
                            <span>{discussion.time}</span>
                            <div className="flex gap-2">
                              {discussion.tags.map((tag) => (
                                <span key={tag} className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full">
                    <Lightbulb className="w-4 h-4" />
                    Full forum launching soon!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Shared Templates Tab */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input placeholder="Search templates..." className="w-full" icon={<Search className="w-4 h-4" />} />
                </div>
                <select className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  <option>All Categories</option>
                  <option>Behavior</option>
                  <option>Academic</option>
                  <option>Parent Meetings</option>
                </select>
                <select className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  <option>Most Popular</option>
                  <option>Most Recent</option>
                  <option>Highest Rated</option>
                </select>
              </div>

              {/* Template Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Parent Meeting Invitation - Behavior Concern",
                    category: "Behavior",
                    author: "Emma T., Year 5 Teacher",
                    description:
                      "Professional template for requesting a parent meeting to discuss behavior concerns with empathy and clarity.",
                    rating: 4.8,
                    ratings: 156,
                    uses: 342,
                  },
                  {
                    title: "Positive Progress Report - Reading",
                    category: "Academic",
                    author: "Michael C., Primary",
                    description:
                      "Celebrate student achievements in reading comprehension with this encouraging template.",
                    rating: 4.9,
                    ratings: 203,
                    uses: 567,
                  },
                  {
                    title: "Homework Reminder - Gentle Approach",
                    category: "Academic",
                    author: "Sarah J., Year 6",
                    description: "Kind reminder for missing homework that maintains positive parent relationships.",
                    rating: 4.7,
                    ratings: 128,
                    uses: 289,
                  },
                  {
                    title: "End of Term Thank You Message",
                    category: "General",
                    author: "Lisa M., Secondary",
                    description: "Warm and professional end-of-term message to parents expressing gratitude.",
                    rating: 4.9,
                    ratings: 187,
                    uses: 421,
                  },
                  {
                    title: "Field Trip Permission Follow-up",
                    category: "Events",
                    author: "David R., Year 4",
                    description: "Polite follow-up for parents who haven't returned field trip permission forms.",
                    rating: 4.6,
                    ratings: 94,
                    uses: 178,
                  },
                  {
                    title: "Academic Concern - Early Intervention",
                    category: "Academic",
                    author: "Rachel P., Year 3",
                    description: "Sensitive template for addressing early academic concerns with supportive tone.",
                    rating: 4.8,
                    ratings: 142,
                    uses: 256,
                  },
                ].map((template, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs px-3 py-1 rounded-full">
                        {template.category}
                      </span>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{template.rating}</span>
                        <span className="text-gray-500 dark:text-gray-400">({template.ratings})</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{template.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.author}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">{template.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Used {template.uses} times</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 bg-transparent">
                        Preview
                      </Button>
                      <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">Use Template</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button variant="outline" className="mt-4 bg-transparent">
                  Load More Templates
                </Button>
              </div>
            </div>
          )}

          {/* Success Stories Tab */}
          {activeTab === "stories" && (
            <div className="space-y-8">
              {/* Featured Story */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="w-20 h-20 bg-purple-200 dark:bg-purple-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">MC</span>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      "Zaza Draft saved me 5 hours this week during report card season!"
                    </div>
                    <div className="mb-4">
                      <div className="font-semibold text-gray-900 dark:text-white">Michael Chen</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Year 3 Teacher, London</div>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 space-y-3 mb-6">
                      <p>
                        As a Year 3 teacher with 28 students, report card season used to be my most dreaded time of
                        year. I'd spend entire weekends crafting individual comments, trying to maintain consistency
                        while personalizing each one.
                      </p>
                      <p>
                        With Zaza Draft, I can generate professional, empathetic comments in seconds. The tool helps me
                        maintain my authentic voice while ensuring every parent receives thoughtful, well-written
                        feedback. It's not about replacing my judgmentâ€”it's about giving me back my evenings and
                        weekends.
                      </p>
                      <p>
                        The boundary protection feature has been life-changing. I no longer feel guilty about not
                        responding to parent emails at 10 PM. The tool helps me draft responses during work hours, and
                        I've noticed parents actually respect my time more now.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">132</div>
                        <div className="text-gray-600 dark:text-gray-400">Drafts created</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">87%</div>
                        <div className="text-gray-600 dark:text-gray-400">Time saved</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">5 weeks</div>
                        <div className="text-gray-600 dark:text-gray-400">Perfect boundaries</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* More Stories Grid */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">More Success Stories</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      quote: "This tool changed my work-life balance completely. I actually have evenings now!",
                      name: "Sarah Johnson",
                      role: "Year 6 Teacher, Birmingham",
                      metric: "4 hours saved weekly",
                    },
                    {
                      quote: "Parents have commented on how professional and thoughtful my communications are now.",
                      name: "Emma Thompson",
                      role: "Primary Teacher, Leeds",
                      metric: "200+ drafts created",
                    },
                    {
                      quote:
                        "The empathetic tone option is perfect for sensitive conversations. It's like having a mentor.",
                      name: "David Roberts",
                      role: "Year 4 Teacher, Manchester",
                      metric: "3 months using",
                    },
                    {
                      quote:
                        "Report cards used to take me all weekend. Now I finish in one afternoon with better quality.",
                      name: "Lisa Martinez",
                      role: "Secondary English, London",
                      metric: "90% time reduction",
                    },
                  ].map((story, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="mb-4">
                        <Avatar className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <span className="text-lg font-medium text-blue-600 dark:text-blue-400">
                            {story.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </Avatar>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-4 italic">"{story.quote}"</p>
                      <div className="mb-3">
                        <div className="font-semibold text-gray-900 dark:text-white">{story.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{story.role}</div>
                      </div>
                      <div className="text-sm font-medium text-purple-600 dark:text-purple-400">{story.metric}</div>
                      <button className="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-2">
                        Read more â†’
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <Button variant="outline">Share Your Success Story</Button>
              </div>
            </div>
          )}

          {/* Tips & Tricks Tab */}
          {activeTab === "tips" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Practical Tips from Teachers
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      category: "Time-Saving Strategies",
                      title: "Use 'Empathetic' tone for first-time parent contacts",
                      description:
                        "When reaching out to parents for the first time about a concern, the empathetic tone helps build trust and opens dialogue. It acknowledges the parent's perspective while clearly communicating your message.",
                      author: "Lisa M., Secondary English Teacher",
                      helpful: 124,
                      tags: ["Communication", "Best Practice"],
                    },
                    {
                      category: "Tone Selection Tips",
                      title: "Switch to 'Professional' for formal documentation",
                      description:
                        "For report cards, official records, or communications that may be shared with administration, use the professional tone. It maintains warmth while ensuring appropriate formality.",
                      author: "David R., Year 4 Teacher",
                      helpful: 98,
                      tags: ["Report Cards", "Documentation"],
                    },
                    {
                      category: "Template Customization",
                      title: "Save your most-used phrases as templates",
                      description:
                        "Create templates for common scenarios like homework reminders, positive behavior notes, and meeting requests. You'll save even more time while maintaining consistency.",
                      author: "Emma T., Year 5 Teacher",
                      helpful: 156,
                      tags: ["Efficiency", "Templates"],
                    },
                    {
                      category: "Wellbeing & Boundaries",
                      title: "Set 'quiet hours' to protect your evenings",
                      description:
                        "Use the quiet hours feature to prevent drafting emails late at night. This helps establish healthy boundaries and signals to parents that you have personal time.",
                      author: "Michael C., Primary Teacher",
                      helpful: 187,
                      tags: ["Boundaries", "Wellbeing"],
                    },
                    {
                      category: "Advanced Features",
                      title: "Use the 'Regenerate' button for different approaches",
                      description:
                        "If the first draft doesn't feel quite right, hit regenerate. The AI will give you a fresh perspective on the same situation, often highlighting different aspects.",
                      author: "Sarah J., Year 6 Teacher",
                      helpful: 142,
                      tags: ["Features", "Tips"],
                    },
                    {
                      category: "Time-Saving Strategies",
                      title: "Batch similar communications together",
                      description:
                        "When you have multiple similar messages to send (like progress updates), draft them all in one session. You'll get into a rhythm and maintain consistency.",
                      author: "Rachel P., Year 3 Teacher",
                      helpful: 109,
                      tags: ["Efficiency", "Workflow"],
                    },
                    {
                      category: "Tone Selection Tips",
                      title: "Use 'Encouraging' for struggling students",
                      description:
                        "When communicating about academic challenges, the encouraging tone helps frame concerns positively while still being honest about areas for improvement.",
                      author: "James T., Primary Teacher",
                      helpful: 134,
                      tags: ["Communication", "Student Support"],
                    },
                    {
                      category: "Wellbeing & Boundaries",
                      title: "Review drafts in the morning with fresh eyes",
                      description:
                        "Generate drafts at the end of the day, but review and send them in the morning. You'll catch any needed adjustments and avoid late-night email regret.",
                      author: "Anna K., Secondary Teacher",
                      helpful: 91,
                      tags: ["Wellbeing", "Best Practice"],
                    },
                  ].map((tip, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-4"
                    >
                      <div className="flex items-start gap-4">
                        <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                            {tip.category}
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{tip.title}</h3>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{tip.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-600 dark:text-gray-400">Tip from {tip.author}</div>
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <ThumbsUp className="w-4 h-4" />
                              <span>{tip.helpful} teachers found this helpful</span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {tip.tags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <Button variant="outline">+ Submit Your Tip</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {/* Newsletter CTA */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Teacher Tips Newsletter</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Weekly tips, template highlights, and community updates
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Enter your email" type="email" className="flex-1" />
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">Subscribe</Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No spam, unsubscribe anytime</p>
            </div>

            {/* Feedback CTA */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Got an idea?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Help us build features teachers actually need
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                Submit Feedback
              </Button>
            </div>
          </div>
        </main>

        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>

      <MobileNav />
    </div>
  )
}






