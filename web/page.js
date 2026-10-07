// SDL Sopwith's page logic (pkg/emscripten/sopwith.html), moved out of an inline <script> so the site can serve
// the game under a strict Content-Security-Policy. Differences: Module.runScript (see engine/csp_run_script.js)
// replaces eval for the title menu's two calls, the manual opens upstream's copy for this release, there's
// no app manifest, so "install" does nothing, and the game isn't started twice (see mountFilesystems).
var MANUAL = "https://fragglet.github.io/sdl-sopwith-builds/tags/sdl-sopwith-2.9.0/doc/sopwith-emscripten.html";

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
    removeRunDependency("mountFilesystems");  // the last dependency going starts the game (upstream then called
                                               // run() again, which Emscripten 6 answers with an ErrnoError)
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
