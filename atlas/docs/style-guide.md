# Atlas style guide

One standard for every lesson, card, question, note, button and menu. The text check (`npm run check:text`) enforces
every rule marked **(checked)**, before every build and in the tests; `docs/text-report.md` shows the latest result.

## Spelling

- **British English, -ise spellings** (organise, recognise, haemorrhage, oesophagus, anaesthetic, oedema, paediatric,
  ischaemia, fibre, centre, colour). **(checked)**
- **Agreed medical spellings** **(checked)**:
  - **fetus**, **fetal**: never foetus, foetal.
  - **specialty**, **specialties**: never speciality (NHS usage).
  - **sulfur**, **sulfate**, **sulfide**, **sulfuric**: never sulphur, sulphate (BNF and IUPAC usage).
  - **grey** (grey matter): never gray. “Gray” is only the name (Henry Gray, Gray’s Anatomy).
  - **disc** (intervertebral disc, optic disc): never disk.
- **Restricted words** **(checked)**:
  - **pptx**, **docx**, **PDFs**: internal use only. Students see “PowerPoint”, “Word” and “PDF” (“PDF files”), or
    “.pptx” and “.docx” for the file type.
  - **acromiale**: only in the full term “os acromiale”; flagged anywhere else.
- **One form per word** (brainstem, anteroposterior, rib cage, non-steroidal, adrenaline): the full list is `forms`
  in `data/dictionary.json`. **(checked)**
- **Approved words**: a word is approved when it is in the en-GB dictionary, Terminologia Anatomica, the OpenStax A&P 2e
  glossary, MeSH (in its British form) or the NHS A–Z, or is formed regularly from such a word (a standard prefix or
  suffix). Anything else needs approval and is listed in the report. **(checked)**

## Names of structures

- **One name per structure**, as the bone database writes it (`content/bones`, `content/landmarks.json`), never retyped
  in another form. **(checked)**
- **Sentence case** in all Atlas-written text: “the first thoracic vertebra”, “the greater trochanter”; a capital only
  to start a sentence. Titles keep their own capitals when cited (“8.1 The Pectoral Girdle”). **(checked)**
- Terminologia Anatomica English terms; older names only as alternatives (the Spelling Quiz accepts them but always
  shows the official name).

- **Proper names keep their owners’ spelling**, never made British: “U.S. Department of Defense”, “Centers for
  Disease Control and Prevention”, “World Health Organization”, “Database Center for Life Science”. The importers hold
  every listed name (`names` in `data/dictionary.json`) out of the spelling conversion. **(checked)**: a listed name
  in British spelling fails the check, and any other organisation name written with a British spelling is listed
  for review.

## Abbreviations

- **Written out in full the first time they appear in each lesson**: “the central nervous system (CNS)”, then “CNS”.
  A lesson is a textbook section, an exam question, a flashcard or a bone’s information. **(checked)**
- Full forms come from OpenStax A&P 2e’s own definitions, or the Atlas list (`data/abbreviations.json`).
- Read as written, without a full form: units (mmHg, mV, mL, kHz), pH, DNA, RNA, Roman numerals.

## Writing

- Plain English first, the technical term second. One idea per sentence; active voice where it reads more clearly
  (“the obturator membrane closes the obturator foramen”).
- No serial (Oxford) comma: “the hip, knee and ankle”.
- Curly quotation marks and apostrophes (‘ ’ “ ”).

## Quoted sources

- **OpenStax A&P 2e** is used under CC BY 4.0. Atlas applies this guide’s spelling, one form per word, written-out
  abbreviations and corrections of typing errors, and lists these changes at the end of every section. Otherwise, the
  text is as published.
- **Gray’s Anatomy (1918)** is a secondary, historical source, quoted as published: its own capitals, grammar and
  terms (os innominatum, lateralward). Atlas changes only spelling (æ written ae, American spellings made British) and
  clear transcription errors, and replaces one discredited table with a note.
