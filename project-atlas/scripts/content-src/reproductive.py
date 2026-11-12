"""Reproductive system (male; BodyParts3D 4.0 has no female reproductive organs)."""
MODEL = 'reproductive.glb'
REGIONS = [('male', 'Male reproductive organs')]

def S(id, name, latin, region, mesh, difficulty, view, definition, function, why, notes, synonyms=()):
    return dict(id=id, name=name, latin=latin, region=region, mesh=mesh, difficulty=difficulty, view=view,
                definition=definition, function=function, why=why, notes=notes, synonyms=list(synonyms))

M = 'male'
STRUCTURES = [
  S('testis', 'testis', 'testis', M, 'testis', 1, 'fc',
    'Oval gland in the scrotum, one on each side.',
    'Produces sperm and testosterone.',
    'It sits outside the body because sperm production needs a temperature about 2–3 °C below body temperature.',
    {'nursing': 'Sudden severe scrotal pain is testicular torsion until proven otherwise: surgery within 6 hours saves it.',
     'medicine': 'Drains to the para-aortic lymph nodes because it develops near the kidneys and descends.'},
    ['testes', 'testicle']),
  S('epididymis', 'epididymis', 'epididymis', M, 'epididymis', 2, 'fr',
    'Coiled tube on the back of each testis.',
    'Stores sperm and lets it mature and gain the ability to swim.',
    'Sperm leaving the testis can’t yet swim; maturing here takes about two weeks.',
    {'medicine': 'Epididymitis causes pain that eases when the testis is lifted, unlike torsion.'}),
  S('vas-deferens', 'vas deferens', 'ductus deferens', M, 'deferent_duct', 2, 'fr',
    'Muscular tube carrying sperm from the epididymis up through the inguinal canal into the pelvis.',
    'Moves sperm toward the urethra during ejaculation.',
    'Its thick muscular wall propels sperm quickly when needed.',
    {'medicine': 'Cut and tied in a vasectomy.'},
    ['ductus deferens', 'deferent duct', 'vas']),
  S('seminal-vesicle', 'seminal vesicle', 'glandula vesiculosa', M, 'seminal_vesicle', 3, 'bc',
    'Coiled gland behind the bladder, one on each side.',
    'Produces most of the seminal fluid, rich in fructose.',
    'The fluid gives sperm energy and volume to travel.',
    {'medicine': 'Its duct joins the vas deferens to form the ejaculatory duct.'},
    ['seminal vesicles', 'seminal gland']),
  S('prostate', 'prostate', 'prostata', M, 'prostate', 1, 'fc',
    'Walnut-sized gland below the bladder, surrounding the first part of the urethra.',
    'Adds an alkaline fluid to semen.',
    'The fluid protects sperm from vaginal acidity.',
    {'nursing': 'An enlarged gland causes poor stream, frequency and retention; a catheter may be needed.',
     'medicine': 'Felt on rectal examination; cancer usually starts in the peripheral zone.'},
    ['prostate gland']),
  S('corpus-cavernosum', 'corpus cavernosum', 'corpus cavernosum penis', M, 'corpus_cavernosum_of_penis', 3, 'fc',
    'Paired column of spongy erectile tissue along the upper part of the penis.',
    'Fills with blood to produce an erection.',
    'Trapping blood under pressure makes the organ rigid.',
    {'medicine': 'Priapism (erection lasting over 4 hours) is a urological emergency.'},
    ['corpora cavernosa']),
  S('corpus-spongiosum', 'corpus spongiosum', 'corpus spongiosum penis', M, ['corpus_spongiosum_of_penis', 'glans_penis'], 3, 'fc',
    'Single column of erectile tissue on the underside of the penis, surrounding the urethra and expanding into the glans.',
    'Keeps the urethra open during erection.',
    'Softer than the paired columns, it doesn’t squeeze the urethra closed.',
    {'nursing': 'During male catheterisation, hold the shaft upright to straighten the urethra through it.'}),
]
