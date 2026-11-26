"""Shared helpers for the layered models: aligning Z-Anatomy exports to the skeleton, naming, sides."""
import re
import numpy as np
import fit


def za_offset(zaskel_prefix, glb_prefix):
    """The constant shift between a Z-Anatomy export and the Atlas skeleton GLB, measured on matched bones
    (bounding boxes, which simplification does not move)."""
    Z, G = fit.load_bones(zaskel_prefix), fit.load_bones(glb_prefix)
    pairs = [('Femurl', 'femur_left'), ('Femurr', 'femur_right'), ('Frontal_bone', 'frontal_bone'), ('Sacrum', 'sacrum'),
             ('Mandible', 'mandible'), ('Patellal', 'patella_left'), ('Patellar', 'patella_right'), ('Humerusl', 'humerus_left'), ('Humerusr', 'humerus_right')]
    d = [(Z[a][0].min(0) + Z[a][0].max(0)) / 2 - (G[b][0].min(0) + G[b][0].max(0)) / 2 for a, b in pairs if a in Z]
    d = np.median(np.array(d), axis=0)
    spread = np.max(np.abs(np.array([(Z[a][0].min(0) + Z[a][0].max(0)) / 2 - (G[b][0].min(0) + G[b][0].max(0)) / 2 for a, b in pairs if a in Z]) - d))
    assert spread < 0.0015, f'Z-Anatomy and the skeleton disagree by {spread * 1000:.1f} mm on some bone'
    return -d


def side_of(name):
    """Z-Anatomy marks sides with a trailing l / r (after the name, e.g. Deltoid_musclel)."""
    if re.search(r'[a-z)]l\+*$', name):
        return 'left'
    if re.search(r'[a-z)]r\+*$', name):
        return 'right'
    return 'midline'


def atlas_id(name):
    """Deltoid_musclel → deltoid_muscle_left: lower case, words joined by _, side last."""
    side = side_of(name)
    base = name.rstrip('+')
    if side != 'midline':
        base = base[:-1]
    base = re.sub(r'[^a-z0-9]+', '_', base.lower()).strip('_')
    return base if side == 'midline' else f'{base}_{side}'


def kind_of(name):
    n = name.lower()
    if 'bursa' in n:
        return 'bursa'
    if 'ligament' in n or 'tarsus' in n:  # the eyelids' tarsal plates are connective tissue, not muscle
        return 'ligament'
    if 'fibrous_sheath' in n:
        return 'ligament'  # the fibrous sheaths of the fingers hold the flexor tendons down: shown, like the retinacula
    if 'tendon_sheath' in n or 'tendon sheath' in n:
        return 'sheath'
    if 'tendon' in n:
        return 'tendon'
    if n.startswith(('palmar_aponeurosis', 'plantar_aponeurosis')):
        return 'fascia'  # thickenings of the deep fascia of the palm and sole (shown with the fascia layer)
    if 'aponeuros' in n or 'linea_alba' in n:  # the linea alba is the aponeuroses meeting in the midline
        return 'aponeurosis'
    if 'retinacul' in n:
        return 'ligament'  # retinacula are bands that hold tendons down at the wrist and ankle, not sleeves: shown
    if any(k in n for k in ('fascia', 'septum', 'tract', 'linea_alba', 'sheath')) and 'tensor_fasciae' not in n:
        return 'fascia'
    return 'muscle'


