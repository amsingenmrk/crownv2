import { getAssetById } from "@/lib/assets"

export type StackingViewMode = "detailed" | "simplified"

export type StackingLegendItem = {
  label: string
  color: string
}

export type StackingPlanContact = {
  role: string
  name: string
  title: string
  phone: string
  email: string
}

export type StackingPlanTenant = {
  id: string
  name: string
  space: string
  sqft: number
  sqftLabel: string
  expiration: string
  color: string
  widthPercent: number
  isVacant: boolean
  address: string
  floorLabel: string
  owner: string
  propertyType: string
  verificationStatus: string
  availabilityStatus: string
  leaseType?: string
  leaseCommencementDate?: string
  leaseExpirationDate?: string
  lastUpdatedDate: string
  annualRent?: string
  rentPerSf?: string
  contractRatePsfValue?: number
  predictedRentPsfValue?: number
  rentPremiumPctValue?: number
  sunScore?: number
  viewScore?: number
  contractRate?: string
  predictedRent?: string
  rentPremium?: string
  contacts: StackingPlanContact[]
  note?: string
}

export type StackingPlanFloor = {
  floor: number
  sqft: string
  occupancy: string
  occupancyPercent: number
  vacancyPercent: number
  tenants: StackingPlanTenant[]
}

export type StackingPlanSummary = {
  totalSqft: number
  totalTenants: number
  overallOccupancyPercent: number
}

export type StackingPlanDataset = {
  floors: StackingPlanFloor[]
  summary: StackingPlanSummary
}

type TenantSeed = {
  name: string
  space: string
  sqft: number
  expiration?: string
  note?: string
  isVacant?: boolean
}

type FloorSeed = {
  floor: number
  totalSqft: number
  tenants: TenantSeed[]
}

export const STACKING_EXPIRATION_LEGEND: readonly StackingLegendItem[] = [
  { label: "2025", color: "#ef4444" },
  { label: "2026", color: "#f97316" },
  { label: "2027", color: "#a855f7" },
  { label: "2028", color: "#14b8a6" },
  { label: "2029", color: "#3b82f6" },
  { label: "2030+", color: "#22c55e" },
] as const

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
})

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

const OWNER_NAMES = [
  "Hawthorne Asset Management",
  "Granite Peak Properties",
  "Northline Office Partners",
  "Waterfront Institutional Realty",
] as const

const BROKER_NAMES = [
  { name: "Andrea Williams", title: "Managing Director" },
  { name: "Maya Chen", title: "Senior Vice President" },
  { name: "Jordan Patel", title: "Executive Managing Director" },
  { name: "Ryan Ellis", title: "Vice Chairman" },
] as const

const TENANT_CONTACT_NAMES = [
  { name: "Greg Hunter", title: "Chief Executive Officer" },
  { name: "Elena Brooks", title: "Chief Financial Officer" },
  { name: "Sonia Ramirez", title: "Head of Real Estate" },
  { name: "Martin Lowe", title: "Operations Director" },
] as const

const TENANT_PREFIXES = [
  "Atlas",
  "Northstar",
  "Harbor",
  "Bluebridge",
  "Aperture",
  "Kepler",
  "Meridian",
  "Beacon",
  "Orbit",
  "Eastpoint",
  "Lattice",
  "Summit",
  "Pinnacle",
  "Union Square",
  "Nexa",
  "Crescent",
  "Hudson",
  "Stonegate",
  "Silverline",
  "Parkview",
  "Ridgeway",
  "Westport",
  "Greenline",
  "Broadleaf",
  "Crosswind",
  "Ironwood",
  "Lakefront",
  "Metro",
  "Skyline",
  "Catalyst",
] as const

const TENANT_SUFFIXES_BY_GROUP = {
  office: [
    "Capital",
    "Advisory",
    "Partners",
    "Legal",
    "Ventures",
    "Analytics",
    "Media",
    "Systems",
    "Labs",
    "Counsel",
    "Consulting",
    "Studio",
  ],
  industrial: [
    "Logistics",
    "Distribution",
    "Manufacturing",
    "Fulfillment",
    "Packaging",
    "Freight",
    "Cold Storage",
    "Supply",
    "Operations",
    "Materials",
    "Foods",
    "Works",
  ],
  retail: [
    "Collective",
    "Outfitters",
    "Mercantile",
    "Market",
    "Home",
    "Goods",
    "Kitchen",
    "Studio",
    "Exchange",
    "Retail",
    "Gallery",
    "Supply",
  ],
} as const

const VACANCY_NOTES = [
  "Plug-and-play suite",
  "Prebuilt spec suite",
  "Available direct",
  "Built office opportunity",
  "Contiguous expansion space",
  "Marketing ready",
] as const

