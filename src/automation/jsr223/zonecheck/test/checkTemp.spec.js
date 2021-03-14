const {
  logger,
  createFreshZone,
  updateGlobalState,
} = require('./fixtures/globals');

const zoneCheck = {};
const { checkTemp } = require('../checkTemp').attach(zoneCheck);

describe('checkTemp', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs out the current temp', () => {
    const zone = createFreshZone();
    zone.temperature = 33;
    updateGlobalState('EnviroPlus_Temperature', 44.4);
    checkTemp(zone);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Temperature: 33 °F'),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('EnviroPlus Temperature: 44.4 °F'),
    );
  });

  it('logs out temp too low', () => {
    const zone = createFreshZone();
    zone.temperature = 33;
    zone.desiredTemp = 44;
    checkTemp(zone);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('too low'),
    );
  });

  it('turns on the space heater if too low in ZE', () => {
    const zone = createFreshZone();
    zone.temperature = 33;
    zone.desiredTemp = 44;
    zone.zoneName = 'ZE';
    checkTemp(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      'ZALL_SpaceHeater',
      global.OnOffType.ON,
    );
  });

  it('logs temp too high', () => {
    const zone = createFreshZone();
    zone.temperature = 55;
    zone.desiredTemp = 44;
    checkTemp(zone);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('too high'),
    );
  });

  it('turns off the space heater if too high in ZE', () => {
    const zone = createFreshZone();
    zone.temperature = 55;
    zone.desiredTemp = 44;
    zone.zoneName = 'ZE';
    checkTemp(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      'ZALL_SpaceHeater',
      global.OnOffType.OFF,
    );
  });
});