# Muscles that standard anatomy places in a deep (or intermediate) layer, whatever reaches the skin at their ends.
DEEP = (
    # upper limb
    'brachialis', 'coracobrachialis', 'supinator', 'pronator_quadratus', 'deep_head_of_pronator_teres', 'flexor_digitorum_superficialis',
    'flexor_digitorum_profundus', 'flexor_pollicis_longus', 'abductor_pollicis_longus', 'extensor_pollicis', 'extensor_indicis',
    'subscapularis', 'supraspinatus', 'pectoralis_minor', 'subclavius',
    # hand and foot (intrinsic, deep layers)
    'interosse', 'lumbrical', 'adductor_pollicis', 'opponens', 'quadratus_plantae', 'adductor_hallucis', 'flexor_hallucis_brevis',
    'flexor_digiti_minimi_brevis_of_foot', 'deep_head_of_flexor_pollicis_brevis',
    # trunk and back
    'internal_oblique', 'internal_abdominal_oblique', 'transversus_abdominis', 'short_head_of_biceps_femoris', 'intercostal', 'subcostal', 'transversus_thoracis', 'diaphragm', 'quadratus_lumborum',
    'psoas', 'iliacus', 'iliocostalis', 'longissimus', 'spinalis', 'multifidus', 'rotatores', 'semispinalis', 'interspinales',
    'intertransversari', 'levatores_costarum', 'serratus_posterior', 'rhomboid', 'splenius', 'pyramidalis', 'cremaster',
    # neck and head (deep)
    'scalen', 'longus_colli', 'longus_capitis', 'rectus_capitis', 'obliquus_capitis', 'pterygoid', 'tensor_veli', 'levator_veli',
    'constrictor', 'glossus', 'arytenoid', 'crico', 'thyro-arytenoid', 'vocalis', 'stylopharyngeus', 'salpingopharyngeus',
    'palatopharyngeus', 'palatoglossus', 'musculus_uvulae', 'stapedius', 'tensor_tympani', 'rectus_muscle', 'oblique_muscle_of_eye',
    'superior_oblique', 'inferior_oblique', 'levator_palpebrae', 'tarsal', 'mylohyoid', 'geniohyoid', 'deep_part_of_masseter', 'bucinator',
    'posterior_belly_of_digastric',
    # lower limb
    'gluteus_medius', 'gluteus_minimus', 'piriformis', 'gemell', 'obturator', 'quadratus_femoris', 'vastus_intermedius',
    'articularis_genus', 'adductor_brevis', 'adductor_magnus', 'adductor_minimus', 'popliteus', 'tibialis_posterior',
    'flexor_digitorum_longus', 'flexor_hallucis_longus', 'plantaris',
    # pelvis
    'levator_ani', 'coccygeus', 'puborectalis', 'pubococcygeus', 'iliococcygeus', 'transverse_perineal', 'bulbospongiosus',
    'ischiocavernosus', 'sphincter', 'perine',
)


# Muscles that standard anatomy places in the superficial layer (always superficial, however few skin checks reach them).
SUPERFICIAL = (
    'pectoralis_major', 'deltoid', 'trapezius', 'latissimus_dorsi', 'teres_major', 'external_abdominal_oblique', 'rectus_abdominis',
    'serratus_anterior', 'sternocleidomastoid', 'platysma', 'sternohyoid', 'omohyoid', 'masseter', 'temporalis', 'biceps_brachii',
    'triceps_brachii', 'brachioradialis', 'flexor_carpi', 'palmaris_longus', 'extensor_carpi', 'extensor_digitorum', 'extensor_digiti_minimi',
    'superficial_head_of_pronator_teres', 'abductor_pollicis_brevis', 'superficial_head_of_flexor_pollicis_brevis', 'abductor_digiti_minimi',
    'gluteus_maximus', 'tensor_fasciae_latae', 'sartorius', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'gracilis',
    'adductor_longus', 'long_head_of_biceps_femoris', 'semitendinosus', 'gastrocnemius', 'soleus', 'tibialis_anterior',
    'fibularis_longus', 'fibularis_brevis', 'extensor_digitorum_longus', 'extensor_digitorum_brevis', 'abductor_hallucis', 'flexor_digitorum_brevis',
)


def layer_of(name, hits, min_hits=5):
    """superficial | deep for muscles (seen from the skin, unless anatomy puts it deep); connective for the rest."""
    kind = kind_of(name)
    if kind != 'muscle':
        return 'connective'
    n = name.lower()
    if any(k in n for k in SUPERFICIAL) and not n.startswith(('deep_', 'short_head_of_biceps_femoris')):
        return 'superficial'
    if any(k in n for k in DEEP):
        return 'deep'
    return 'superficial' if hits >= min_hits else 'deep'
