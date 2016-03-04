import fetch from 'isomorphic-fetch';
import _ from 'lodash';
import dotenv from 'dotenv';

dotenv.load();
let token = process.env.CRAFT_TOKEN;

// craft ai functions

function craftRequest(r) {
  r = _.defaults(r || {}, {
    method: 'GET',
    path: '',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: {}
  });

  let url = 'https://labs-integration.craft.ai/api';
  let owner = 'laposte';

  return fetch(url  + '/' + owner + '/' + r.path, {
    method: r.method,
    headers:r.headers,
    body: r.body
  })
  .then(response => {
    if (response.status >= 400) {
      return response.json()
        .catch(() => {
          throw new Error(`Error ${response.status} in craft ai request, invalid json returned.`);
        })
        .then( json => {
          throw new Error(`Error ${response.status} in craft ai request: ${json.message}`);
        });
    }
    else {
      return response.json();
    }
  });
};

function createCraftAgent(model, id) {
  return craftRequest({
    method: 'POST',
    path: 'agents',
    body: JSON.stringify({model: model, id: id})
  })
  .catch(err => {
    const msg = 'Agent creation failed:\n' + err;
    console.log(msg);
    throw new Error(msg);
  });
};

function updateCraftAgentContext(agent, diffs) {
  return craftRequest({
    method: 'POST',
    path: 'agents/' + agent + '/knowledge',
    body: JSON.stringify(diffs)
  })
  .catch(err => {
    const msg = 'Context update failed:\n' + err;
    console.log(msg);
    throw new Error(msg);
  });
};

function getCraftAgentDecision(agent, context, ts) {
  return craftRequest({
    method: 'POST',
    path: 'agents/' + agent + '/decision?t=' + ts,
    body: JSON.stringify(context)
  })
  .catch(err => {
    const msg = 'Decision retrieval failed:\n' + err;
    console.log(msg);
    throw new Error(msg);
  });
};

exports = module.exports = {
  createAgent: createCraftAgent,
  updateAgentContext: updateCraftAgentContext,
  getAgentDecision: getCraftAgentDecision
};