const PROPERTY_TYPE_BY_GROUP = {
  office: "Office",
  industrial: "Industrial",
  retail: "Retail",
} as const

type RandomFn = () => number

function hashText(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function createPrng(seed: number): RandomFn {
  let state = seed === 0 ? 0x9e3779b9 : seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function randomInt(random: RandomFn, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min
}

function pickOne<T>(random: RandomFn, values: readonly T[]): T {
  return values[randomInt(random, 0, values.length - 1)]!
}

function shuffle<T>(random: RandomFn, values: T[]): T[] {
  const next = [...values]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(random, 0, index)
    const current = next[index]
    next[index] = next[swapIndex]!
    next[swapIndex] = current!
  }
  return next
}

function formatSqft(value: number): string {
  return `${value.toLocaleString()} SF`
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function formatCurrencyPerSf(value: number): string {
  return `$${value.toFixed(2)} / SF`
}

function expirationColor(expiration?: string, isVacant?: boolean): string {
  if (isVacant || expiration == null || expiration === "") return "#64748b"
  const year = Number(expiration.slice(0, 4))
  if (Number.isNaN(year)) return "#64748b"
  if (year <= 2025) return "#ef4444"
  if (year === 2026) return "#f97316"
  if (year === 2027) return "#a855f7"
  if (year === 2028) return "#14b8a6"
  if (year === 2029) return "#3b82f6"
  return "#22c55e"
}

function formatExpiration(expiration?: string, isVacant?: boolean): string {
  if (isVacant) return "Available"
  if (expiration == null || expiration === "") return "N/A"
  const date = new Date(expiration)
  if (Number.isNaN(date.getTime())) return "N/A"
  return dateFormatter.format(date)
}

export function formatLongDate(dateValue?: string): string {
  if (dateValue == null || dateValue === "") return "N/A"
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "N/A"
  return longDateFormatter.format(date)
}

function formatPhone(seed: number): string {
  const blockOne = 200 + (seed % 700)
  const blockTwo = 100 + ((seed >> 3) % 900)
  const blockThree = 1000 + ((seed >> 5) % 9000)
  return `(${blockOne}) ${blockTwo}-${blockThree}`
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function deriveLeaseCommencementDate(expiration: string, seed: number): string {
  const date = new Date(expiration)
  const termYears = 4 + (seed % 4)
  date.setFullYear(date.getFullYear() - termYears)
  return toIsoDate(date)
}

function deriveLastUpdatedDate(seed: number): string {
  const date = new Date("2026-03-31T12:00:00Z")
  const daysAgo = 7 + (seed % 75)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return toIsoDate(date)
}

function buildContacts(
  assetId: string,
  tenantName: string,
  owner: string,
  isVacant: boolean
): StackingPlanContact[] {
  const seed = hashText(`${assetId}:${tenantName}`)
  const broker = BROKER_NAMES[seed % BROKER_NAMES.length]!
  const tenantRep = TENANT_CONTACT_NAMES[(seed + 1) % TENANT_CONTACT_NAMES.length]!
  const brokerEmail = broker.name.toLowerCase().replace(/\s+/g, ".")
  const tenantEmail = tenantRep.name.toLowerCase().replace(/\s+/g, ".")

  const contacts: StackingPlanContact[] = [
    {
      role: "Broker",
      name: broker.name,
      title: broker.title,
      phone: formatPhone(seed),
      email: `${brokerEmail}@leasing.example.com`,
    },
    {
      role: "Owner",
      name: owner,
      title: "Asset Manager",
      phone: formatPhone(seed + 17),
      email: `asset.manager.${seed % 9}@owner.example.com`,
    },
  ]

  if (!isVacant) {
    contacts.push({
      role: "Tenant",
      name: tenantRep.name,
      title: tenantRep.title,
      phone: formatPhone(seed + 31),
      email: `${tenantEmail}@tenant.example.com`,
    })
  }

  return contacts
}

function buildQuarterEndDate(random: RandomFn): string {
  const year = 2025 + randomInt(random, 0, 9)
  const month = [3, 6, 9, 12][randomInt(random, 0, 3)]!
  const day = month === 3 ? 31 : month === 12 ? 31 : 30
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function buildTenantName(
  assetGroupId: string,
  random: RandomFn,
  usedNames: Set<string>
): string {
  const suffixes =
    TENANT_SUFFIXES_BY_GROUP[
      assetGroupId === "industrial" || assetGroupId === "retail" ? assetGroupId : "office"
    ]

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = `${pickOne(random, TENANT_PREFIXES)} ${pickOne(random, suffixes)}`
    const key = candidate.toLowerCase()
    if (!usedNames.has(key)) {
      usedNames.add(key)
      return candidate
    }
  }

  const fallback = `${pickOne(random, TENANT_PREFIXES)} ${pickOne(
    random,
    suffixes
  )} ${usedNames.size + 1}`
  usedNames.add(fallback.toLowerCase())
  return fallback
}

function buildSuiteSqfts(totalSqft: number, suiteCount: number, random: RandomFn): number[] {
  const sizes: number[] = []
  let remainingSqft = totalSqft

  for (let index = 0; index < suiteCount; index += 1) {
    if (index === suiteCount - 1) {
      sizes.push(remainingSqft)
      break
    }

    const remainingSuites = suiteCount - index - 1
    const minRemainingSqft = remainingSuites * 1800
    const averageSqft = remainingSqft / (remainingSuites + 1)
    const minCurrentSqft = Math.max(1800, Math.floor(averageSqft * 0.55))
    const maxCurrentSqft = Math.max(
      minCurrentSqft,
      Math.min(remainingSqft - minRemainingSqft, Math.floor(averageSqft * 1.45))
    )

    let nextSqft = randomInt(random, minCurrentSqft, maxCurrentSqft)
    nextSqft = Math.round(nextSqft / 10) * 10
    nextSqft = Math.min(nextSqft, remainingSqft - minRemainingSqft)
    nextSqft = Math.max(nextSqft, 1800)

    sizes.push(nextSqft)
    remainingSqft -= nextSqft
  }

  return sizes.sort((left, right) => right - left)
}

function buildFloorSeedsForAsset(assetId: string): FloorSeed[] {
  const asset = getAssetById(assetId)
  const seed = hashText(`stacking:${assetId}`)
  const random = createPrng(seed)
  const floorCount = 12 + (seed % 17)
  const targetOccupancyPct = asset?.occupiedPercent ?? (68 + (seed % 24))
  const targetOccupiedShare = Math.max(0.58, Math.min(0.96, targetOccupancyPct / 100))
  const usedTenantNames = new Set<string>()

  const floors: FloorSeed[] = []

  for (let floor = floorCount; floor >= 1; floor -= 1) {
    const totalSqft = 14500 + randomInt(random, 0, 8500)
    const suiteCount = randomInt(random, 2, 5)
    const suiteSqfts = buildSuiteSqfts(totalSqft, suiteCount, random)
    const vacancyOrder = shuffle(
      random,
      Array.from({ length: suiteCount }, (_, index) => index)
    )
    const targetVacancySqft = Math.round(
      totalSqft * (1 - targetOccupiedShare) * (0.78 + random() * 0.5)
    )
    const vacantIndices = new Set<number>()
    let remainingVacancySqft = targetVacancySqft

    for (const suiteIndex of vacancyOrder) {
      if (vacantIndices.size >= suiteCount - 1) break

      const suiteSqft = suiteSqfts[suiteIndex] ?? 0
      const shouldVacate =
        remainingVacancySqft > totalSqft * 0.08 &&
        (random() < 0.72 || remainingVacancySqft > totalSqft * 0.18)

      if (!shouldVacate) continue

      vacantIndices.add(suiteIndex)
      remainingVacancySqft -= suiteSqft
    }

    const tenants = suiteSqfts.map((sqft, suiteIndex) => {
      const suiteLabel = `${floor}${String.fromCharCode(65 + suiteIndex)}`
      const isVacant = vacantIndices.has(suiteIndex)

      return {
        name: isVacant
          ? "Vacant"
          : buildTenantName(asset?.groupId ?? "office", random, usedTenantNames),
        space: suiteLabel,
        sqft,
        expiration: isVacant ? undefined : buildQuarterEndDate(random),
        note: isVacant ? pickOne(random, VACANCY_NOTES) : undefined,
        isVacant,
      }
    })

    floors.push({
      floor,
      totalSqft: suiteSqfts.reduce((sum, sqft) => sum + sqft, 0),
      tenants,
    })
  }

  return floors
}

export function getSampleStackingPlanData(assetId: string): StackingPlanDataset {
  const asset = getAssetById(assetId)
  const floorSeeds = buildFloorSeedsForAsset(assetId)
  const propertyType =
    PROPERTY_TYPE_BY_GROUP[
      asset?.groupId === "industrial" || asset?.groupId === "retail" ? asset.groupId : "office"
    ]
  const address = asset?.address ?? "Address unavailable"

  const floors = floorSeeds
    .map((floorSeed) => {
      const occupiedSqft = floorSeed.tenants.reduce(
        (sum, tenant) => sum + (tenant.isVacant ? 0 : tenant.sqft),
        0
      )
      const occupancyPercent = Math.round((occupiedSqft / floorSeed.totalSqft) * 100)
      const vacancyPercent = Math.max(0, 100 - occupancyPercent)

      const tenants = floorSeed.tenants.map((tenant, index) => {
        const tenantSeed = hashText(`${assetId}:${floorSeed.floor}:${tenant.space}:${tenant.name}`)
        const leaseCommencementDate =
          tenant.isVacant || tenant.expiration == null
            ? undefined
            : deriveLeaseCommencementDate(tenant.expiration, tenantSeed)
        const contractRatePerSfValue = 36 + ((tenantSeed % 15) * 1.15)
        const rentPremiumPerSfValue = 1.4 + (((tenantSeed >> 2) % 8) * 0.45)
        const predictedRentPerSfValue = contractRatePerSfValue + rentPremiumPerSfValue
        const rentPremiumPct = (rentPremiumPerSfValue / contractRatePerSfValue) * 100
        const floorLift = Math.max(0, floorSeed.floor - 10)
        const sunScore = Math.min(98, 24 + ((tenantSeed >> 4) % 42) + (floorLift * 2))
        const viewScore = Math.min(99, 20 + ((tenantSeed >> 7) % 44) + Math.round(floorLift * 2.4))
        const owner = OWNER_NAMES[tenantSeed % OWNER_NAMES.length]!
        const isVacant = tenant.isVacant === true
        const lastUpdatedDate = deriveLastUpdatedDate(tenantSeed)

        return {
          id: `${floorSeed.floor}-${index}-${tenant.space}`,
          name: tenant.name,
          space: `Ste ${tenant.space}`,
          sqft: tenant.sqft,
          sqftLabel: formatSqft(tenant.sqft),
          expiration: formatExpiration(tenant.expiration, tenant.isVacant),
          color: expirationColor(tenant.expiration, tenant.isVacant),
          widthPercent: Number(((tenant.sqft / floorSeed.totalSqft) * 100).toFixed(2)),
          isVacant,
          address,
          floorLabel: `Floor ${floorSeed.floor}`,
          owner,
          propertyType,
          verificationStatus: isVacant ? "Marketing ready" : "Lease abstract verified",
          availabilityStatus: isVacant ? "Available now" : "Occupied",
          leaseType: isVacant ? undefined : tenantSeed % 2 === 0 ? "Modified Gross" : "NNN",
          leaseCommencementDate,
          leaseExpirationDate: isVacant ? undefined : tenant.expiration,
          lastUpdatedDate,
          annualRent: isVacant ? undefined : formatCurrency(tenant.sqft * contractRatePerSfValue),
          rentPerSf: isVacant ? undefined : formatCurrencyPerSf(contractRatePerSfValue),
          contractRatePsfValue: isVacant ? undefined : contractRatePerSfValue,
          predictedRentPsfValue: isVacant ? undefined : predictedRentPerSfValue,
          rentPremiumPctValue: isVacant ? undefined : rentPremiumPct,
          sunScore,
          viewScore,
          contractRate: isVacant ? undefined : formatCurrencyPerSf(contractRatePerSfValue),
          predictedRent: isVacant ? undefined : formatCurrencyPerSf(predictedRentPerSfValue),
          rentPremium:
            isVacant
              ? undefined
              : `+$${rentPremiumPerSfValue.toFixed(2)} / SF (${rentPremiumPct.toFixed(1)}%)`,
          contacts: buildContacts(assetId, tenant.name, owner, isVacant),
          note: tenant.note,
        }
      })

      return {
        floor: floorSeed.floor,
        sqft: formatSqft(floorSeed.totalSqft),
        occupancy: `${occupancyPercent}%`,
        occupancyPercent,
        vacancyPercent,
        tenants,
      }
    })
    .sort((a, b) => b.floor - a.floor)

  const totalSqft = floors.reduce((sum, floor) => {
    return sum + floor.tenants.reduce((floorSum, tenant) => floorSum + tenant.sqft, 0)
  }, 0)

  const occupiedSqft = floors.reduce((sum, floor) => {
    return (
      sum + floor.tenants.reduce((floorSum, tenant) => floorSum + (tenant.isVacant ? 0 : tenant.sqft), 0)
    )
  }, 0)

  const uniqueTenants = new Set(
    floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => !tenant.isVacant)
      .map((tenant) => tenant.name.toLowerCase())
  )

  return {
    floors,
    summary: {
      totalSqft,
      totalTenants: uniqueTenants.size,
      overallOccupancyPercent: Number(((occupiedSqft / totalSqft) * 100).toFixed(2)),
    },
  }
}
