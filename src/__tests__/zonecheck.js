const createTimer = jest.fn(() => 'timer');

global.Java = {
  type: (x) => {
    switch (x) {
      case 'java.time.ZonedDateTime':
        return {
          now: () => ({
            plusMinutes: jest.fn(),
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
            info: jest.fn(), // console.log,
          }),
        };
    }
  },
};
global.itemRegistry = {
  getItem: (item) => ({ getState: jest.fn(() => `item state for ${item}`) }),
};

global.events = {
  sendCommand: jest.fn(),
};

global.ZonedDateTime = {
  now: jest.fn(),
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
    relay: { getState: jest.fn(() => 'OFF') },
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
});
