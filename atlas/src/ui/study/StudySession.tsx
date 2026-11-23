import { useEffect, useState } from 'react'
import { usePrefs, useViewer } from '../../state/store'
import { MODE_INFO, useSession, type Item, type Mode, type Result } from '../../learn/session'
import { buildItems } from '../../learn/items'
import { useNav } from '../../state/nav'
import { useProgress } from '../../state/progress'
import { QuestionRunner } from './QuestionRunner'
import { FlashcardSession } from './FlashcardSession'
import { Summary } from './Summary'

/** A running study session: owns the 3D view until it ends. */
export function StudySession({ mode }: { mode: Mode }) {
  const settings = usePrefs((s) => s.study)
  const [run, setRun] = useState(0)
  const [items, setItems] = useState<Item[]>(() => (mode === 'flashcards' ? [] : buildItems(mode, settings.area, settings.count)))
  const [result, setResult] = useState<{ results: Result[]; ms: number; timeUp: boolean } | null>(null)

  useEffect(() => {
    const v = useViewer.getState()
    v.startStudy()
    v.setSex(settings.sex)
    return () => useViewer.getState().endStudy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => useSession.getState().close()
  const show = (id: string) => {
    close()
    useNav.getState().go('3d')
    // After the session's own clean-up (endStudy), select and fly to the bone.
    window.setTimeout(() => useViewer.getState().select(id, { focus: true }), 0)
  }

  if (mode === 'flashcards') return <FlashcardSession onClose={close} onShow={show} />

  if (result)
    return (
      <Summary
        title={MODE_INFO[mode].title}
        results={result.results}
        total={items.length}
        ms={result.ms}
        timeUp={result.timeUp}
        onShow={show}
        onDone={close}
        onAgain={() => {
          setItems(buildItems(mode, settings.area, settings.count))
          setResult(null)
          setRun((r) => r + 1)
        }}
      />
    )

  return (
    <QuestionRunner
      key={run}
      title={MODE_INFO[mode].title}
      items={items}
      timeLimit={mode === 'typing' ? settings.timeLimit : 0}
      perQuestion={mode === 'typing' ? 0 : settings.perQuestion}
      onDone={(results, info) => {
        useViewer.getState().setHighlight(null, false)
        if (results.length)
          useProgress.getState().addSession({
            mode,
            area: settings.area,
            answered: results.length,
            correct: results.filter((r) => r.verdict === 'correct').length,
            ms: info.ms,
            at: new Date().toISOString(),
          })
        setResult({ results, ...info })
      }}
      onClose={close}
    />
  )
}
