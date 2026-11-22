import type { Result } from '../../learn/session'
import { withSide } from '../../learn/pool'

const KIND: Record<Result['kind'], string> = { type: 'Typed', choice: 'Chose', tap: 'Tapped' }

/** End of a Typing Test, Quiz or Weak Bones session: accuracy, speed, and every mistake with "Show me". */
export function Summary({ title, results, total, ms, timeUp, onShow, onAgain, onDone }: {
  title: string
  results: Result[]
  total: number
  ms: number
  timeUp: boolean
  onShow: (boneId: string) => void
  onAgain: () => void
  onDone: () => void
}) {
  const correct = results.filter((r) => r.verdict === 'correct').length
  const answered = results.length
  const acc = answered ? Math.round((correct / answered) * 100) : 0
  const avg = answered ? results.reduce((s, r) => s + r.ms, 0) / answered / 1000 : 0
  const perMin = ms > 0 ? (answered / (ms / 60000)).toFixed(1) : '0'
  const mistakes = results.filter((r) => r.verdict !== 'correct')
  return (
    <div className="summary" role="dialog" aria-label={`${title} results`}>
      <p className="eyebrow">{title}{timeUp ? ' · time up' : ''}</p>
      <h2>
        {correct} of {answered} correct{answered < total ? ` (${total - answered} not reached)` : ''}
      </h2>
      <div className="stats">
        <div>
          <span className="num">{acc}%</span>
          <span className="k">Accuracy</span>
        </div>
        <div>
          <span className="num">{avg.toFixed(1)} s</span>
          <span className="k">Per bone</span>
        </div>
        <div>
          <span className="num">{perMin}</span>
          <span className="k">Bones / min</span>
        </div>
      </div>
      {mistakes.length > 0 ? (
        <>
          <h3>To review</h3>
          <ul className="mistakes">
            {mistakes.map((r, k) => (
              <li key={k}>
                <div>
                  <strong>{withSide(r.bone)}</strong>
                  <span className="muted small">
                    {KIND[r.kind]}: {r.answer === '—' ? 'no answer' : r.answer}
                    {r.verdict === 'close' ? ' (spelling)' : ''}
                  </span>
                </div>
                <button className="link-btn" onClick={() => onShow(r.bone.id)}>
                  Show me
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        answered > 0 && <p className="muted">No mistakes. Well done.</p>
      )}
      <div className="modal-actions">
        <button className="btn ghost" onClick={onDone}>
          Done
        </button>
        <button className="btn primary" onClick={onAgain}>
          New session
        </button>
      </div>
    </div>
  )
}
