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

const BASE_FLOORS: readonly FloorSeed[] = [
  {
    floor: 18,
    totalSqft: 19850,
    tenants: [
      { name: "Northstar Capital", space: "18A", sqft: 8425, expiration: "2029-09-30" },
      { name: "Vacant", space: "18B", sqft: 3150, note: "Available direct", isVacant: true },
      { name: "Aperture Legal", space: "18C", sqft: 5125, expiration: "2026-06-30" },
      { name: "Kepler Ventures", space: "18D", sqft: 3150, expiration: "2028-12-31" },
    ],
  },
  {
    floor: 17,
    totalSqft: 20120,
    tenants: [
      { name: "Atlas Financial", space: "17A", sqft: 10320, expiration: "2027-05-31" },
      { name: "Harbor Advisory", space: "17B", sqft: 4280, expiration: "2031-03-31" },
      { name: "Vacant", space: "17C", sqft: 5520, note: "Prebuilt suite", isVacant: true },
    ],
  },
  {
    floor: 16,
    totalSqft: 19440,
    tenants: [
      { name: "Meridian Insurance", space: "16A", sqft: 6240, expiration: "2025-11-30" },
      { name: "Bluebridge Tech", space: "16B", sqft: 3920, expiration: "2028-08-31" },
      { name: "Sable Partners", space: "16C", sqft: 5020, expiration: "2030-01-31" },
      { name: "Quill Health", space: "16D", sqft: 4260, expiration: "2026-09-30" },
    ],
  },
  {
    floor: 15,
    totalSqft: 18810,
    tenants: [
      { name: "Vacant", space: "15A", sqft: 6210, note: "Built office", isVacant: true },
      { name: "Beacon Media", space: "15B", sqft: 8310, expiration: "2029-04-30" },
      { name: "Stone & Rowe", space: "15C", sqft: 4290, expiration: "2027-10-31" },
    ],
  },
  {
    floor: 14,
    totalSqft: 20550,
    tenants: [
      { name: "Orbit Dynamics", space: "14A", sqft: 9620, expiration: "2032-02-29" },
      { name: "Eastpoint Labs", space: "14B", sqft: 5180, expiration: "2028-05-31" },
      { name: "Vacant", space: "14C", sqft: 5750, note: "Plug-and-play", isVacant: true },
    ],
  },
  {
    floor: 13,
    totalSqft: 19780,
    tenants: [
      { name: "Lattice Systems", space: "13A", sqft: 7250, expiration: "2026-12-31" },
      { name: "West Harbor Bank", space: "13B", sqft: 6860, expiration: "2029-06-30" },
      { name: "Summit Private Equity", space: "13C", sqft: 5670, expiration: "2030-07-31" },
    ],
  },
  {
    floor: 12,
    totalSqft: 19040,
    tenants: [
      { name: "Vacant", space: "12A", sqft: 3820, note: "Contiguous opportunity", isVacant: true },
      { name: "Avondale Counsel", space: "12B", sqft: 4910, expiration: "2025-08-31" },
      { name: "Glassline Studio", space: "12C", sqft: 3880, expiration: "2027-02-28" },
      { name: "Pinnacle Tax", space: "12D", sqft: 6430, expiration: "2028-11-30" },
    ],
  },
  {
    floor: 11,
    totalSqft: 18690,
    tenants: [
      { name: "Union Square Capital", space: "11A", sqft: 8340, expiration: "2029-01-31" },
      { name: "Vacant", space: "11B", sqft: 2410, note: "Spec suite", isVacant: true },
      { name: "Nexa Data", space: "11C", sqft: 7940, expiration: "2026-03-31" },
    ],
  },
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

const BUILDING_ADDRESSES = [
  "200 Park Avenue, New York, NY",
  "181 West Madison Street, Chicago, IL",
  "600 Congress Avenue, Austin, TX",
  "101 California Street, San Francisco, CA",
] as const

function hashText(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
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

function rotateFloors(assetId: string): readonly FloorSeed[] {
  const shift = hashText(assetId) % BASE_FLOORS.length
  return BASE_FLOORS.map((_, index) => BASE_FLOORS[(index + shift) % BASE_FLOORS.length]!)
}

export function getSampleStackingPlanData(assetId: string): StackingPlanDataset {
  const rotated = rotateFloors(assetId)

  const floors = rotated
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
        const address = BUILDING_ADDRESSES[hashText(assetId) % BUILDING_ADDRESSES.length]!
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
          propertyType: "Office",
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
