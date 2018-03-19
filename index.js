const browserPerf = require('hunterchristian-browser-perf');
const times = require('lodash/times');
const readFile = require('./helpers/readFile.js');
const getStandardDeviation = require('./helpers/getStandardDeviation.js');
const writeFile = require('./helpers/writeFile.js');

const options = require('minimist')(process.argv.slice(2));

const getBrowsers = (browsers) => browsers && browsers.split(',');
const BROWSERS_BEING_TESTED = getBrowsers(options.browsers) || ['chrome'];

// Check required options
if (!options.url) {
	console.error('Please specify a URL, e.g. "npm run measure-fps -- --url=https://www.reddit.com"');
	process.exit();
}
if (!options.username || !options.password) {
	console.error('Please specify a username and password for your reddit account, e.g. "npm run measure-fps -- --username=yourusername --password=yourpassword"');
	process.exit();
}
const URL_BEING_TESTED = options.url;

// Assume that a selenium server is being run locally via "npm run start-server"
const DEFAULT_SELENIUM_SERVER_URL = 'http://localhost:4444/wd/hub';
const ELEMENT_WAIT_TIMEOUT_MILLIS = 500;
const POLLING_INTERVAL_MILLIS = 300;
// Scroll speed units are pixels/second
const FAST_SCROLL_SPEED = 6000;
const MODERATE_SCROLL_SPEED = 3000;
const SLOW_SCROLL_SPEED = 800;
// The number of times that we scroll the page, then pause
const NUM_PAGE_SCROLLS = 30;
// Scroll distance is actually defined in chrome_scroll.js
//const SCROLL_DISTANCE = 25000;
const NUM_SAMPLES = 10;

const getElementByCss = (browser, selector) =>
	browser.waitForElementByCss(
		selector,
		browser.isDisplayed,
		300,
		300
	);

const runPerfTest = scrollSpeed => new Promise(async (resolve, reject) => {
	const firefoxProfile = await readFile('./data/firefoxprofile');
	browserPerf(URL_BEING_TESTED, function(err, res) {
		// res - array of objects. Metrics for this URL
		if (err) {
			console.log('ERROR: ' + err);
			reject(err);
		} else {
			resolve(res[0].framesPerSec_raf);
		}
	}, {
		selenium: DEFAULT_SELENIUM_SERVER_URL,
		browsers: [
			{
			browserName: 'chrome',
			chromeOptions: {
				args: ['--user-data-dir=/Users/hunter.hodnett/Library/Application Support/Google/Chrome/Default'],
			}
			}
		],
		// preScript: async browser => {
		// 	try {
		// 		await browser.get(URL_BEING_TESTED);
		// 		const loginLink = await getElementByCss(browser, 'a.desktop-onboarding-sign-up__form-toggler');
		// 		if (loginLink) {
		// 			// TODO: detect when we have successfully logged into Okta rather
		// 			// than sleeping for 90 seconds
		// 			console.log('login detected');
		// 			await loginLink.click();
		// 			const username = await getElementByCss(browser, '#user_login');
		// 			await username.type(options.username);

		// 			const password = await getElementByCss(browser, '#passwd_login');
		// 			await password.type(options.password);

		// 			// Calling el.click() throws an error saying that the element is no longer in the page...
		// 			await browser.eval(`$('button[type="submit"]').click()`);
		// 		}
		// 	} catch (err) {
		// 		console.error(err);
		// 	}
		// },
		actions: [
			...times(NUM_PAGE_SCROLLS, () => browserPerf.actions.scroll({ speed: scrollSpeed })),
		]
	});
});

const samples = {
	fastScrollFps: [],
	moderateScrollFps: [],
	slowScrollFps: [],
};
const collectPerfData = async () => {
	let fastScrollFps = await runPerfTest(FAST_SCROLL_SPEED);
	console.log(`fast scroll FPS: ${ fastScrollFps }`);
	samples.fastScrollFps.push(fastScrollFps);
	console.log(`standard deviation for fast scroll: ${ getStandardDeviation(samples.fastScrollFps) }fps`);

	let moderateScrollFps = await runPerfTest(MODERATE_SCROLL_SPEED);
	console.log(`moderate scroll FPS: ${ moderateScrollFps }`);
	samples.moderateScrollFps.push(moderateScrollFps);
	console.log(`standard deviation for moderate scroll: ${ getStandardDeviation(samples.moderateScrollFps) }fps`);

	let slowScrollFps = await runPerfTest(SLOW_SCROLL_SPEED);
	console.log(`slow scroll FPS: ${ slowScrollFps }`);
	samples.slowScrollFps.push(slowScrollFps);
	console.log(`standard deviation for slow scroll: ${ getStandardDeviation(samples.slowScrollFps) }fps`);
}

const main = async () => {
	console.log(`TEST STARTING WITH PARAMETERS - NUM_SAMPLES: ${ NUM_SAMPLES }, NUM_PAGE_SCROLLS: ${ NUM_PAGE_SCROLLS }`);
	for (let i = 0; i < NUM_SAMPLES; i++) {
		await collectPerfData();
	}
}
main();