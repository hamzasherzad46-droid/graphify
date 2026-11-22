import { useMemo, useRef, useState } from 'react'
import { BONES, SIDE_SHORT } from '../data/bones'
import { createSearch } from '../data/search'
import { useViewer } from '../state/store'
import { CloseIcon, SearchIcon } from './Icons'

const search = createSearch(BONES)

export function SearchBar() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const hits = useMemo(() => (q.trim() ? search(q, 8) : []), [q])

  const choose = (id: string) => {
    useViewer.getState().select(id, { focus: true })
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className={`search ${open && hits.length ? 'open' : ''}`}>
      <SearchIcon className="search-icon" />
      <input
        ref={input}
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search 206 bones"
        aria-label="Search bones"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, hits.length - 1))
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
          else if (e.key === 'Enter' && hits[active]) choose(hits[active].bone.id)
          else if (e.key === 'Escape') input.current?.blur()
        }}
      />
      {q && (
        <button className="search-clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ('')}>
          <CloseIcon width={14} height={14} />
        </button>
      )}
      {open && q.trim() && (
        <ul className="search-results" role="listbox">
          {hits.length === 0 && <li className="empty">No bone matches “{q}”</li>}
          {hits.map((h, i) => (
            <li
              key={h.bone.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(h.bone.id)}
            >
              <span className="r-name">{h.bone.name}</span>
              {h.bone.side !== 'midline' && <span className="r-side">{SIDE_SHORT[h.bone.side]}</span>}
              <span className="r-region">{h.bone.region}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
