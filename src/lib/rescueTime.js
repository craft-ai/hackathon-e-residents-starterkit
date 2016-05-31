var _ = require('lodash');
var fetch = require('node-fetch');
var moment = require('moment-timezone');
var Promise = require('bluebird');
var url = require('url');

var RESCUETIME_API_KEY = process.env.RESCUETIME_API_KEY;

function retrieveActivityLog(from, to) {
  var queryUrl = url.format({
    protocol: 'https',
    host: 'www.rescuetime.com',
    pathname: '/anapi/data',
    query: {
      key: RESCUETIME_API_KEY,
      format: 'json',
      perspective: 'interval',
      resolution_time: 'minute',
      restrict_begin: from.format('YYYY-MM-DD'),
      restrict_end: to.format('YYYY-MM-DD')
    }
  })

  console.log('Querying "' + queryUrl + '"...');

  return fetch(queryUrl)
    .then(function(response) {
      if (response.status >= 400) {
        return Promise.reject(new Error('Error ' + response.status + ' while querying "' + queryUrl + '"'));
      }
      else {
        return response.json();
      }
    })
    .then(function(json) {
      return Promise.resolve(json);
    });
};

module.exports = {
  retrieveActivityLog: retrieveActivityLog
};
