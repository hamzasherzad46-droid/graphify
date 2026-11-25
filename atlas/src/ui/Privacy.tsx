import { CloseIcon } from './Icons'
import { Portal } from './Portal'

/**
 * Privacy policy, as shown in the app (You → About). Keep it in step with what the app actually does: it is also the
 * policy linked from the App Store listing.
 */
export function Privacy({ onBack }: { onBack: () => void }) {
  return (
    <Portal>
      <div className="modal-backdrop" onClick={onBack}>
        <aside className="sheet credits privacy" role="dialog" aria-modal aria-label="Privacy policy" onClick={(e) => e.stopPropagation()}>
          <header className="sheet-head">
            <h2>Privacy policy</h2>
            <button className="icon-btn" aria-label="Close" onClick={onBack}>
              <CloseIcon />
            </button>
          </header>

          <section>
            <h3>In short</h3>
            <p>
              Atlas has no accounts, no advertising, no analytics and no tracking. What you do in Atlas is saved on your device. The only time
              anything leaves your device is when you use Notes to Exam, and only after you have agreed to it.
            </p>
          </section>

          <section>
            <h3>Saved on your device only</h3>
            <p>
              Your name and course (if you give them), settings, study progress, flashcard schedules, highlights, notes, the text of files you add to
              Notes to Exam, and your question sets. They stay in the app’s storage on this device. You can remove them in the app (Reset progress in
              You clears progress and flashcard schedules; sets, files, highlights and notes can each be deleted), and deleting the app removes
              everything.
            </p>
          </section>

          <section>
            <h3>Notes to Exam</h3>
            <p>
              When you choose to, Atlas sends the Atlas question service: photos or scanned pages you add (to be read), the text of the topics you
              choose (to write questions or flashcards), and short answers you ask to be marked. The service uses Claude, an AI model by Anthropic,
              to do this. PDF files, slides and Word files are read on your device; only their text, for the topics you choose, is sent.
            </p>
            <p>
              The Atlas question service does not store what you send or what it writes back. Anthropic processes it to produce the answer, under
              its commercial terms and privacy policy (anthropic.com/legal/privacy). Do not include patient or other people’s personal details in
              your notes.
            </p>
            <p>
              Each request carries a random code made by the app on your device, used only to limit how many requests one device can make in an
              hour. It is not linked to your name or to anything else about you.
            </p>
          </section>

          <section>
            <h3>Camera, files and reminders</h3>
            <p>
              The camera is used only when you photograph notes in Notes to Exam; photos are not stored once they have been read. Files are opened
              only when you pick them. Study reminders, if you turn them on, are scheduled by your device; nothing is sent to set them.
            </p>
          </section>

          <section>
            <h3>Questions</h3>
            <p>Contact the developer through the support link on Atlas’s App Store page.</p>
          </section>
        </aside>
      </div>
    </Portal>
  )
}
