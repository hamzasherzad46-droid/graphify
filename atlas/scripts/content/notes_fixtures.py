# Test files for the Notes to Exam readers (src/learn/extract.test.ts): a short lecture as PowerPoint (slides, bullets,
# a table, speaker notes, a picture-only slide), the same as Word, and as a PDF with one text page and one scanned
# page. Hand-written test content; regenerate with: python3 scripts/content/notes_fixtures.py
import io, os
from pptx import Presentation
from pptx.util import Inches
from docx import Document
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'learn', 'fixtures')
os.makedirs(OUT, exist_ok=True)

def handwriting_png():
    img = Image.new('RGB', (900, 600), 'white')
    d = ImageDraw.Draw(img)
    d.text((40, 40), 'Scaphoid: most commonly fractured carpal bone', fill='black')
    buf = io.BytesIO(); img.save(buf, 'PNG'); return buf.getvalue()

# PowerPoint
prs = Presentation()
s = prs.slides.add_slide(prs.slide_layouts[0])
s.shapes.title.text = 'Lecture 3: the upper limb'
s.placeholders[1].text = 'Anatomy 101'
s = prs.slides.add_slide(prs.slide_layouts[1])
s.shapes.title.text = 'The scapula'
tf = s.placeholders[1].text_frame
tf.text = 'Flat, triangular bone'
p = tf.add_paragraph(); p.text = 'Glenoid cavity: socket for the humeral head'; p.level = 1
p = tf.add_paragraph(); p.text = 'Acromion meets the clavicle'
s.notes_slide.notes_text_frame.text = 'Remember: the scapula does not touch the ribs.\nMuscles lie on both sides.'
s = prs.slides.add_slide(prs.slide_layouts[5])
s.shapes.title.text = 'Carpal bones'
rows = s.shapes.add_table(3, 2, Inches(1), Inches(2), Inches(6), Inches(1.5)).table
for r, (a, b) in enumerate([('Row', 'Bones'), ('Proximal', 'Scaphoid, lunate, triquetrum, pisiform'), ('Distal', 'Trapezium, trapezoid, capitate, hamate')]):
    rows.cell(r, 0).text = a; rows.cell(r, 1).text = b
s = prs.slides.add_slide(prs.slide_layouts[6])
s.shapes.add_picture(io.BytesIO(handwriting_png()), Inches(1), Inches(1), width=Inches(6))
prs.save(os.path.join(OUT, 'lecture.pptx'))

# Word
doc = Document()
doc.add_heading('The scapula', 1)
doc.add_paragraph('A flat, triangular bone at the back of the shoulder.')
doc.add_paragraph('Glenoid cavity', style='List Bullet')
doc.add_paragraph('Acromion', style='List Bullet')
doc.add_heading('The carpal bones', 1)
t = doc.add_table(rows=2, cols=2)
t.cell(0, 0).text = 'Proximal'; t.cell(0, 1).text = 'Scaphoid, lunate'
t.cell(1, 0).text = 'Distal'; t.cell(1, 1).text = 'Trapezium, hamate'
doc.save(os.path.join(OUT, 'notes.docx'))

# PDF: page 1 has text; page 2 is an image only (a scan)
c = canvas.Canvas(os.path.join(OUT, 'handout.pdf'), pagesize=A4)
c.drawString(72, 760, 'The humerus: the bone of the upper arm.')
c.drawString(72, 740, 'Surgical neck: a common fracture site.')
c.showPage()
from reportlab.lib.utils import ImageReader
c.drawImage(ImageReader(io.BytesIO(handwriting_png())), 72, 400, width=450, height=300)
c.showPage()
c.save()
print('fixtures written')
