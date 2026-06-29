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
    "Alien01_Happy.png", "Alien01_Sad.png", "Alien02_Happy.png", "Alien02_Sad.png",
    "Alien03_Happy.png", "Alien03_Sad.png", "Alien04_Happy.png", "Alien04_Sad.png",
    "Lock.png", "RocketButton.png", "MissionButton.png", "GemBookButton.png",
    "InventoryButton.png", "HistoryButton.png", "SpaceshipBackground.png",
]

def trim(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.split()[3].getbbox()  # bbox of non-transparent pixels
    return im.crop(bbox) if bbox else im

for name in TRIM:
    out = trim(Image.open(SRC / name))
    out.save(DST / name)
    print(f"{name}: {out.size}")

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
