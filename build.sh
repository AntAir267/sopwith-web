#!/bin/bash
# SDL Sopwith in the browser for thegrandpricks.com/games/sopwith/.
#   ./build.sh        clone the pinned release, build it with Emscripten, assemble dist/
#   ./build.sh ship   the same, then put it on the site (../thegrandpricks/tools/ship-game.py sopwith)
#
# The game is upstream SDL Sopwith (github.com/fragglet/sdl-sopwith, GPL-2.0), release 2.9.0, unmodified. It's
# cloned from github.com/AntAir267/sdl-sopwith, a mirror of upstream, so the source stays where the game is published.
# Upstream's own Emscripten port (embuild.sh + pkg/emscripten) is used as is, with two differences:
# - it targets the Emscripten in ~/emsdk (6.x) instead of Ubuntu 22.04's 3.1.5. Newer Emscripten refuses to link
#   configure's test programs as web-only executables, so configure runs with node in ENVIRONMENT and the real
#   build is linked web-only exactly as upstream does (see LDFLAGS below).
# - no eval: engine/csp_run_script.js replaces emscripten_run_script (the title menu's two page calls).
# - dist/ gets our page (web/: upstream's page with its script moved to page.js, so the site can serve it under a
#   strict CSP) instead of pkg/emscripten/sopwith.html, and no manual pages (they need pandoc; the menu's Manual
#   opens upstream's copy for this release).
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$PWD
TAG=sdl-sopwith-2.9.0
COMMIT=d364bc2641043f6dc5f47e8534b2742f3efeaddb
SRC=$ROOT/build/src

if [ ! -d "$SRC" ]; then
    git clone -q --branch "$TAG" --depth 1 https://github.com/AntAir267/sdl-sopwith "$SRC"
fi
[ "$(git -C "$SRC" rev-parse HEAD)" = "$COMMIT" ] || { echo "build/src is not $TAG ($COMMIT)"; exit 1; }

command -v emcc >/dev/null || source "${EMSDK:-$HOME/emsdk}/emsdk_env.sh" >/dev/null 2>&1

# --- upstream's embuild.sh, step by step ------------------------------------------------------------------
DEFAULT_CACHE_DIR=$(em-config CACHE)
export EM_CACHE=$ROOT/build/emscripten_cache
export EM_FROZEN_CACHE=
export PKG_CONFIG_PATH=$EM_CACHE/pkg
export PATH="$EM_CACHE/bin:$PATH"
export CFLAGS="-fexceptions -sSUPPORT_LONGJMP=emscripten"
LDFLAGS_WEB="-flto -sASYNCIFY -sFORCE_FILESYSTEM -sEXPORTED_FUNCTIONS=_main -sENVIRONMENT=web -lidbfs.js -Wl,-u,ntohs $CFLAGS"
LDFLAGS_WEB="$LDFLAGS_WEB --js-library $ROOT/engine/csp_run_script.js"   # no eval (see the file)
[ -e "$EM_CACHE" ] || cp -R "$DEFAULT_CACHE_DIR" "$EM_CACHE"
mkdir -p "$EM_CACHE/pkg" "$EM_CACHE/bin"
printf 'prefix=/\nexec_prefix=/\nlibdir=/\nincludedir=/\n\nName: sdl2\nDescription: sdl2\nVersion: 2.20.0\nRequires:\nConflicts:\nLibs: -sUSE_SDL=2\nCflags: -sUSE_SDL=2\n' > "$PKG_CONFIG_PATH/sdl2.pc"
for pair in ar:emar gcc:emcc g++:em++ ld:emcc nm:emnm ranlib:emranlib; do
    printf '#!/usr/bin/env bash\nexec %s "$@"\n' "${pair#*:}" > "$EM_CACHE/bin/asmjs-local-emscripten-${pair%%:*}"
    chmod a+rx "$EM_CACHE/bin/asmjs-local-emscripten-${pair%%:*}"
done
cd "$SRC"
if [ ! -e Makefile ]; then
    LDFLAGS="${LDFLAGS_WEB/-sENVIRONMENT=web/-sENVIRONMENT=web,node}" ./autogen.sh --host=asmjs-local-emscripten
fi
rm -f src/sopwith src/sopwith.wasm   # relink every time, so the link flags above always apply
make -j"$(nproc)" LDFLAGS="$LDFLAGS_WEB"

# --- dist/ ---------------------------------------------------------------------------------------------------
cd "$ROOT"
rm -rf dist && mkdir -p dist
cp "$SRC/src/sopwith" dist/sopwith.js
cp "$SRC/src/sopwith.wasm" dist/
cp "$SRC"/pkg/emscripten/{error.png,loading.gif} dist/
cp "$SRC/icon.png" dist/favicon.png
cp "$SRC/COPYING.md" dist/COPYING.md
cp web/* dist/
echo "dist/ ready: $(du -sh dist | cut -f1)"

if [ "${1:-}" = ship ]; then
    python3 "${SITE_REPO:-../thegrandpricks}/tools/ship-game.py" sopwith
fi
