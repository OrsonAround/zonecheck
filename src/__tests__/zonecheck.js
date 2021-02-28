const createTimer = jest.fn((timeout, callback) => ({
  timeout,
  callback,
}));
const logger = jest.fn();

global.events = {
  sendCommand: jest.fn(),
};

global.OnOffType = {
  ON: 'ON',
  OFF: 'OFF',
};

let pumpSwitchState = global.OnOffType.OFF;
let currentTemp = 90;
let relayState = global.OnOffType.ON;
const PUMP_SWITCH_NAME = 'Water_Pump_Switch';

global.Java = {
  type: (x) => {
    switch (x) {
      case 'java.time.ZonedDateTime':
        return {
          now: () => ({
            plusMinutes: jest.fn((x) => x),
            plusSeconds: jest.fn((x) => x),
          }),
        };
        break;
      case 'org.openhab.core.model.script.actions.ScriptExecution':
        return {
          createTimer,
        };
        break;
      case 'org.openhab.core.model.script.actions.Things':
        return {
          getThingStatusInfo: jest.fn(),
        };
      default:
        return {
          getLogger: () => ({
            info: logger,
          }),
        };
    }
  },
};

global.itemRegistry = {
  getItem: (item) => ({
    name: item,
    getState: jest.fn(() => {
      switch (item) {
        case PUMP_SWITCH_NAME:
          return pumpSwitchState;
          break;
        case 'ClimateSHT10Array_TemperatureZoneTest Zone':
          return currentTemp;
          break;
        case 'ClimateSHT10Array_HumidityZoneTest Zone':
          return currentHumid;
          break;
        case 'ClimateController_RelayTest Zone':
          return relayState;
          break;
        default:
          return `getItem ${item} getState`;
          break;
      }
    }),
  }),
};

const { zoneCheck } = require('../zonecheck');

function createFreshZone() {
  return {
    zoneName: 'Test Zone',
    desiredTemp: 75,
    desiredHumid: 90,
    relay: { getState: jest.fn(() => 'OFF'), name: 'relay' },
    fans: itemRegistry.getItem('ZoneDFans_Switch'),
    relayName: 'ClimateController_RelayTest Zone',
  };
}

describe('zonecheck', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a cycle timer', () => {
    const zone = createFreshZone();
    currentHumid = 50;
    currentTemp = 70;
    expect(zone.cycleTimer).not.toBeDefined();
    zoneCheck(zone);
    expect(zone.cycleTimer).toBeDefined();
    expect(zone.cycleTimer).not.toBeNull();
  });

  it('does not create timers if one is there', () => {
    const zone = createFreshZone();
    zone.cycleTimer = 'x';
    currentHumid = 50;
    zoneCheck(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('does not create timers if the humidity is too high', () => {
    const zone = createFreshZone();
    currentHumid = 91;
    zoneCheck(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('does not create a misterTimer if there already is one', () => {
    const zone = createFreshZone();
    currentHumid = 50;
    zone.mistTimer = 'x';
    zoneCheck(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('turns on the pump if its off when creating a mister', () => {
    const zone = createFreshZone();
    pumpSwitchState = global.OnOffType.OFF;
    currentHumid = 50;
    zoneCheck(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ name: PUMP_SWITCH_NAME }),
      'ON'
    );
  });

  it('shuts it off when its over humidity', () => {
    const zone = createFreshZone();
    zone.relay.getState = jest.fn(() => global.OnOffType.ON);
    currentHumid = 91;
    zoneCheck(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      zone.relay,
      global.OnOffType.OFF
    );
  });

  it('logs when in range', () => {
    const zone = createFreshZone();
    currentHumid = 90;
    zoneCheck(zone);
    expect(logger).toHaveBeenCalledWith(
      expect.stringMatching('Humidtiy in range')
    );
  });

  it('deletes the timer afterwards', () => {
    const zone = createFreshZone();
    currentHumid = 50;
    zoneCheck(zone);
    zone.cycleTimer.callback();
    expect(zone.cycleTimer).toBeNull();
  });

  it('recreates the timer after they have all timed out', () => {
    const zone = createFreshZone();
    currentHumid = 50;
    zoneCheck(zone);
    zone.cycleTimer.callback();
    zone.mistTimer.callback();
    zone.delayFanTimer.callback();
    zone.fanTimer.callback();
    zoneCheck(zone);
    expect(zone.cycleTimer).not.toBeNull();
  });
});
