import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function GlassboxBrand({
  href = "/landing",
  className,
}: {
  href?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <Image
        src="/newmark_symbol_light.svg"
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0"
        aria-hidden
      />
      <p className="text-sm font-semibold tracking-tight">Glassbox</p>
    </Link>
  )
}
