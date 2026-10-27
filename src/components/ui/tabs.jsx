"use client"

import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"
import { SlidingThumb, useSlidingThumb } from "@/components/common/Segmented"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

// Pestañas tipo pastilla del diseño de TaskFlow: el fondo crema se desliza hasta la activa
const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit flex-wrap items-center gap-1 text-muted-foreground group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        line: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}) {
  const listRef = React.useRef(null)
  const thumbRef = React.useRef(null)
  const [activeKey, setActiveKey] = React.useState(0)

  // Radix cambia data-state en los triggers; se observa para mover el indicador
  React.useEffect(() => {
    const list = listRef.current
    if (!list) return undefined
    const observer = new MutationObserver(() => setActiveKey((key) => key + 1))
    observer.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] })
    return () => observer.disconnect()
  }, [])
  useSlidingThumb(listRef, thumbRef, '[data-slot="tabs-trigger"][data-state="active"]', activeKey)

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <SlidingThumb thumbRef={thumbRef} />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-[state=active]:font-semibold data-[state=active]:text-accent-text",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("tf-fade flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
