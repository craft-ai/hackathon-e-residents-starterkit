var dotenv = require('dotenv');
dotenv.load();

var _ = require('lodash');
var craftai = require('craft-ai').createClient;
var fs = require('fs');
var googleCalendar = require('./lib/googleCalendar');
var moment = require('moment-timezone');
var Promise = require('bluebird');
var rescueTime = require('./lib/rescueTime');
var utils = require('./lib/utils');
var yargs = require('yargs');

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
      var from = moment(argv.from);
      var to = moment(argv.to);
      console.log('Retrieving data from ' + from.format() + ' to ' + to.format() + '...');
      Promise.all([
        rescueTime.retrieveActivityLog(from, to),
        googleCalendar.retrieveEvents(from, to)
      ])
        .then(function(activitiesAndEvents) {
          console.log('Generating the **craft ai** diff list...');
          var activities = activitiesAndEvents[0];
          var activitiesDiffList = utils.diffsFromActivities(activities);
          console.log('- ' + activitiesDiffList.length + ' activity diffs generated');

          var events = activitiesAndEvents[1];
          var eventsDiffList = utils.diffsFromEvents(events);
          console.log('- ' + eventsDiffList.length + ' event diffs generated');

          var diffList = utils.mergeDiffsLists([
            [
              {
                timestamp: from.unix(),
                diff: {
                  category: 'Nothing',
                  status: 'outOfMeeting',
                  tz: '+02:00'
                }
              }
            ], activitiesDiffList, eventsDiffList ]);
          console.log('- ' + diffList.length + ' merged diffs generated');

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
    'learn <operations_file>',
    'Create an agent and provide it with the given operations (`CRAFT_OWNER` & `CRAFT_TOKEN` env variable needed)',
    function(yargs) {
      return yargs;
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
      console.log('Creating a new agent...');
      client.createAgent(MODEL)
        .then(function(agent) {
          console.log('Successfully create agent "' + agent.id + '" !');
          return new Promise(function(resolve, reject) {
            fs.readFile(argv.operations_file, function(err, data) {
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
            return client.getAgent(agent.id);
          })
          .then(function(retrievedAgent) {
            console.log('Inspect the decision tree at ' + client.cfg.url + '/inspector?agent=' + agent.id + '&timestamp=' + retrievedAgent.lastTimestamp);
          })
          .catch(function(err) {
            console.log(err);
            client.destroyAgent(agent.id);
          });
        })
        .catch(function(err) {
          console.log(err);
        })
    }
  )
  .command(
    'destroy <agent_id>',
    'Destroy a previously created agent (`CRAFT_OWNER` & `CRAFT_TOKEN` env variable needed)',
    function(yargs) {
      return yargs;
    },
    function(argv) {
      var client = craftai({
        owner: process.env.CRAFT_OWNER,
        token: process.env.CRAFT_TOKEN
      });
      client.destroyAgent(argv.agent_id)
        .then(function(agent) {
          console.log('Successfully destroyed agent "' + agent.id + '" !');
        })
        .catch(function(err) {
          console.log(err);
        });
    }
  )
  .command(
    'decide <agent_id>',
    'Take a decision using the given agent (`CRAFT_OWNER` & `CRAFT_TOKEN` env variable needed)',
    function(yargs) {
      return yargs
        .option('status', {
          default: 'outOfMeeting',
          describe: 'Current status',
          choices: ['inMeeting', 'outOfMeeting']
        })
        .option('at', {
          default: moment().format('YYYY-MM-DDTHH:MM'),
          describe: 'Date at which the decision is taken (expects "YYYY-MM-DDTHH:MM")'
        });
      return yargs;
    },
    function(argv) {
      var client = craftai({
        owner: process.env.CRAFT_OWNER,
        token: process.env.CRAFT_TOKEN
      });
      var at = moment(argv.at);
      client.getAgent(argv.agent_id)
        .then(function(agent) {
          return client.computeAgentDecision(argv.agent_id, agent.lastTimestamp, {
            status: argv.status,
            time: at.hour() + at.minute() / 60,
            day: at.day(),
            tz: '+02:00'
          })
        })
        .then(function(r) {
          console.log('The agent "' + argv.agent_id + '" (at t=' + r.timestamp + ') has spoken...');
          console.log(at.calendar() + ' (' + at.format('YYYY-MM-DDTHH:mm') + ')');
          console.log('if "' + argv.status + '"')
          console.log('it expects you to be doing "' + r.decision.category  + '"');
          console.log('with a confidence of ' + Math.round(r.confidence * 100) + '%' );
        })
        .catch(function(err) {
          console.log(err);
        });
    }
  )
  .demand(1)
  .strict()
  .help()
  .locale('en')
  .argv;
