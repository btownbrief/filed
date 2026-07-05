# FILED!

**Burlington's tallest game.**

An arcade reflex game set at Burlington, Vermont's beloved landmark, the
**World's Tallest Filing Cabinet**. You are a city bureaucrat with a giant
rubber stamp and an infinite backlog. Process files as fast as you can and
do not get flattened by an open drawer.

- **Tap left / tap right** — stamp and clear the bottom cabinet section from that side
- Every cleared section drops the whole tower by one level
- **Open drawers** slide down with the tower — if one reaches the bottom on
  your side, you're buried in paperwork
- The **urgency meter** drains constantly; every processed file buys you time
- The pace ramps until it's you, the stamp, and the void

Two playable bureaucrats: **Dot** (Deputy Zoning Administrator, heels, spite)
and **Gil** (Permit Compliance Officer, comb-over, has never missed a meeting).
The South End backdrop follows the real Vermont seasons.

## Play locally

It's a fully static site — no build step, no dependencies.

```bash
cd FILED
python3 -m http.server 8000
# open http://localhost:8000
```

(Any static server works. Opening `index.html` directly via `file://` won't work
because the game uses ES modules.)

### Controls

| Input | Action |
| --- | --- |
| Tap / click left half | Stamp from the left |
| Tap / click right half | Stamp from the right |
| `←` / `A` | Stamp from the left |
| `→` / `D` | Stamp from the right |
| `Space` / `Enter` | Start / restart |
| 🔊 button | Mute / unmute (remembered) |

### Debug niceties

- Force a season: `?season=winter` / `spring` / `summer` / `fall`
- `window.__filed` exposes game state in the console for poking around

## Deploy to GitHub Pages

The repo ships with a workflow (`.github/workflows/deploy.yml`) that publishes
the site to GitHub Pages on every push to `main`.

1. Create a GitHub repository and push this project to it:
   ```bash
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```
2. In the repository settings, under **Settings → Pages**, set
   **Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually from the Actions tab).
4. The game will be live at `https://<you>.github.io/<repo>/`.

All asset paths are relative, so it works at any subpath — no configuration
needed when the repo name changes.

## Tech

Plain HTML/CSS/JavaScript with Canvas 2D and Web Audio. All art and sound are
generated procedurally in code — there are no binary game assets to bit-rot
(the only image is the app icon). High score, character choice, and mute
preference persist in `localStorage`. No backend, no analytics, no build.

### Fairness guarantee

Hazard generation enforces the classic rule that keeps this genre fair: an
open drawer may directly follow another **only on the same side**; an
opposite-side drawer always has at least one safe section between. Every
sequence the generator emits is survivable with correct play.

---

*Not affiliated with the City of Burlington. No actual permits were approved
in the making of this game.*
