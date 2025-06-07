# Førerkort PWA

A small prototype of a digital Norwegian driver's licence built as a progressive web app. The project demonstrates PIN-based access, hologram animations using device orientation and offline support via a service worker that caches core assets. It is intended for demonstration and learning purposes only.

## Running the app locally

1. Clone or download this repository.
2. From the project folder, start a simple web server (the service worker requires running over HTTP):

   ```bash
   # Example using Python
   python3 -m http.server 8000
   ```
   or
   ```bash
   # Example using Node
   npx serve .
   ```
3. Open your browser at `http://localhost:8000` to use the app. You can then add it to your home screen to run it in standalone mode.

## Adding your own images

Image assets are not included in the repository. Place the required files in the `Elements` directory before running the app:

```
Elements/
  License/       # contains "Ditt Førerkort.png", "A1.png", "AM.png", "B.png",
                 # "Koder.png", "Kontroll.png", "RotSq.png" and "pil.png"
  Main/          # contains "statens logo.png" and "RotSq.png"
  Profile/       # contains "profil logo.png"
  ScanQR/        # contains "Skann QR-kode.png"
```

These images will be loaded automatically by the HTML and CSS once added.
