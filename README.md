# Heartfall: Third Person

A front-end only Three.js tactical bot shooter with:
- CS-style combat loop (angles, recoil, reload, bot pressure)
- Third-person by default (`V` toggles first person)
- High graphics post-processing pipeline (bloom + SSAO + HDR lighting)
- Mobile touch controls
- Xbox-style controller support via browser Gamepad API
- In-world symbolic broken-heart monument
- Watermark: `made by sakshyam upadhayay`

## Run

Because this uses ES modules, run with a static server (no backend required):

```powershell
# Option 1: Python
python -m http.server 8080

# Option 2: Node
npx serve .
```

Then open `http://localhost:8080`.

### Windows Quick Start

Double-click `start-game.bat` to launch the local server on `http://localhost:5500`.

## Controls

- `W A S D`: move
- `Shift`: sprint
- `Space`: jump
- `Mouse Left`: fire
- `R`: reload
- `V`: switch first/third person
- `Esc`: open menu

On touch devices, joysticks/buttons appear automatically (or force them from Settings).
