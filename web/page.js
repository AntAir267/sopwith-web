// Modified 2026-10 by Anthony Airdo for the web build (sopwith-web).
// SDL Sopwith's page logic (pkg/emscripten/sopwith.html), moved out of an inline <script> so the site can serve
// the game under a strict Content-Security-Policy. Differences: Module.runScript (see engine/csp_run_script.js)
// replaces eval for the title menu's two calls, the manual opens upstream's copy for this release, there's
// no app manifest, so "install" does nothing, the game isn't started twice (see mountFilesystems), and the
// high score table is the site's (see Online high scores).
var MANUAL = "https://fragglet.github.io/sdl-sopwith-builds/tags/sdl-sopwith-2.9.0/doc/sopwith-emscripten.html";

// ---- Online high scores
// The game's TOP PILOTS table is everyone's: the site's top 10 for Sopwith (/api/scores/sopwith, same origin).
// The game only knows its table from hiscores.txt, so the page writes the site's table into that file before
// the game starts, and again whenever the site sends a newer one (and has the game load it again). A new high
// score comes from the game through Module.postHighScore (patches/0003-online-high-scores) and goes to the
// site, which answers with the new top 10. Offline, or when anything fails, the game keeps the table it has:
// the last one it got from the site plus its own scores since.
var SCORES_API = "/api/scores/sopwith";
var HISCORES_DIR = "/libsdl/SDL Sopwith", HISCORES_FILE = HISCORES_DIR + "/hiscores.txt";
var SCORES_WAIT = 2500;  // ms the game's start waits for the site's table (a slow answer is still used later)
// The game's own pilots (hiscore.c), with the medals and ribbons upstream's default hiscores.txt gives them.
// They stay in the table until ten players beat them, as in a fresh copy of the game.
var GAME_PILOTS = [["DLC", 6500, "6 63"], ["DG", 6000, "6 63"], ["JHC", 5500, "6 43"], ["JS", 5000, "6 59"],
  ["JH", 4500, "6 46"], ["CR", 4000, "4 5"], ["AMJ", 3500, "6 49"], ["HJM", 3000, "4 52"], ["BMB", 2500, "2 7"],
  ["SDH", 2000, "2 56"]].map(([initials, score, extra]) => ({ initials, score, extra }));
var gameStarted = false;
// asked for right away, so it's usually here before the game has downloaded
var siteScores = fetch(SCORES_API).then((r) => (r.ok ? r.json() : null)).then((r) => r && r.top).catch(() => null);

// hiscores.txt in the game's own format (SaveHighScores); "extra" is the medals and ribbons as the file packs
// them. The pilots go first so that, as in the game, the earlier of two equal scores stays on top.
function useSiteScores(top) {
  if (!Array.isArray(top)) return;
  try {
    var real = top.filter((e) => e && Number.isInteger(e.score) && e.score > 0 && typeof e.initials == "string");
    var lines = GAME_PILOTS.concat(real).sort((a, b) => b.score - a.score).slice(0, 10).map((e) => {
      var name = e.initials.replace(/[^!-~]/g, "").slice(0, 3) || "?";  // the game reads names up to a space
      var packed = /^(\d+) (\d+)$/.exec(e.extra || "") || [0, 0, 0];
      return name.padEnd(3) + " " + String(e.score).padStart(7) + " " + (packed[1] & 7) + " " +
        String(packed[2] & 63).padStart(2);
    });
    try { FS.mkdir(HISCORES_DIR); } catch (e) {}  // there already, unless this is the first visit
    FS.writeFile(HISCORES_FILE, "# Sopwith high scores file, from " + location.host + "\n" + lines.join("\n") + "\n");
    if (gameStarted) Module._LoadHighScoreTable();
  } catch (e) {}
}

// keepalive, so a score still gets there when the tab is closed right after the initials
function postHighScore(initials, score, medals, ribbons) {
  fetch(SCORES_API, {
    method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initials: initials, score: score, extra: medals + " " + ribbons }),
  }).then((r) => (r.ok ? r.json() : null)).then((r) => r && useSiteScores(r.top)).catch(() => {});
}

function openManual() {
  window.open(MANUAL);
}
function promptForInstall() {
  if (installPrompt != null) {
    installPrompt.prompt();
  }
}
function programError() {
  canvas.style.visibility = "hidden";
  loadingElement.style.visibility = "visible";
  loadingElement.setAttribute("src", "error.png");
}
var loadingElement = document.getElementById("loading");
var canvas = document.getElementById("canvas");

function syncFilesystems() {
  FS.syncfs(() => {});
}

function mountFilesystems() {
  // The Sopwith configuration file (and high scores) are stored in /libsdl/SDL Sopwith.
  FS.mkdir("/libsdl");
  FS.mount(IDBFS, {}, "/libsdl");
  // We can't start the game until we have synced all the contents of /libsdl from IndexedDB, so a run
  // dependency defers starting until the callback is invoked.
  addRunDependency("mountFilesystems");
  FS.syncfs(true, () => {
    // We sync the filesystem every 5 seconds.
    setInterval(syncFilesystems, 5000);
    // The site's high score table goes in first if it comes in time; offline the game still starts promptly,
    // and a table that comes later is used then.
    var start = () => {
      if (gameStarted) return;
      gameStarted = true;
      removeRunDependency("mountFilesystems");  // the last dependency going starts the game (upstream then called
                                                 // run() again, which Emscripten 6 answers with an ErrnoError)
    };
    siteScores.then((top) => { useSiteScores(top); start(); });
    setTimeout(start, SCORES_WAIT);
  });
}

var Module = {
  preRun: [function () {
    canvas.style.visibility = "visible";
    loadingElement.style.visibility = "hidden";
  }, mountFilesystems],
  onAbort: function (x) {
    programError();
  },
  runScript: function (script) {
    var known = { "openManual()": openManual, "promptForInstall()": promptForInstall };
    if (known[script]) known[script]();
  },
  postHighScore: postHighScore,
  canvas: (function () {
    canvas.addEventListener("webglcontextlost", function (e) {
      alert("WebGL context lost. You will need to reload the page.");
      e.preventDefault();
      programError();
    }, false);
    return canvas;
  })(),
};
window.addEventListener("error", (event) => {
  programError();
});
var installPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
