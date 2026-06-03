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
    value: "general-fitness",
    title: "General Fitness",
    description:
      "Broad-based tenant fitness center with standard cardio, strength, and wellness programming.",
  },
  {
    value: "mind-body-studio",
    title: "Mind-Body Studio",
    description:
      "Wellness-forward studio centered on yoga, stretching, recovery, and guided classes.",
  },
  {
    value: "specialty-fitness",
    title: "Specialty Fitness",
    description:
      "Higher-intensity or premium-format fitness concept with the strongest amenity-driven uplift case.",
  },
]

const CAFE_OPTIONS: ModOption[] = [
  {
    value: "coffee-cafe",
    title: "Coffee Cafe",
    description:
      "Traditional coffee-led cafe with seating, casual meetings, and all-day tenant appeal.",
  },
  {
    value: "tea-cafe",
    title: "Tea Cafe",
    description:
      "Lighter wellness-oriented beverage concept focused on tea service and quieter dwell time.",
  },
  {
    value: "bakery-cafe",
    title: "Bakery Cafe",
    description:
      "Pastry-and-coffee offering with a compact food component and steady daytime traffic.",
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
    value: "full-service-restaurant",
    title: "Full-Service Restaurant",
    description:
      "Broader seated dining concept with a larger hospitality footprint and balanced uplift profile.",
  },
  {
    value: "fast-casual-quick-service",
    title: "Fast Casual / Quick Service",
    description:
      "Efficient service model optimized for lunch velocity, convenience, and broad daily usage.",
  },
  {
    value: "specialty-dietary-dining",
    title: "Specialty Dietary Dining",
    description:
      "Niche food concept built around dietary specialization and a smaller but differentiated draw.",
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
    value: "wine-spirits-bar",
    title: "Wine & Spirits Bar",
    description:
      "Evening-focused hospitality concept with a premium beverage mix and stronger rent-lift potential.",
  },
  {
    value: "beer-bar-pub",
    title: "Beer Bar / Pub",
    description:
      "Casual pub-style format with steady traffic and a moderate operating profile.",
  },
  {
    value: "lounge-bar",
    title: "Lounge Bar",
    description:
      "Relaxed lounge-oriented bar concept with balanced buildout needs and broad after-hours appeal.",
  },
]

const LEGACY_MOD_OPTION_VALUE_ALIASES: Partial<Record<ModId, Record<string, string>>> =
  {
    gym: {
      "training-gym": "specialty-fitness",
      "weight-room": "general-fitness",
      "yoga-pilates": "mind-body-studio",
      "full-service": "specialty-fitness",
    },
    bar: {
      "sports-bar": "lounge-bar",
      "traditional-pubs": "beer-bar-pub",
      "cocktail-bar": "wine-spirits-bar",
      "beer-garden": "lounge-bar",
    },
    cafe: {
      "grab-and-go": "coffee-cafe",
      "social-work-friendly-cafe": "coffee-cafe",
      "health-drinks": "tea-cafe",
    },
    restaurant: {
      takeout: "fast-casual-quick-service",
      "fast-casual": "fast-casual-quick-service",
      "family-friendly": "full-service-restaurant",
      deli: "specialty-dietary-dining",
    },
  }

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

export function normalizeModificationOptionValue(id: ModId, value: string): string {
  return LEGACY_MOD_OPTION_VALUE_ALIASES[id]?.[value] ?? value
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
    const rawOptionValue = values[config.id]
    if (rawOptionValue == null || rawOptionValue === "") {
      return []
    }
    const optionValue = normalizeModificationOptionValue(
      config.id,
      rawOptionValue
    )

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
