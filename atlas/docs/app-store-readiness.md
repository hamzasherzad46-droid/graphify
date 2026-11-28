# Atlas: App Store readiness

What Apple's review will look at, what Atlas already does, and what is still to do. Checked against the App Review
Guidelines as published by Apple; this is a working checklist, not legal advice.

## Must fix before submitting

| # | Item | Status |
|---|---|---|
| 1 | **"Beta" in the app.** Guideline 2.2: demos, betas and trial versions belong on TestFlight, not the App Store. The 3D header shows a "Beta" badge and the first-run disclaimer says "This is a beta". | **To decide.** Recommended: remove the badge and the word "beta" in the App Store build; keep "Bone content is under academic review" and each bone's draft/reviewed label, which are about content, not the app. |
| 2 | **Privacy policy.** Required in the app and as a public web address in App Store Connect (Guideline 5.1.1). | In the app: done (You → About → Privacy policy). Still needed: the same text at a public web address. |
| 3 | **Notes to Exam must work for the reviewer.** A feature that fails in review is a rejection (2.1). | The question service has to be online over HTTPS, with `capacitor://localhost` allowed (already in its default origins), and the build made with `VITE_NOTES_API_URL`. Otherwise, ship with Notes to Exam marked unavailable. |
| 4 | **iOS project and permission strings.** | `npx cap add ios` on a Mac with Xcode. Info.plist: `NSCameraUsageDescription` = "Atlas uses the camera to photograph your notes for Notes to Exam." and `NSPhotoLibraryUsageDescription` = "Atlas opens the photos you choose so it can read your notes." Notifications are asked for when the student turns reminders on. |

## Already in place

- **No accounts**, so no sign-in or account-deletion requirements (5.1.1(v)).
- **No advertising, analytics or tracking**: no App Tracking Transparency prompt needed.
- **Third-party AI (5.1.2):** before anything is sent, a sheet says what is sent, to whom (the Atlas question service, using Claude by Anthropic), what is kept, and asks for agreement; it also asks students not to include patient or personal details.
- **Medical content (1.4.1):** Atlas teaches anatomy and does not diagnose or treat. The first-run disclaimer says it is not medical advice; AI-written questions are labelled and say they are not reviewed by an academic.
- **Native features beyond a website (4.2):** offline use, local study reminders, the camera.
- **Credits** for every 3D and text source (You → About → Credits and attribution).

## Nudity in the 3D models (from the 3D upgrade)

Anatomical nudity in an educational app is accepted; sexualised content is not (1.1.4). The models are clinical:
neutral anatomical pose, no body hair, a smooth simplified genital area.

- **Modesty** (settings, step 5 of the 3D upgrade): hides external reproductive anatomy. Recommended: **on by
  default** in the App Store build.
- **Age rating:** answer Apple's questionnaire truthfully. Medical or treatment information: frequent. The female
  model shows breasts (anatomical, non-sexual), so answer the nudity question for that. The rating Apple assigns
  follows from the answers.

## Licences of the 3D models

The models are CC BY-SA 4.0 (Z-Anatomy, BodyParts3D) with CC BY 4.0 (HuBMAP) and CC0 (MakeHuman) parts. Credit is
given in the app. CC BY-SA asks that the adapted models are shared under the same licence: keep the model files
(`public/models`) available, with their licence, outside the app (for example in a public repository)
so anyone receiving the app can also get them.

## App Store Connect

- Support web address and contact (the privacy policy points students to the support link).
- Screenshots for iPhone (6.7" and 6.5") and, if iPad is supported, iPad.
- App Privacy answers: if Notes to Exam is included, declare **User Content (photos, other user content)**, not
  linked to the user, not used for tracking, used for **App Functionality**. Everything else: not collected.
- The app name "Atlas" may already be taken on the App Store; have an alternative ready (e.g. "Atlas Anatomy").
