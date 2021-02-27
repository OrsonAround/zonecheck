const createTimer = jest.fn((timeout, callback) => ({
  timeout,
  callback,
}));
const logger = jest.fn();

let pumpSwitchState = 'OFF';
const PUMP_SWITCH_NAME = 'Water_Pump_Switch';

global.Java = {
  type: (x) => {
    switch (x) {
      case 'java.time.ZonedDateTime':
        return {
          now: () => ({
            plusMinutes: jest.fn((x) => x),
          }),
        };
        break;
      case 'org.openhab.core.model.script.actions.ScriptExecution':
        return {
          createTimer,
        };
        break;
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
    getState: () => {
      switch (item) {
        case PUMP_SWITCH_NAME:
          return pumpSwitchState;
          break;
        default:
          return `getItem ${item} getState`;
          break;
      }
    },
  }),
};

global.events = {
  sendCommand: jest.fn(),
};

const { zoneCheck } = require('../zonecheck');

function createFreshZone() {
  return {
    zoneName: 'Test Zone',
    desiredTemp: 75,
    desiredHumid: 90,
    currentTemp: itemRegistry
      .getItem('ClimateSHT10Array_TemperatureZoneD')
      .getState(),
    currentHumid: jest.fn(),
    relay: { getState: jest.fn(() => 'OFF'), name: 'relay' },
    fans: itemRegistry.getItem('ZoneDFans_Switch'),
  };
}

describe('zonecheck', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a cycle timer', () => {
    const zone = createFreshZone();
    zone.currentHumid = 50;
    expect(zone.cycleTimer).not.toBeDefined();
    zoneCheck(zone);
    expect(zone.cycleTimer).toBeDefined();
    expect(zone.cycleTimer).not.toBeNull();
  });

  it('does not create timers if one is there', () => {
    const zone = createFreshZone();
    zone.cycleTimer = 'x';
    zone.currentHumid = 50;
    zoneCheck(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('does not create timers if the humidity is too high', () => {
    const zone = createFreshZone();
    zone.currentHumid = 91;
    zoneCheck(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('does not create a misterTimer if there already is one', () => {
    const zone = createFreshZone();
    zone.currentHumid = 50;
    zone.mistTimer = 'x';
    zoneCheck(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('turns on the pump if its off when creating a mister', () => {
    const zone = createFreshZone();
    pumpSwitchState = 'OFF';
    zone.currentHumid = 50;
    zoneCheck(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ name: PUMP_SWITCH_NAME }),
      'ON'
    );
  });

  it('shuts it off when its over humidity', () => {
    const zone = createFreshZone();
    zone.relay.getState = jest.fn(() => 'ON');
    zone.currentHumid = 91;
    zoneCheck(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(zone.relay, 'OFF');
  });

  it('logs when in range', () => {
    const zone = createFreshZone();
    zone.currentHumid = 90;
    zoneCheck(zone);
    expect(logger).toHaveBeenCalledWith(
      expect.stringMatching('Humidtiy in range')
    );
  });

  it('deletes the timer afterwards', () => {
    const zone = createFreshZone();
    zone.currentHumid = 50;
    zoneCheck(zone);
    zone.cycleTimer.callback();
    expect(zone.cycleTimer).toBeNull();
  });

  it('recreates the timer after they have all timed out', () => {
    const zone = createFreshZone();
    zone.currentHumid = 50;
    zoneCheck(zone);
    zone.cycleTimer.callback();
    zone.mistTimer.callback();
    zone.fanTimer.callback();
    zoneCheck(zone);
    expect(zone.cycleTimer).not.toBeNull();
  });
});
