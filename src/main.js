var _ = require('lodash');
var craftai = require('craft-ai').createClient;
var dotenv = require('dotenv');
var fs = require('fs');
var moment = require('moment-timezone');
var Promise = require('bluebird');
var yargs = require('yargs');

dotenv.load();

var rescueTime = require('./lib/rescueTime');
var googleCalendar = require('./lib/googleCalendar');
var utils = require('./lib/utils');

// Data retrieval
yargs
  .command(
    'retrieve_data',
    'Retrieve and format activity data from RescueTime (`RESCUETIME_API_KEY`, `GOOGLE_API_CLIENT_ID`, `GOOGLE_API_CLIENT_SECRET` & `GOOGLE_API_PROJECT_ID` env variables needed)',
    function(yargs) {
      return yargs
        .option('from', {
          required: true,
          describe: 'Date lower bound (expects "YYYY-MM-DD")'
        })
        .option('to', {
          default: moment().format('YYYY-MM-DD'),
          describe: 'Date upper bound (expects "YYYY-MM-DD")'
        })
        .option('out', {
          describe: 'Output file'
        });
    },
    function(argv) {
      const from = moment(argv.from);
      const to = moment(argv.to);
      console.log('Retrieving data from ' + from.format() + ' to ' + to.format() + '...');
      Promise.all([
        rescueTime.retrieveActivityLog(from, to),
        googleCalendar.retrieveEvents(from, to)
      ])
        .then(function(activitiesAndEvents) {
          console.log('Generating the **craft ai** diff list...');
          var activities = activitiesAndEvents[0];
          var activitiesDiffList = utils.diffsFromActivities(activities);

          var events = activitiesAndEvents[1];
          var eventsDiffList = utils.diffsFromEvents(events);

          var diffList = utils.mergeDiffsLists([
            [
              {
                "timestamp": from.unix(),
                "diff": {
                  "category": "Nothing",
                  "status": "outOfMeeting",
                  "tz": "+02:00"
                }
              }
            ], activitiesDiffList, eventsDiffList ]);

          if (argv.out) {
            console.log('Saving **craft ai** diff list to "' + argv.out + '"...');
            return new Promise(function(resolve, reject) {
              fs.writeFile(argv.out, JSON.stringify(diffList, null, '  '), function(err) {
                if (err) {
                  reject(err);
                }
                else {
                  resolve()
                }
              });
            });
          }
          else {
            console.log('**craft ai** diff:');
            console.log(JSON.stringify(diffList, null, '  '));
          }
        })
        .catch(function (error) {
          console.log(error);
        });
    }
  )
  .command(
    'learn',
    'Create an agent and provide it with the given operations (`CRAFT_OWNER` & `CRAFT_TOKEN` env variable needed)',
    function(yargs) {
      return yargs
        .option('operations', {
          required: true,
          describe: 'path to the json file containing the operations'
        });
    },
    function(argv) {
      var client = craftai({
        owner: process.env.CRAFT_OWNER,
        token: process.env.CRAFT_TOKEN
      });
      var MODEL = {
        context: {
          time: {
            type: 'time_of_day'
          },
          day: {
            type: 'day_of_week'
          },
          tz: {
            type: 'timezone'
          },
          status: {
            type: 'enum'
          },
          category:  {
            type: 'enum'
          }
        },
        output: ['category'],
        time_quantum: 10 * 60
      };
      client.createAgent(MODEL)
        .then(function(agent) {
          console.log('Successfully create agent "' + agent.id + '" !');
          return new Promise(function(resolve, reject) {
            fs.readFile(argv.operations, function(err, data) {
              if (err) {
                reject(err);
              }
              else {
                try {
                  resolve(JSON.parse(data));
                }
                catch (jsonErr) {
                  reject(jsonErr);
                }
              }
            });
          })
          .then(function(operations) {
            return client.addAgentContextOperations(agent.id, operations);
          })
          .then(function() {
            console.log('Inspect the decision tree at https://beta.craft.ai/inspector?owner=' + process.env.CRAFT_OWNER + '&agent=' + agent.id + '&token=' + process.env.CRAFT_TOKEN);
          })
          .catch(function(err) {
            console.log(err);
            client.destroyAgent(agent.id);
          })
        });
    }
  )
  .demand(1)
  .strict()
  .help()
  .locale('en')
  .argv;
