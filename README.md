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

## BTown Brief headline mode

The optional **📰 headline mode** mixes real Burlington headlines from the
[BTown Brief](https://www.btownbrief.com) newsletter into the flying paperwork
(toggle it on the menu, or with the 📰 button during play).

Headlines come from a small static file, `data/headlines.json` — players never
hit the newsletter while playing. A GitHub Actions workflow
(`.github/workflows/headlines.yml`) refreshes it twice a week:

- **Schedule**: Monday + Friday at 14:30 UTC (10:30 EDT / 9:30 EST), safely
  after the morning editions publish in either daylight-saving regime.
- **Manual run**: Actions tab → "Update BTown Brief headlines" → Run workflow.
- **Local test**: `node scripts/update-headlines.mjs` (Node 18+, no deps).

The updater reads the Beehiiv RSS feed (each RSS item is a full edition with
inline HTML), pulls the story headlines out of the newest edition's *Local
News* section, filters junk and duplicates, and stores both the full headline
and a display-shortened version. If extraction fails, it exits without
writing, so the game keeps the last good file — and if no file exists at all,
the game silently uses the classic Burlington stamp pool.

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
