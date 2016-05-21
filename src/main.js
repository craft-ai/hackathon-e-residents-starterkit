var dotenv = require('dotenv');
var yargs = require('yargs');
var moment = require('Moment');

dotenv.load();

var rescueTime = require('./lib/rescueTime');

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
        });
    },
    function(argv) {
      rescueTime.retrieveActivityLog(argv.from, argv.to)
        .then(function(activities) {
          console.log(activities);
        })
        .catch(function (error) {
          throw new Error(error);
        });
    }
  )
  .demand(1)
  .strict()
  .help()
  .locale('en')
  .argv;
