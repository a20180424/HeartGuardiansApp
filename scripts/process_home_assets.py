"""One-time: trim transparent margins from mytemp/home PNGs and split PlateSet
into 4 plates, writing results to src/assets/home/. Re-runnable (idempotent)."""
from pathlib import Path
from PIL import Image

SRC = Path("mytemp/home")
DST = Path("src/assets/home")
DST.mkdir(parents=True, exist_ok=True)

# Files copied with an alpha-bbox trim (transparent margins removed).
TRIM = [
    "PlayerButton.png", "AvatarFace.png", "BannerPlate03.png", "PurposeStart.png",
    "HeartScorePlate.png", "HeartFull.png", "HeartEmpty.png", "HeartConnect.png",
    "Lock.png", "RocketButton.png", "MissionButton.png", "GemBookButton.png",
    "InventoryButton.png", "HistoryButton.png", "SpaceshipBackground.png",
]

# Planet sprites are a SET drawn on one shared canvas so their relative scale
# (and the baked-in name labels) match. Trimming each to its own bbox breaks
# that — under object-fit:contain a tighter sprite scales up larger, so e.g.
# the fog planet rendered noticeably bigger. Instead crop all 8 to one common
# canvas: their shared (union) non-transparent bbox. This gives every sprite an
# identical intrinsic size (relative scale/position preserved, alpha kept) while
# removing the wide shared dead margin — so the characters and baked-in labels
# fill the box instead of shrinking inside it. (The looser alternative, padding
# to the full source size, keeps so much margin that the labels render too
# small.)
ALIENS = [
    f"Alien{i:02d}_{s}.png" for i in (1, 2, 3, 4) for s in ("Happy", "Sad")
]

def trim(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.split()[3].getbbox()  # bbox of non-transparent pixels
    return im.crop(bbox) if bbox else im

for name in TRIM:
    out = trim(Image.open(SRC / name))
    out.save(DST / name)
    print(f"{name}: {out.size}")

alien_imgs = {n: Image.open(SRC / n).convert("RGBA") for n in ALIENS}
alien_boxes = [im.split()[3].getbbox() for im in alien_imgs.values()]
union = (
    min(b[0] for b in alien_boxes), min(b[1] for b in alien_boxes),
    max(b[2] for b in alien_boxes), max(b[3] for b in alien_boxes),
)
for name, im in alien_imgs.items():
    out = im.crop(union)  # same crop rect for all 8 → uniform, alpha preserved
    out.save(DST / name)
    print(f"{name}: {out.size} (union crop {union})")

# PlateSet.png = 4 plates left→right (green, blue, purple, brown). Split into
# equal quarters, then alpha-trim each quarter to its plate.
plate = Image.open(SRC / "PlateSet.png").convert("RGBA")
w, h = plate.size
out_names = ["plateMission.png", "plateGem.png", "plateInventory.png", "plateHistory.png"]
for i, n in enumerate(out_names):
    col = plate.crop((i * w // 4, 0, (i + 1) * w // 4, h))
    bbox = col.split()[3].getbbox()
    col = col.crop(bbox) if bbox else col
    col.save(DST / n)
    print(f"{n}: {col.size}")
