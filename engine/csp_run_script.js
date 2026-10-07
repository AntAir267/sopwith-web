// Linked by build.sh with --js-library, after Emscripten's own libraries, so this replaces the stock
// emscripten_run_script from libcore.js.
//
// The stock version eval()s the string it's given. thegrandpricks.com serves the game under a
// Content-Security-Policy without 'unsafe-eval', where eval() throws and the page shows its error
// screen. SDL Sopwith only ever passes two fixed strings (the title menu's "openManual()" and
// "promptForInstall()"), so the string goes to Module.runScript (web/page.js) instead, which knows them.

addToLibrary({
  emscripten_run_script: (ptr) => {
    Module['runScript'](UTF8ToString(ptr));
  },
});
