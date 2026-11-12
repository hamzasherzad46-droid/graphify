/** URL of a file in /public, relative to the app's base (\"/\" normally, \"./\" in the artifact build). */
export function publicUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
