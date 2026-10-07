# sopwith-web

[SDL Sopwith](https://github.com/fragglet/sdl-sopwith) 2.9.0, the classic 1984 biplane game, built for the browser
with Emscripten for thegrandpricks.com/games/sopwith/. The game is upstream's release, unmodified, using upstream's
own Emscripten port (touch controls, high scores saved in the browser). GPL-2.0, like SDL Sopwith; see
`build/src/COPYING.md` after a build, or upstream's repository.

## Build

```sh
./build.sh        # clone sdl-sopwith-2.9.0 (checks commit d364bc26), build with ~/emsdk, assemble dist/
./build.sh ship   # then put it on the site: ../thegrandpricks/tools/ship-game.py sopwith
```

Needs the Emscripten SDK (`$EMSDK` or `~/emsdk`; built with 6.0.11), autoconf, automake and make.

## Changes from upstream's Emscripten build

- `build.sh` follows upstream's `embuild.sh` step by step, except that configure's test programs are linked with
  `-sENVIRONMENT=web,node`: newer Emscripten won't link them as web-only executables. The game itself is linked
  web-only, exactly as upstream does.
- `engine/csp_run_script.js` replaces Emscripten's `emscripten_run_script`, which eval()s the string it's given.
  The site's Content-Security-Policy has no `'unsafe-eval'`, so the title menu's two calls (`openManual()`,
  `promptForInstall()`) go to `Module.runScript` in `web/page.js` instead.
- `web/` is upstream's `pkg/emscripten/sopwith.html` with its inline script moved to `page.js` and styles to
  `page.css`. The Manual menu item opens upstream's hosted manual for 2.9.0; there's no app manifest, so the
  install item does nothing. The site adds its own "Back to games" link where `<!-- back link -->` is.
