# Starter kit: Hackathon "Hack the office" with craft ai  #

Here is an example of a Node.js application using [**craft ai**](http://craft.ai)
realized as a support for the Hackathon [Hack The Office](http://hacktheoffice.bemyapp.com).

### Setup ###

- Download or clone the [sources from GitHub](https://github.com/craft-ai/hackathon-starterkit),
- Install [Node.js](https://nodejs.org/en/download/) on your computer,
- Install dependencies by running `npm install` in a terminal from the directory where the sources are.
- in this directory, create a `.env` file setting the following variables:
    - `CRAFT_TOKEN` allows you to [authenticate your calls to the **craft ai** API](https://beta.craft.ai/doc#header-authentication),
    - `CRAFT_OWNER` define the **owner** of the craft ai agents that will be created _(at the moment you can use any string w/o spaces)_,
    - (optional) `RESCUETIME_API_KEY` allows you to retrieve your own data from [RescueTime](https://www.rescuetime.com);
    - (optionnal) `GOOGLE_API_CLIENT_ID`, `GOOGLE_API_CLIENT_SECRET` & `GOOGLE_API_PROJECT_ID` allows to retrieve your own data from Google calendar, follow [this guide](https://developers.google.com/google-apps/calendar/quickstart/nodejs#step_1_turn_on_the_api_name) to retrieve the values from the Google API generated `json` file.

### Using ###

```console
> node ./src/main.js --help       
Commands:
  retrieve_data  Retrieve and format activity data from RescueTime
                 (`RESCUETIME_API_KEY`, `GOOGLE_API_CLIENT_ID`,
                 `GOOGLE_API_CLIENT_SECRET` & `GOOGLE_API_PROJECT_ID` env
                 variables needed)
  learn          Create an agent and provide it with the given operations
                 (`CRAFT_OWNER` & `CRAFT_TOKEN` env variable needed)

Options:
  --help  Show help                                                    [boolean]
```

```console
> node ./src/main.js retrieve_data --help

src/main.js retrieve_data

Options:
  --help  Show help                                                    [boolean]
  --from  Date lower bound (expects "YYYY-MM-DD")                     [required]
  --to    Date upper bound (expects "YYYY-MM-DD")        [default: "2016-05-21"]
```

```console
> node ./src/main.js learn --help

src/main.js learn

Options:
  --help        Show help                                              [boolean]
  --operations  path to the json file containing the operations       [required]
```

### Resources ###

- [craft ai documentation](https://beta.craft.ai)

Technical questions can be sent by email at [support@craft.ai]('mailto:support@craft.ai').
