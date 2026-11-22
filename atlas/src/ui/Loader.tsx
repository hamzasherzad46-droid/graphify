/** HUD-style loading readout, shown until the skeleton is in the scene. Kept free of three.js so it paints first. */
export function Loader({ done }: { done: boolean }) {
  return (
    <div className={`loader ${done ? 'done' : ''}`} aria-hidden={done}>
      <div className="loader-box" role="status">
        <span className="loader-title">Loading skeleton</span>
        <span className="loader-num">206 bones</span>
        <div className="loader-bar">
          <span />
        </div>
      </div>
    </div>
  )
}
