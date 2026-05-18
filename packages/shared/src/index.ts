export type UserRole = "owner" | "manager" | "cashier"

export type AccountPlan = "starter" | "pro" | "enterprise"

export interface Account {
  id: string
  name: string
  plan: AccountPlan
  stripeCustomerId?: string
  createdAt: Date
}

export interface Location {
  id: string
  accountId: string
  name: string
  address: string
  timezone: string
  active: boolean
}

export interface User {
  id: string
  accountId: string
  name: string
  email: string
  role: UserRole
  locationIds: string[]
}

export interface Service {
  id: string
  locationId: string
  name: string
  price: number
  durationMins: number
  category: string
}

export interface Customer {
  id: string
  accountId: string
  name: string
  phone?: string
  email?: string
  vehicles: Vehicle[]
  loyaltyPoints: number
  membershipId?: string
}

export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  color?: string
}

export type QueueStatus = "waiting" | "in_progress" | "ready" | "completed"

export interface QueueEntry {
  id: string
  locationId: string
  customerId?: string
  vehicleId?: string
  serviceId: string
  bayId?: string
  status: QueueStatus
  checkedInAt: Date
  completedAt?: Date
}
