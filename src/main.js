import _ from 'lodash';
import { Promise, default as Q } from 'q';
import craft from './lib/craft-ai';
import fs from 'fs';
import jsdom from 'jsdom';
import Moment from 'moment';
import retrieveNearestPostOffices from './lib/postOffices';
import ToJson from 'togeojson';
import program from 'commander';
import path from 'path';
import { DOMParser } from 'xmldom';

const AGENT_MODEL = {
  context: {
    dayOfTheWeek: {
      type: 'continuous',
      min: 1,
      max: 7
    },
    timeOfDay:  {
      type: 'continuous',
      min: 0,
      max: 24
    },
    postOffice: {
      type: 'enum'
    }
  },
  output: [
    'postOffice'
  ],
  time_quantum: 20 * 60 * 1000
};

function loadLocations(locFilePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(locFilePath, (err, data) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(data);
      }
    })
  })
    .then(rawData => {
      const dom = new DOMParser().parseFromString(rawData.toString('utf8'),'text/xml');
      const ext = path.extname(locFilePath)
      if (ext === '.kml') {
        return _.first(ToJson.kml(dom, { styles: true }).features);
      }
      else if (ext === '.gpx') {
        return _.first(ToJson.gpx(dom, { styles: true }).features);
      }
      else {
        return Q.reject('invalid file');
      }
    })
    .then(positions => _.chunk(_.reduce(positions.properties.coordTimes, (res, val, key) => {
      let latitude = parseFloat(positions.geometry.coordinates[key][1].toFixed(3));
      let longitude = parseFloat(positions.geometry.coordinates[key][0].toFixed(3));
      res[_.size(res)] = {'timestamp': Moment(val).unix(), 'latitude': latitude, 'longitude': longitude};
      return res;
    }, []), 40));
}

let sentDiffs = [];

function sendContextDiffs(agent, diffs) {
  sentDiffs = sentDiffs.concat(diffs);
  return craft.updateAgentContext(agent, diffs);
}

function uploadContextBatchFromLocations(agent, locations) {
  return _.reduce(locations, (previousPromise, location, key) => {
    return previousPromise
      .then((previousRes) => {
        return Promise.all([
          retrieveNearestPostOffices(location)
          .then(r => {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(`Uploading context to agent '${agent.id}': ${(key/locations.length*100).toFixed(2)}%`);
            return r;
          }),
          previousRes ? sendContextDiffs(agent.id, previousRes[0]) : Q()
        ]);
      })
    }, Q())
  .then(res => sendContextDiffs(agent.id, res[0]));
}

function uploadContextBatch(agent, batchFile) {
  return new Promise((resolve, reject) => {
    fs.readFile(batchFile, (err, data) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(data);
      }
    })
  })
    .then(rawData => JSON.parse(rawData))
    .then(diffs => craft.updateAgentContext(agent.id, diffs));
}

program
  .command('create')
  .description('create a craft ai agent')
  .option('-i, --input [path]', 'Load an initial geotrace')
  .action(function(options) {
    const parsedInputPath = path.parse(options.input);
    craft.createAgent(AGENT_MODEL)
      .then(agent => {
        console.log(`Agent '${agent.id}' successfully created.`);
        if (parsedInputPath.ext === '.json') {
          return uploadContextBatch(agent, options.input);
        }
        else {
          return loadLocations(options.input)
            .then(locations => {
              console.log(`Locations successfully loaded from '${options.input}'.`);
              return uploadContextBatchFromLocations(agent, locations)
            })
            .then(() => {
              const fileName = `${parsedInputPath.dir}/${parsedInputPath.name}.json`;
              return new Promise((resolve, reject) => fs.writeFile(fileName, JSON.stringify(sentDiffs, null, 2), (err) => {
                if (err) {
                  reject(err);
                }
                else {
                  console.log(`Sent diff saved to ${fileName}`);
                  resolve();
                }
              }));
            })
        }
      })
      .catch(err => console.log('Error while creating a new agent', err));
  });

program
  .command('decide <agent> [datetime]')
  .description('retrieve which post office in the right one at a given time')
  .action(function(agent, datetime) {
    const momentDatetime = _.isUndefined(datetime) ? Moment() : Moment(datetime);
    if (!momentDatetime.isValid()) {
      console.log('Error while parsing the given date/time ${datetime}');
      return;
    }
    const context = {
      dayOfTheWeek: momentDatetime.isoWeekday(),
      timeOfDay: parseFloat((momentDatetime.hour() + momentDatetime.minute()/60).toFixed(1)),
    }
    return craft.getAgentDecision(agent, context, momentDatetime.unix())
      .then(res => {
        console.log(`Decision at ${momentDatetime.format('lll')} for agent '${agent}' is `, res)
        console.log(`- Inspect the decision tree at https://labs-integration.craft.ai/inspector?owner=laposte&agent=${agent}&token=${process.env.CRAFT_TOKEN}`);
      })
      .catch(err => {
        console.log(`Error while taking decision at ${momentDatetime.format('lll')} for agent '${agent}'`, err)
      });
  });

program.parse(process.argv);
