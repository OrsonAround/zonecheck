const createTimer = jest.fn((timeout, callback) => ({
  timeout,
  callback,
}));

const logger = {
  info: jest.fn(),
  error: jest.fn(),
};

global.OnOffType = {
  ON: 'ON',
  OFF: 'OFF',
};

const theGlobalState = {
  pumpSwitchState: global.OnOffType.OFF,
  currentTemp: 90,
  currentHumid: 50,
  relayState1: global.OnOffType.ON,
  relayState9: global.OnOffType.ON,
  relayState2: global.OnOffType.ON,
  relayState10: global.OnOffType.ON,
};

function updateGlobalState(key, val) {
  theGlobalState[key] = val;
}

function createFreshZone() {
  theGlobalState.relaystate1 = global.OnOffType.OFF;
  theGlobalState.relayState2 = global.OnOffType.OFF;
  theGlobalState.relayState9 = global.OnOffType.OFF;
  theGlobalState.relayState10 = global.OnOffType.OFF;
  theGlobalState.currentTemp = 90;
  theGlobalState.currentHumid = 50;
  return {
    zoneName: 'Test Zone',
    desiredTemp: 75,
    desiredHumid: 90,
    relayName: 'Climate_Controller_Relay1',
  };
}

global.events = {
  sendCommand: jest.fn(),
};

global.Java = {
  type: (typeName) => {
    switch (typeName) {
      case 'java.time.ZonedDateTime':
        return {
          now: () => ({
            plusMinutes: jest.fn((x) => x),
            plusSeconds: jest.fn((x) => x),
          }),
        };
      case 'org.openhab.core.model.script.actions.ScriptExecution':
        return {
          createTimer,
        };
      case 'org.openhab.core.model.script.actions.Things':
        return {
          getThingStatusInfo: jest.fn(),
        };
      case 'java.lang.System':
        return {
          getenv: jest.fn(),
        };
      default:
        return {
          getLogger: () => logger,
        };
    }
  },
};

global.load = jest.fn();

global.itemRegistry = {
  getItem: (item) => ({
    name: item, // helpful for debugging
    getName: () => item,
    getState: () => {
      switch (item) {
        case 'Water_Pump_Switch':
          return theGlobalState.pumpSwitchState;
        case 'ClimateSHT10Array_TemperatureZoneTest Zone':
          return theGlobalState.currentTemp;
        case 'ClimateSHT10Array_HumidityZoneTest Zone':
          return theGlobalState.currentHumid;
        case 'Climate_Controller_Relay1':
          return theGlobalState.relayState1;
        case 'Climate_Controller_Relay2':
          return theGlobalState.relayState2;
        case 'Climate_Controller_Relay9':
          return theGlobalState.relayState9;
        case 'Climate_Controller_Relay10':
          return theGlobalState.relayState10;
        default:
          return `getItem ${item} getState`;
      }
    },
  }),
  getItems: (regexString) => ({
    toArray: () =>
      [
        'Climate_Controller_Relay1',
        'Climate_Controller_Relay2',
        'Climate_Controller_Relay9',
        'Climate_Controller_Relay10',
        'ClimateSHT10Array_HumidityZoneTest',
        'ClimateSHT10Array_TemperatureZoneTest',
      ]
        .filter((x) => new RegExp(regexString).test(x))
        .map((x) => global.itemRegistry.getItem(x)),
  }),
};

module.exports = {
  logger,
  createTimer,
  createFreshZone,
  updateGlobalState,
};
