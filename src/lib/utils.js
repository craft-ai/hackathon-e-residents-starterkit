var _ = require('lodash');
var moment = require('moment-timezone');

function diffsFromActivities(activities) {
  return _(activities.rows)
    .map(function(activityRow) {
      return {
        originalDate: moment.tz(activityRow[0], 'Europe/Paris'),
        duration: activityRow[1],
        activity: activityRow[3],
        category: activityRow[4]
      };
    })
    .reduce(function(ta, activity) {
      var prevActivity = ta.last();
      if (prevActivity && prevActivity.originalDate.isSame(activity.originalDate)) {
        activity.date = prevActivity.date.clone().add(prevActivity.duration, 's');
      }
      else {
        if (prevActivity) {
          // After the last activity of the bunch, we do nothing !
          ta = ta.concat({
            date: prevActivity.date.clone().add(prevActivity.duration, 's'),
            activity: 'None',
            category: 'Nothing'
          });
        }
        activity.date = activity.originalDate;
      }
      return ta.concat(activity);
    }, _([]))
    .map(function(activity) {
      return {
        timestamp: activity.date.unix(),
        diff: {
          category: activity.category,
          tz: activity.date.format('Z')
        }
      }
    })
    .value();
}

function diffsFromEvents(events) {
  console.log(events);
  return _(events)
    .map(function(event) {
      return [
        {
          timestamp: moment.tz(event.start.dateTime, event.start.timeZone || 'Europe/Paris').unix(),
          diff: {
            status: 'inMeeting'
          }
        },
        {
          timestamp: moment.tz(event.end.dateTime, event.end.timeZone || 'Europe/Paris').unix(),
          diff: {
            status: 'outOfMeeting'
          }
        }
      ]
    })
    .flatten()
    .sortBy(function(diff) { return diff.timestamp; })
    .value();
}

function mergeDiffsLists(diffLists) {
  var state = {};
  return _(diffLists)
    .flatten()
    .sortBy(function(diff) { return diff.timestamp; })
    .reduce(function(sanitizedDiffList, diff) {
      var prevDiff = sanitizedDiffList.last();
      if (prevDiff) {
        if (prevDiff.timestamp === diff.timestamp) {
          sanitizedDiffList = sanitizedDiffList.dropRight();
          diff = _.extend(prevDiff, diff);
        }
        else {
          _.each(_.keys(state), function(key) {
            if (state[key] === diff.diff[key]) {
              diff.diff = _.omit(diff.diff, [ key ]);
            }
          });
          if (_.size(diff.diff) === 0) {
            diff = undefined;
          }
        }
      }
      if (diff) {
        state = _.extend(state, diff.diff);
        return sanitizedDiffList.concat(diff);
      }
      else {
        return sanitizedDiffList;
      }
    }, _([]))
    .value();
}

module.exports = {
  diffsFromActivities: diffsFromActivities,
  diffsFromEvents: diffsFromEvents,
  mergeDiffsLists: mergeDiffsLists
}
