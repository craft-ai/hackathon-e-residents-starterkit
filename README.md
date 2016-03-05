# Starter kit: Hackathon "Code avec La Poste" with craft ai  #

Here is an example of a Node.js application using [**craft ai**](http://craft.ai)
realized as a support for the Hackathon [Code avec La Poste](http://codeaveclaposte.bemyapp.com/).

### Setup ###

- Download and unzip the [sources from GitHub](https://github.com/craft-ai/hackathon-starterkit),
- Install [Node.js](https://nodejs.org/en/download/) on your computer,
- Install dependencies by running `npm install` in a terminal from the directory where
you unzipped the sources.
- in this directory, create a `.env` file setting the following variables:
    - `CRAFT_TOKEN` allows you to [authenticate your calls to the **craft ai** API](https://labs-integration.craft.ai/doc#header-authentication),
    - `DATANOVA_API_KEY` allows you to [authenticate your calls to the **dataNOVA** API](https://datanova.legroupe.laposte.fr/api/v1/documentation#doc-acces).

### Starting ###

The application has 2 different commands:
- `npm start -- create --input <path/to/location/file.[kml|gpx]>` creates a new agent and initialize it with a location file,
- `npm start -- decide <agent> [YYYYMMDDTHHMM]` takes a decision for a given timestamp.

### Under the hood ###

#### dataNOVA API ####

This starter kit contains some calls to the [dataNOVA](https://datanova.legroupe.laposte.fr/)
that you can use as examples.

#### craft ai ####

The craft ai API calls have been packaged in a simple library that you can find in the `./src/lib`
folder of the application sources. the three functions that are exposed have rather self-explanatory
names:

  - `createAgent` initiates a craft ai agent with a given model (see below),
  - `updateAgentContext` feeds the agent with data about the context,
  - `getAgentDecision` retrieves the result of the agent's decision for the given context.

The model that is required to create an agent is a description of the dimensions over which you want
the agent to learn (eg: here, the day of the week and the time of the day) as well as the expected
output (in this example, the closest post office).

### Resources ###

- [Documentation](https://labs-integration.craft.ai)

Technical questions can be sent by email at [support@craft.ai]('mailto:support@craft.ai').
