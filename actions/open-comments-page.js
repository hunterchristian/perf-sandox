module.exports = function(cfg) {
  // cfg - The configuration object. args, from the example above.
  return function(browser) {
    // browser is created using wd.promiseRemote()
    // More info about wd at https://github.com/admc/wd
    return browser.sleep(1000);
  }
};