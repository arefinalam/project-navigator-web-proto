export const countries = [
  'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Canada', 'China',
  'Denmark', 'Finland', 'France', 'Germany', 'India', 'Ireland', 'Italy',
  'Japan', 'Malaysia', 'Netherlands', 'New Zealand', 'Norway', 'Singapore',
  'South Korea', 'Spain', 'Sweden', 'Switzerland', 'United Arab Emirates',
  'United Kingdom', 'United States',
]

export const subjects = [
  'Accounting & Finance', 'Architecture', 'Artificial Intelligence',
  'Business & Management', 'Computer Science', 'Cybersecurity',
  'Data Science & AI', 'Economics', 'Education', 'Engineering',
  'Environmental Science', 'Law', 'Marketing', 'Medicine', 'Nursing',
  'Public Health', 'Robotics', 'Social Sciences', 'Software Engineering',
  'Supply Chain Management',
]

export const universities = [
  'Aalto University',
  'Australian National University',
  'Delft University of Technology',
  'Eindhoven University of Technology',
  'ETH Zurich',
  'Imperial College London',
  'National University of Singapore',
  'North South University',
  'Saarland University',
  'Tampere University',
  'Technical University of Munich',
  'University College London',
  'University of British Columbia',
  'University of Melbourne',
  'University of Toronto',
]

export const currencies = [
  { code: 'USD', label: 'US Dollar', symbol: '$', bdtPerUnit: 122 },
  { code: 'EUR', label: 'Euro', symbol: '€', bdtPerUnit: 140 },
  { code: 'GBP', label: 'British Pound', symbol: '£', bdtPerUnit: 164 },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$', bdtPerUnit: 89 },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', bdtPerUnit: 79 },
  { code: 'BDT', label: 'Bangladeshi Taka', symbol: '৳', bdtPerUnit: 1 },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', bdtPerUnit: 1.43 },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', bdtPerUnit: 0.78 },
  { code: 'CNY', label: 'Chinese Yuan', symbol: 'CN¥', bdtPerUnit: 16.8 },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$', bdtPerUnit: 95 },
  { code: 'AED', label: 'UAE Dirham', symbol: 'AED', bdtPerUnit: 33.2 },
]

export const timezones = [
  'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Asia/Singapore',
  'Asia/Dubai', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/Berlin',
  'Europe/Helsinki', 'Europe/London', 'Europe/Paris', 'Europe/Stockholm',
  'America/Toronto', 'America/New_York', 'America/Los_Angeles',
]

export const countryPreferenceDefaults: Record<string, {
  currency: string
  timezone: string
  dateFormat: 'day-first' | 'month-first' | 'iso'
  weekStartsOn: 'monday' | 'sunday'
  destinations: string[]
}> = {
  Bangladesh: { currency: 'BDT', timezone: 'Asia/Dhaka', dateFormat: 'day-first', weekStartsOn: 'sunday', destinations: ['Germany', 'Finland', 'United Kingdom', 'Canada'] },
  India: { currency: 'INR', timezone: 'Asia/Kolkata', dateFormat: 'day-first', weekStartsOn: 'monday', destinations: ['Germany', 'United Kingdom', 'Canada', 'Australia'] },
  Malaysia: { currency: 'USD', timezone: 'Asia/Kuala_Lumpur', dateFormat: 'day-first', weekStartsOn: 'monday', destinations: ['Australia', 'United Kingdom', 'Singapore', 'Germany'] },
  'United Arab Emirates': { currency: 'AED', timezone: 'Asia/Dubai', dateFormat: 'day-first', weekStartsOn: 'monday', destinations: ['United Kingdom', 'Canada', 'Australia', 'Germany'] },
  'United Kingdom': { currency: 'GBP', timezone: 'Europe/London', dateFormat: 'day-first', weekStartsOn: 'monday', destinations: ['Germany', 'Netherlands', 'Ireland', 'Canada'] },
  'United States': { currency: 'USD', timezone: 'America/New_York', dateFormat: 'month-first', weekStartsOn: 'sunday', destinations: ['Canada', 'United Kingdom', 'Germany', 'Netherlands'] },
  Canada: { currency: 'CAD', timezone: 'America/Toronto', dateFormat: 'month-first', weekStartsOn: 'sunday', destinations: ['United States', 'United Kingdom', 'Germany', 'Australia'] },
  Australia: { currency: 'AUD', timezone: 'Australia/Sydney', dateFormat: 'day-first', weekStartsOn: 'monday', destinations: ['United Kingdom', 'Canada', 'Germany', 'New Zealand'] },
  Germany: { currency: 'EUR', timezone: 'Europe/Berlin', dateFormat: 'day-first', weekStartsOn: 'monday', destinations: ['Netherlands', 'Finland', 'Sweden', 'United Kingdom'] },
}
