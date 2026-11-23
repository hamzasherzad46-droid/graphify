import { useViewer } from '../state/store'
import { BONE_BY_ID } from '../data/bones'
import { groupMembers, labelDom, shortLabel, useLabelSet } from '../viewer/labelDom'

/**
 * The label and leader-line nodes. Their positions are written every frame by viewer/LabelLayout (straight to the
 * DOM, not through React), so they track the bones without lag. Tapping a bone's label selects and focuses it;
 * tapping a group label ("Phalanges of the hand (14)") flies to that group.
 */
export function LabelsOverlay() {
  const ids = useLabelSet((s) => s.ids)
  const groupIds = useLabelSet((s) => s.groupIds)
  if (!ids.length) return null
  const reg = (id: string, part: 'box' | 'line' | 'dot') => (el: Element | null) => {
    const cur = labelDom.get(id)
    if (el) labelDom.set(id, { ...(cur ?? ({} as never)), [part]: el })
    else if (cur) {
      const next = { ...cur, [part]: undefined }
      if (!next.box && !next.line && !next.dot) labelDom.delete(id)
      else labelDom.set(id, next as never)
    }
  }
  const all = [
    ...ids.map((id) => {
      const name = BONE_BY_ID.get(id)?.name ?? id
      return { id, text: shortLabel(id, name), full: name, group: null as string | null }
    }),
    // Group labels: text, count and members are set every frame by LabelLayout.
    ...groupIds.map((id) => ({ id, text: '', full: '', group: id })),
  ]
  return (
    <div className="labels">
      <svg className="leaders" aria-hidden>
        {all.map((l) => (
          <g key={l.id}>
            <polyline ref={reg(l.id, 'line')} />
            <circle ref={reg(l.id, 'dot')} r={l.group ? 3 : 2} cx={-100} cy={-100} />
          </g>
        ))}
      </svg>
      {all.map((l) => (
        <button
          key={l.id}
          ref={reg(l.id, 'box')}
          className={`label ${l.group ? 'group' : ''}`}
          aria-label={l.group ? undefined : l.full}
          title={l.group ? undefined : l.full}
          onClick={() => {
            if (!l.group) return useViewer.getState().select(l.id, { focus: true })
            const first = groupMembers.get(l.id)?.[0]
            if (first) useViewer.getState().frameCluster(first)
          }}
        >
          {l.group ? undefined : l.text}
        </button>
      ))}
    </div>
  )
}
