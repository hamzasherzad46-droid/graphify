/**
 * Page photos for Notes to Exam: scaled so the longest side is at most `max` pixels (sharp enough for handwriting,
 * small enough to send quickly) and re-encoded as JPEG. Re-encoding also drops the photo's metadata (location, camera).
 */
export const PAGE_MAX = 2000

export interface PagePhoto {
  /** Base64 JPEG, without the data: prefix. */
  data: string
  /** An object URL for the thumbnail; revoke when the page is removed. */
  url: string
  width: number
  height: number
}

function draw(source: CanvasImageSource, w: number, h: number, max: number): HTMLCanvasElement {
  const k = Math.min(1, max / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * k)
  c.height = Math.round(h * k)
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(source, 0, 0, c.width, c.height)
  return c
}

async function encode(c: HTMLCanvasElement): Promise<PagePhoto> {
  const blob = await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.86))
  return { data: await toBase64(blob), url: URL.createObjectURL(blob), width: c.width, height: c.height }
}

/** A photo file (any format the browser can open), turned upright from its EXIF orientation. */
export async function photoFromFile(file: Blob, max = PAGE_MAX): Promise<PagePhoto> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    return await encode(draw(bmp, bmp.width, bmp.height, max))
  } finally {
    bmp.close()
  }
}

/** The current frame of the live camera. */
export function photoFromVideo(video: HTMLVideoElement, max = PAGE_MAX): Promise<PagePhoto> {
  return encode(draw(video, video.videoWidth, video.videoHeight, max))
}

export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
