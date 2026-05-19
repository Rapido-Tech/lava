export const capWords = (v: string) => v.replace(/(^|\s)\S/g, (c) => c.toUpperCase())
export const capFirst = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v)
