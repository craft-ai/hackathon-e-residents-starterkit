var moment = require('Moment');
var _ = require('lodash');

function diffsFromActivities(activities) {
  return _(activities.rows)
    .map(function(activityRow) {
      return {
        originalDate: moment(activityRow[0]),
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
          category: activity.category
        }
      }
    })
    .tap(function(operations) {
      operations[0].diff.tz = '+00:00';
     })
    .value();
}

module.exports = {
  diffsFromActivities: diffsFromActivities
}
