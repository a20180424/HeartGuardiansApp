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

# Planet sprites: trim each to its content, then center every one on a single
# common transparent canvas sized to the largest trimmed sprite. This gives all
# 8 the same intrinsic size (and aspect ratio) so object-fit:contain scales them
# identically and centers them consistently, instead of one sprite filling the
# box while another letterboxes.
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

trimmed = {n: trim(Image.open(SRC / n)) for n in ALIENS}
canvas_w = max(im.width for im in trimmed.values())
canvas_h = max(im.height for im in trimmed.values())
for name, im in trimmed.items():
    out = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))  # transparent
    x = (canvas_w - im.width) // 2
    y = (canvas_h - im.height) // 2
    out.paste(im, (x, y), im)  # centered, own alpha as mask
    out.save(DST / name)
    print(f"{name}: {out.size} (centered on {canvas_w}x{canvas_h})")

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
