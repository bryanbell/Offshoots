// Every suite opens a fresh browser profile, which is exactly the state the welcome modal
// is built for: it comes up over the map and swallows the first click of every test. So
// each suite marks it seen before any page loads, and welcome.test.js is the one place
// that deliberately does not, since showing it is what that suite is about.
module.exports = function seen(browser){
  const mark = async target => {
    if(target && target.addInitScript)
      await target.addInitScript(() => {
        try{ localStorage.setItem("musicatlas.seen","1"); }catch(e){}
        // The root's Collections row shows only what suits the hour, so which collections
        // are on it depends on when the suite runs. Suites click named ones from the root,
        // so they get the whole row back; modes.test turns this off to check the real row.
        window.__MA_ROWALL = true;
      });
    return target;
  };
  for(const fn of ["newPage","newContext"]){
    const orig = browser[fn].bind(browser);
    browser[fn] = async (...args) => {
      const made = await orig(...args);
      await mark(made);
      if(fn === "newContext"){
        const np = made.newPage.bind(made);
        made.newPage = async (...a) => np(...a);   // the context's init script covers its pages
      }
      return made;
    };
  }
  return browser;
};
