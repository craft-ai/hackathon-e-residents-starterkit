var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('Moment');
var url = require('url');

var RESCUETIME_API_KEY = process.env.RESCUETIME_API_KEY;

function retrieveActivityLog(from, to) {
  var queryUrl = url.format({
    protocol: 'https',
    host: 'www.rescuetime.com',
    pathname: '/anapi/data',
    query: {
      key: RESCUETIME_API_KEY,
      format: 'csv',
      perspective: 'interval',
      resolution_time: 'minute',
      restrict_begin: moment(from).format('YYYY-MM-DD'),
      restrict_end: moment(to).format('YYYY-MM-DD')
    }
  })

  console.log('Querying "' + queryUrl + '"...');

  return fetch(queryUrl)
    .then(function(response) {
      if (response.status >= 400) {
        throw new Error('Error ' + response.status + ' while querying "' + queryUrl + '"');
      }
      else {
        return response.text();
      }
    })
};

module.exports = {
  retrieveActivityLog: retrieveActivityLog
};
