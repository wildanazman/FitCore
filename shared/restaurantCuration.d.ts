export const restaurantExclusions: { name: string; source: string; reason: string }[]
export function restaurantNameKey(name: string): string
export function isExcludedRestaurant(name: string): boolean
export function isNonFoodBusiness(name: string): boolean
