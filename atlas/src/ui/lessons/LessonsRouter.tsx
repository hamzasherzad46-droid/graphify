import type { Page } from '../../state/nav'
import { LessonsScreen } from './LessonsScreen'
import { TopicsScreen } from './TopicsScreen'
import { TopicScreen } from './TopicScreen'
import { ReaderScreen } from './ReaderScreen'
import { MyAnnotations } from './MyAnnotations'

/** The page on top of Home's stack. Keyed so each page starts at the top. */
export function LessonsRouter({ page, depth }: { page: Page; depth: number }) {
  const key = `${depth}:${JSON.stringify(page)}`
  switch (page.kind) {
    case 'lessons':
      return <LessonsScreen key={key} />
    case 'topics':
      return <TopicsScreen key={key} area={page.area} />
    case 'topic':
      return <TopicScreen key={key} area={page.area} topic={page.topic} anchor={page.anchor} />
    case 'reader':
      return <ReaderScreen key={key} id={page.section} anchor={page.anchor} />
    case 'mine':
      return <MyAnnotations key={key} what={page.what} />
    default:
      return null
  }
}
