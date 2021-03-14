const createTimer = jest.fn((timeout, callback) => ({
  timeout,
  callback,
}));

const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

global.OnOffType = {
  ON: 'ON',
  OFF: 'OFF',
};

String.prototype.toFullString = String.prototype.toString;

const theGlobalState = {
  currentTemp: { value: '90', type: 'Number' },
  currentHumid: { value: '50', type: 'Number' },
  ZA_Enabled: { value: global.OnOffType.ON, type: 'Switch' },
  ZC_Enabled: { value: global.OnOffType.ON, type: 'Switch' },
  ZB_Enabled: { value: global.OnOffType.ON, type: 'Switch' },
  ZD_Enabled: { value: global.OnOffType.ON, type: 'Switch' },
  ZE_Enabled: { value: global.OnOffType.ON, type: 'Switch' },
  TZ_Enabled: { value: global.OnOffType.ON, type: 'Switch' },
  EnviroPlus_Temperature: { value: '90', type: 'Number' },
  ZA_Relay: { value: global.OnOffType.ON, type: 'Switch', tags: ['Relay'] },
  ZB_Relay: { value: global.OnOffType.ON, type: 'Switch', tags: ['Relay'] },

  ClimateSHT10Array_HumidityZoneTest: { value: '20', type: 'Number' },
  ClimateSHT10Array_TemperatureZoneTest: { value: '20', type: 'Number' },
  ZALL_WaterPump: { value: global.OnOffType.OFF, type: 'Switch' },
  ClimateControl_Relay1: { value: global.OnOffType.OFF, type: 'Switch' },
  ClimateControl_Relay10: { value: global.OnOffType.OFF, type: 'Switch' },
};

function updateGlobalState(key, val) {
  theGlobalState[key].value = String(val);
}

function updateGlobalStateItemType(key, val) {
  theGlobalState[key].type = val;
}

function createFreshZone() {
  theGlobalState.ZD_Enabled.value = global.OnOffType.OFF;
  theGlobalState.ZB_Enabled.value = global.OnOffType.OFF;
  theGlobalState.ZC_Enabled.value = global.OnOffType.OFF;
  theGlobalState.ZA_Enabled.value = global.OnOffType.OFF;
  theGlobalState.ZE_Enabled.value = global.OnOffType.OFF;
  return {
    zoneName: 'TZ',
  };
}

global.events = {
  sendCommand: jest.fn(),
};

const Things = {
  getThingStatusInfo: jest.fn(),
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
        return Things;
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
    getType: () => {
      return theGlobalState[item].type;
    },
    getState: () => {
      try {
        return theGlobalState[item].value;
      } catch (e) {
        throw new Error('no value in global state for ' + item);
      }
      /*
      switch (item) {
        case 'ZA_WaterPump':
          return theGlobalState.pumpSwitchState;
        case 'ClimateSHT10Array_TemperatureZoneTest Zone':
          return theGlobalState.currentTemp;
        case 'ClimateSHT10Array_HumidityZoneTest Zone':
          return theGlobalState.currentHumid;
        case 'ZA_Enabled':
          return theGlobalState.ZA_Enabled;
        case 'ZB_Enabled':
          return theGlobalState.ZB_Enabled;
        case 'ZC_Enabled':
          return theGlobalState.ZC_Enabled;
        case 'ZD_Enabled':
          return theGlobalState.ZD_Enabled;
        case 'ZE_Enabled':
          return theGlobalState.ZE_Enabled;
        default:
          return `getItem ${item} getState`;
      }
      */
    },
  }),
  getItems: (regexString) => ({
    toArray: () =>
      Object.keys(theGlobalState)
        .filter((x) => {
          return new RegExp(regexString).test(x);
        })
        .map((x) => global.itemRegistry.getItem(x)),
    forEach: (fn) => {
      Object.keys(theGlobalState)
        .filter((x) => new RegExp(regexString).test(x))
        .forEach((x) => {
          fn(global.itemRegistry.getItem(x));
        });
    },
  }),
  getItemsByTagAndType: (type, ...tags) => ({
    toArray: () =>
      Object.entries(theGlobalState)
        .filter(([, val]) => {
          return val.type === type;
        })
        .filter(([, val]) => {
          return val.tags?.some((y) => tags.includes(y));
        })
        .map(([key]) => {
          return global.itemRegistry.getItem(key);
        }),
    forEach: (fn) => {
      Object.entries(theGlobalState)
        .filter(([, val]) => {
          return val.type === type;
        })
        .filter(([, val]) => {
          return val.tags?.some((y) => tags.includes(y));
        })
        .forEach(([key]) => {
          fn(global.itemRegistry.getItem(key));
        });
    },
  }),
};

module.exports = {
  logger,
  createTimer,
  createFreshZone,
  updateGlobalState,
  updateGlobalStateItemType,
  Things,
};
