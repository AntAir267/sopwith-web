# sopwith-web

[SDL Sopwith](https://github.com/fragglet/sdl-sopwith) 2.9.0, the classic 1984 biplane game, built for the browser
with Emscripten for thegrandpricks.com/games/sopwith/. The game is upstream's release with three patches (a muffled
engine sound, arrow-key controls and online high scores, see below), built with upstream's own Emscripten port
(touch controls, settings saved in the browser). GPL-2.0, like SDL Sopwith (see License).

## Build

```sh
./build.sh        # clone sdl-sopwith-2.9.0 (checks commit d364bc26), apply patches/, build with ~/emsdk, assemble dist/
./build.sh ship   # then put it on the site: ../thegrandpricks/tools/ship-game.py sopwith
```

Needs the Emscripten SDK (`$EMSDK` or `~/emsdk`; built with 6.0.11), autoconf, automake and make.

`build.sh` clones the `sdl-sopwith-2.9.0` tag from [AntAir267/sdl-sopwith](https://github.com/AntAir267/sdl-sopwith),
a mirror of [fragglet/sdl-sopwith](https://github.com/fragglet/sdl-sopwith), and checks it is commit d364bc26.
Whenever `patches/` changes, it resets the checkout's tracked files and applies them again (the configured build
stays, so make only rebuilds what they touch).

## Changes to the game (`patches/`)

- **0001-muffled-engine**: the plane's engine is a 22-42 Hz square wave, and upstream's PC speaker filter passes
  only its 1.5-6 kHz harmonics, which makes a constant rasp. The engine tone now skips that filter and goes through
  a 1 kHz low-pass instead, about 4 dB(A) quieter; gunfire, bombs, explosions and music are unchanged. It's
  "Muffled engine" in the options menu (on by default; off is the original sound).
- **0002-arrow-keys**: new default controls. Up raises the nose toward the sky and Down points it at the ground,
  whichever way the plane faces (the turn is picked when the key goes down and kept while it's held, so holding
  Up still loops). Left and Right are throttle: the arrow the plane is flying toward speeds up, the other slows
  down. After steering with the arrows the plane rolls right side up by itself (not while flying home). Shift
  drops bombs, F flips. The classic keys still work as before (X/Z throttle, `,` `/` pull up/down, `.` flip,
  B bomb, H home), the arrows can be rebound in the options menu, and the beginner's help lists the new keys.
  It all becomes the game's own commands, so the flight model is untouched. Gamepad and touch controls are as
  upstream has them.
- **0003-online-high-scores**: a new high score also goes to the page (`Module.postHighScore`, see below), and
  `LoadHighScoreTable` is exported so the page can have the game reload the table. It also closes the high score
  file after writing it: upstream leaves it open, so in the browser (where the game never exits) the scores
  stayed in stdio's buffer and the file was left empty.

## Online high scores

The game's own TOP PILOTS table is the site-wide one, kept by the site's Worker (`/api/scores/sopwith` on the
same origin, so the page's CSP needs nothing new):

- On load, `web/page.js` fetches the top 10 and writes it into `hiscores.txt` (in the game's own format, in the
  IndexedDB-backed `/libsdl/SDL Sopwith/`) before the game starts. The start waits at most 2.5 s for it; a slower
  answer is written when it comes and the game reloads its table. Until ten players have beaten them, the game's
  own pilots (DLC, DG, JHC...) fill the table, with the medals of upstream's default `hiscores.txt`.
- A new high score (only the default game, single player versus computer, as upstream counts them) is posted
  with its initials and score, and the medals and ribbons as `extra` (`"medals ribbons"`, the two packed numbers
  of `hiscores.txt`). The site answers with the new top 10, which replaces the table.
- Offline, or on any error, nothing is shown and nothing waits: the game keeps the last table it got, plus its
  own high scores since (those stay local; they're not sent again later).

To try it locally with the site and its API (a local Worker on 127.0.0.1:8792):
`cd ../thegrandpricks && python3 tools/serve.py 8794 --game sopwith=../sopwith-web/dist`, then
http://localhost:8794/games/sopwith/ (`--api http://127.0.0.1:1` to see it offline).

## Changes to upstream's Emscripten build

- `build.sh` follows upstream's `embuild.sh` step by step, except that configure's test programs are linked with
  `-sENVIRONMENT=web,node`: newer Emscripten won't link them as web-only executables. The game itself is linked
  web-only, exactly as upstream does.
- `engine/csp_run_script.js` replaces Emscripten's `emscripten_run_script`, which eval()s the string it's given.
  The site's Content-Security-Policy has no `'unsafe-eval'`, so the title menu's two calls (`openManual()`,
  `promptForInstall()`) go to `Module.runScript` in `web/page.js` instead.
- `web/` is upstream's `pkg/emscripten/sopwith.html` with its inline script moved to `page.js` and styles to
  `page.css`. The Manual menu item opens upstream's hosted manual for 2.9.0; there's no app manifest, so the
  install item does nothing. `page.js` also does the online high scores (above). The site adds its own "Back to
  games" link where `<!-- back link -->` is.

## License

GPL-2.0 (`COPYING.md`, the same file as upstream's). Sopwith (C) 1984-2000 David L. Clark (BMB Compuscience
1984, 1985, 1987); SDL Sopwith (C) 2001-2024 Simon Howard, Jesse Smith and contributors, as the game's own
banner has it. `web/` is derived from upstream's page and carries a notice saying so; the changes are listed above,
and `patches/` are changes to upstream's source under the same license.
