"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Send, Paperclip, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const SHORTCUT_DESCRIPTION =
  "Quando ambulabat agendis admonere te qualis actio. Si ad corpus, quae plerumque."

export function HomeContent() {
  const [attachOpen, setAttachOpen] = useState(false)
  const attachRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setAttachOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        What do you want to analyze?
      </h1>

      {/* Input area */}
      <div className="relative w-full max-w-2xl">
        <div className="relative flex min-h-[120px] flex-col rounded-xl border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <textarea
            placeholder="Ask Glassbox anything"
            className="flex-1 resize-none rounded-xl border-0 bg-transparent px-4 pt-4 pb-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            rows={3}
          />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="relative" ref={attachRef}>
              <button
                type="button"
                onClick={() => setAttachOpen((o) => !o)}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Attach file"
              >
                <Plus className="size-5" />
              </button>
              {attachOpen && (
                <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[220px] rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Paperclip className="size-4 shrink-0" />
                    Attach rent roll
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Paperclip className="size-4 shrink-0" />
                    Attach Offering Memorandum
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label="Submit"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Shortcut cards */}
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            className={cn(
              "flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left",
              "hover:bg-accent/50 hover:border-primary/20 transition-colors"
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium">Shortcut</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {SHORTCUT_DESCRIPTION}
            </p>
          </button>
        ))}
      </div>
    </main>
  )
}
