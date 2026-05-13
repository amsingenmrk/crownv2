import {
  Beer,
  Coffee,
  Dumbbell,
  Leaf,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

export type ModId = "gym" | "bar" | "cafe" | "restaurant" | "leed"

export type ModValues = Record<ModId, string>

export type ModOption = {
  value: string
  title: string
  description: string
}

export type ModConfig = {
  id: ModId
  checkboxLabel: string
  icon: LucideIcon
  options: ModOption[]
}

const GYM_OPTIONS: ModOption[] = [
  {
    value: "training-gym",
    title: "Training gym",
    description: "Martial arts, boxing, or class-led training concept.",
  },
  {
    value: "weight-room",
    title: "Weight room",
    description: "Strength-focused tenant gym with moderate staffing needs.",
  },
  {
    value: "yoga-pilates",
    title: "Yoga / Pilates studio",
    description:
      "Wellness-forward studio centered on classes, stretching, and recovery.",
  },
  {
    value: "full-service",
    title: "Full-service",
    description:
      "Equinox-style amenity with full staffing, broader programming, and the largest gym footprint.",
  },
]

const CAFE_OPTIONS: ModOption[] = [
  {
    value: "grab-and-go",
    title: "Grab-and-go coffee / tea",
    description: "Small counter service focused on speed and convenience.",
  },
  {
    value: "social-work-friendly-cafe",
    title: "Social / work-friendly cafe",
    description: "Longer dwell-time cafe with seating and informal work zones.",
  },
  {
    value: "health-drinks",
    title: "Health drinks",
    description:
      "Smoothies, juices, and wellness-oriented grab-and-go service.",
  },
]

const RESTAURANT_OPTIONS: ModOption[] = [
  {
    value: "white-cloth",
    title: "White Cloth",
    description:
      "Destination dining concept with the broadest operating scope and uplift case.",
  },
  {
    value: "takeout",
    title: "Takeout",
    description:
      "Compact service footprint optimized for speed and low staffing.",
  },
  {
    value: "fast-casual",
    title: "Fast Casual (fast food)",
    description: "Mid-range buildout with good reach and efficient operations.",
  },
  {
    value: "family-friendly",
    title: "Family-friendly",
    description:
      "Broader-appeal dining concept with a larger seating footprint.",
  },
  {
    value: "deli",
    title: "Deli",
    description:
      "Efficient daytime F&B offer with a modest but durable premium.",
  },
]

const LEED_OPTIONS: ModOption[] = [
  {
    value: "leed-certified",
    title: "Certified",
    description:
      "Entry-level sustainability upgrade with the lightest retrofit scope.",
  },
  {
    value: "leed-silver",
    title: "Silver",
    description:
      "Moderate efficiency and materials upgrade with broader marketability.",
  },
  {
    value: "leed-gold",
    title: "Gold",
    description:
      "Stronger certification target with clearer rent and leasing upside.",
  },
  {
    value: "leed-platinum",
    title: "Platinum",
    description:
      "Highest certification ambition with the strongest premium assumptions.",
  },
]

const BAR_OPTIONS: ModOption[] = [
  {
    value: "sports-bar",
    title: "Sports bar",
    description:
      "Game-day destination with AV buildout and heavier operations.",
  },
  {
    value: "traditional-pubs",
    title: "Traditional bars/ pubs",
    description:
      "Steady neighborhood-style hospitality with balanced cost profile.",
  },
  {
    value: "cocktail-bar",
    title: "Cocktail bar",
    description:
      "Evening-focused hospitality concept targeting stronger rent lift.",
  },
  {
    value: "beer-garden",
    title: "Beer garden",
    description:
      "Indoor-outdoor style concept with lighter build cost but broader reach.",
  },
]

export const MOD_CONFIGS: ModConfig[] = [
  { id: "gym", checkboxLabel: "Add Gym", icon: Dumbbell, options: GYM_OPTIONS },
  { id: "bar", checkboxLabel: "Add Bar", icon: Beer, options: BAR_OPTIONS },
  {
    id: "cafe",
    checkboxLabel: "Add Cafe",
    icon: Coffee,
    options: CAFE_OPTIONS,
  },
  {
    id: "restaurant",
    checkboxLabel: "Add Restaurant",
    icon: UtensilsCrossed,
    options: RESTAURANT_OPTIONS,
  },
  {
    id: "leed",
    checkboxLabel: "LEED certification",
    icon: Leaf,
    options: LEED_OPTIONS,
  },
]

export const MOD_IDS: ModId[] = ["gym", "bar", "cafe", "restaurant", "leed"]

export const INITIAL_MOD_VALUES: ModValues = {
  gym: "",
  bar: "",
  cafe: "",
  restaurant: "",
  leed: "",
}

export type ActiveModificationSelection = {
  id: ModId
  checkboxLabel: string
  optionValue: string
  optionTitle: string
}

export function getModConfig(id: ModId) {
  return MOD_CONFIGS.find((config) => config.id === id) ?? null
}

export function getSelectedModificationDetails(
  values: ModValues
): ActiveModificationSelection[] {
  return MOD_CONFIGS.flatMap((config) => {
    const optionValue = values[config.id]
    if (optionValue == null || optionValue === "") {
      return []
    }

    const option =
      config.options.find((candidate) => candidate.value === optionValue) ??
      null

    return [
      {
        id: config.id,
        checkboxLabel: config.checkboxLabel,
        optionValue,
        optionTitle: option?.title ?? optionValue,
      },
    ]
  })
}
