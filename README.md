# partyservice_website

To optimize storage, compress photos to lower resolution:

  python optimize_images.py Bilder/
  python optimize_images.py Bilder/ --dry-run
  python optimize_images.py Bilder/ --output Bilder_web/

 # Auto-detects preset from parent folder name
  python optimize_images.py Bilder/menues/fleisch/DSC_0002.jpg

  # Force a specific preset
  python optimize_images.py myphoto.jpg --preset hero

  # Choose output location
  python optimize_images.py myphoto.jpg --output Bilder_web/menues/fleisch/myphoto.webp

  # Dry run first
  python optimize_images.py myphoto.jpg --dry-run