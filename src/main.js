var _ = require('lodash');
var dotenv = require('dotenv');
var fs = require('fs');
var moment = require('Moment');
var Promise = require('bluebird');
var yargs = require('yargs');

dotenv.load();

var rescueTime = require('./lib/rescueTime');
var utils = require('./lib/utils');

// Data retrieval
yargs
  .command(
    'retrieve_data',
    'Retrieve and format activity data from RescueTime (`RESCUETIME_API_KEY` env variable needed)',
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
      rescueTime.retrieveActivityLog(argv.from, argv.to)
        .then(function(activities) {
          console.log('Generating the **craft ai** diff list...');
          var diffList = utils.diffsFromActivities(activities);
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
  .demand(1)
  .strict()
  .help()
  .locale('en')
  .argv;
