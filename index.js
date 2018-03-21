const browserPerf = require('hunterchristian-browser-perf');
const times = require('lodash/times');
const fs = require('fs');
const strip = require('strip-json-comments')

const config = JSON.parse(strip(fs.readFileSync('./config.json', 'utf-8')));
// Check required config values
if (!config.url) {
	console.error('Please specify a URL');
	process.exit();
}

// Assume that a selenium server is being run locally via "npm run start-server"
const DEFAULT_SELENIUM_SERVER_URL = 'http://localhost:4444/wd/hub';


const average = data => {
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

const getStandardDeviation = values => {
  var avg = average(values);

  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
};

const getElementByCss = (browser, selector) =>
	browser.waitForElementByCss(
		selector,
		browser.isDisplayed,
		300,
		300
	);

const runPerfTest = scrollSpeed => new Promise(async (resolve, reject) => {
	const options = {
		selenium: DEFAULT_SELENIUM_SERVER_URL,
		browsers: [
			{
				browserName: 'chrome',
				chromeOptions: {
					args: [`--user-data-dir=${ config.pathToChromeProfile }`],
				}
			}
		],
		actions: [
			...times(config.numPageScrollsPerSample, () => browserPerf.actions.scroll({
				speed: scrollSpeed,
				distance: config.scrollDistance
			})),
		]
	};

	if (config.waitForLogin) {
		options.preScript = async browser => {
			await browser.get(config.url);
			await browser.sleep(60000);
		};
	}

	browserPerf(config.url, function(err, res) {
		// res - array of objects. Metrics for this URL
		if (err) {
			console.log('ERROR: ' + err);
			reject(err);
		} else {
			resolve(res[0].framesPerSec_raf);
		}
	}, options);
});

const results = {};
const collectPerfData = async () => {
	for (let speed in config.speedsToRun) {
		console.log(`Testing scroll speed: ${ speed }`);

		results[speed] = results[speed] || [];
		let scrollFps = await runPerfTest(config.speedsToRun[speed]);
		results[speed].push(scrollFps);

		console.log(`-- ${ speed } scroll, average = ${ average(results[speed]) } fps`);
		console.log(`-- ${ speed } scroll, standard deviation = ${ getStandardDeviation(results[speed]) } fps\n`);
	}
}

const main = async () => {
	console.log(`\nTEST STARTING WITH PARAMETERS - numSamples: ${ config.numSamples }, numPageScrollsPerSample: ${ config.numPageScrollsPerSample }, scrollDistance: ${ config.scrollDistance }`);
	for (let i = 0; i < config.numSamples; i++) {
		console.log(`\n=== SAMPLE NUMBER: ${ i + 1 } ===`);
		await collectPerfData();
	}
}
main();