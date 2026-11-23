import topicsJson from '../../content/topics.json'

export interface Topic {
  id: string
  title: string
  blurb: string
  regions: string[]
  /** Only in the textbook (no exam questions by region). */
  textbookOnly?: boolean
}
export const TOPICS: Topic[] = topicsJson.topics
export const topicById = (id: string) => TOPICS.find((t) => t.id === id)
