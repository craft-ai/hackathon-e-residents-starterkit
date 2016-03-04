import _ from 'lodash';
import { Promise, default as Q } from 'q';
import Moment from 'moment';
import urlencode from 'urlencode';

const DATA_NOVA_URL = 'https://datanova.legroupe.laposte.fr/api/records/1.0/';
const DATA_NOVA_API_KEY = process.env.DATANOVA_API_KEY;

function retrieveNearestPostOffice(datetime, lat, lng) {
  let geofilter = urlencode(lat + ',' + lng + ',1000');
  return fetch(DATA_NOVA_URL + 'search?dataset=laposte_poincont&sort=-dist&geofilter.distance=' + geofilter + '&apikey=' + DATA_NOVA_API_KEY, {method: 'GET'})
    .then(response => {
      if (response.status >= 400) {
        return response.json()
          .catch(() => {
            throw new Error(`Error ${response.status} in DATANOVA request, invalid json returned.`);
          })
          .then( json => {
            throw new Error(`Error ${response.status} in DATANOVA request: ${json.error}`);
          });
      }
      else {
        return response.json()
          .then(json => {
            if (_.size(json.records)>0)
              return _.pick(_.first(json.records).fields, ['libelle_du_site', 'code_postal', 'adresse', 'localite']);
            else
              return;
          });
      }
    })
};

let nearestPostOfficeCache = {};

function retrieveNearestPostOfficeCached(obj) {
  const geoKey = `${obj.latitude}-${obj.longitude}`;
  return Promise((resolve, reject) => {
    if (!_.isUndefined(nearestPostOfficeCache[geoKey])) {
      resolve(nearestPostOfficeCache[geoKey]);
    }
    else {
      return retrieveNearestPostOffice(Moment(obj.timestamp).format('YYYY-MM-DD'), obj.latitude, obj.longitude)
        .then(r => {
          if (!_.isUndefined(r))
            nearestPostOfficeCache[geoKey] = r.libelle_du_site ;
          else
            nearestPostOfficeCache[geoKey] = 'NONE';
          resolve(nearestPostOfficeCache[geoKey]);
        });
    }
  })
}

export default function retrieveNearestPostOffices(locList) {
  return Promise.all(
    _.map(locList, (val, key) => {
      return retrieveNearestPostOfficeCached(val)
      .then(r => {
        let ts = Moment.unix(val.timestamp);
        return {
          timestamp: val.timestamp,
          diff: {
            dayOfTheWeek: ts.isoWeekday(),
            timeOfDay: parseFloat((ts.hour() + ts.minute()/60).toFixed(1)),
            postOffice: r
          }
        };
      })
    })
  )
}
