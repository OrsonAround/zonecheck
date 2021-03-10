const {
  createTimer,
  logger,
  updateGlobalState,
  createFreshZone,
} = require('./fixtures/globals');

require('../index');

const zoneCheck = {};
require('../index').attach(zoneCheck);
require('../util').attach(zoneCheck);

const {
  allRelaysAreOff, getPump, pumpCheck, check, runCycle,
} = zoneCheck;

describe('zonecheck', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allRelaysAreOff true', () => {
    updateGlobalState('relayState1', global.OnOffType.OFF);
    updateGlobalState('relayState2', global.OnOffType.OFF);
    updateGlobalState('relayState9', global.OnOffType.OFF);
    updateGlobalState('relayState10', global.OnOffType.OFF);
    expect(allRelaysAreOff()).toBe(true);
  });

  it('allRelaysAreOff false', () => {
    updateGlobalState('relayState1', global.OnOffType.OFF);
    updateGlobalState('relayState2', global.OnOffType.ON);
    updateGlobalState('relayState9', global.OnOffType.OFF);
    updateGlobalState('relayState10', global.OnOffType.OFF);
    expect(allRelaysAreOff()).toBe(false);
  });

  it('gets the pump', () => {
    const pump = getPump();
    expect(getPump()).toEqual(
      expect.objectContaining({ name: 'Water_Pump_Switch' }),
    );
  });

  it('logs an error when there is no pump', () => {
    jest.spyOn(global.itemRegistry, 'getItem').mockImplementation(() => {
      throw new Error('not found');
    });
    getPump();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringMatching('not found'),
    );
    global.itemRegistry.getItem.mockRestore();
  });

  it('turns off the pump if all the relays are off', () => {
    updateGlobalState('relayState1', global.OnOffType.OFF);
    updateGlobalState('relayState2', global.OnOffType.OFF);
    updateGlobalState('relayState9', global.OnOffType.OFF);
    updateGlobalState('relayState10', global.OnOffType.OFF);
    updateGlobalState('pumpSwitchState', global.OnOffType.ON);
    pumpCheck();
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Water_Pump_Switch' }),
      global.OnOffType.OFF,
    );
  });

  it('leaves the pump alone if one of the relays is on', () => {
    updateGlobalState('relayState1', global.OnOffType.ON);
    updateGlobalState('relayState2', global.OnOffType.OFF);
    updateGlobalState('relayState9', global.OnOffType.OFF);
    updateGlobalState('relayState10', global.OnOffType.OFF);
    updateGlobalState('pumpSwitchState', global.OnOffType.ON);
    pumpCheck();
    expect(global.events.sendCommand).not.toHaveBeenCalled();
  });

  it('creates a cycle timer', () => {
    const zone = createFreshZone();
    updateGlobalState('currentTemp', global.OnOffType.OFF);
    expect(zone.cycleTimer).not.toBeDefined();
    check(zone);
    expect(zone.cycleTimer).toBeDefined();
    expect(zone.cycleTimer).not.toBeNull();
  });

  it('does not create timers if one is there', () => {
    const zone = createFreshZone();
    zone.cycleTimer = 'x';
    check(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('does not create timers if the humidity is too high', () => {
    const zone = createFreshZone();
    updateGlobalState('currentHumid', 91);
    check(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('does not create a misterTimer if there already is one', () => {
    const zone = createFreshZone();
    zone.mistTimer = 'x';
    check(zone);
    expect(createTimer).not.toHaveBeenCalled();
  });

  it('turns on the pump if its off when creating a mister', () => {
    const zone = createFreshZone();
    updateGlobalState('pumpSwitchState', global.OnOffType.OFF);
    check(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Water_Pump_Switch' }),
      global.OnOffType.ON,
    );
  });

  it('shuts it off when its over humidity', () => {
    const zone = createFreshZone();
    updateGlobalState('relayState1', global.OnOffType.ON);
    updateGlobalState('currentHumid', 91);
    check(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      zone.relay,
      global.OnOffType.OFF,
    );
  });

  it('logs when in range', () => {
    const zone = createFreshZone();
    updateGlobalState('currentHumid', 90);
    check(zone);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching('Humidtiy in range'),
    );
  });

  it('deletes the timer afterwards', () => {
    const zone = createFreshZone();
    check(zone);
    zone.cycleTimer.callback();
    expect(zone.cycleTimer).toBeNull();
  });

  it('recreates the timer after they have all timed out', () => {
    const zone = createFreshZone();
    check(zone);
    zone.cycleTimer.callback();
    zone.mistTimer.callback();
    zone.delayFanTimer.callback();
    zone.fanTimer.callback();
    check(zone);
    expect(zone.cycleTimer).not.toBeNull();
  });

  describe('runCycle', () => {
    it('calls zoneCheck four times', () => {
      jest.spyOn(zoneCheck, 'check').mockImplementation(() => {});
      const fakeGlobal = {};
      updateGlobalState('relayState1', global.OnOffType.ON);
      updateGlobalState('relayState2', global.OnOffType.ON);
      updateGlobalState('relayState9', global.OnOffType.ON);
      updateGlobalState('relayState10', global.OnOffType.ON);
      runCycle(fakeGlobal);
      expect(fakeGlobal.zones.length).toEqual(4);
      expect(zoneCheck.check).toHaveBeenCalledTimes(4);
      zoneCheck.check.mockRestore();
    });
    it('calls zoneCheck three times if one is off', () => {
      jest.spyOn(zoneCheck, 'check').mockImplementation(() => {});
      const fakeGlobal = {};
      updateGlobalState('relayState1', global.OnOffType.OFF);
      updateGlobalState('relayState2', global.OnOffType.ON);
      updateGlobalState('relayState9', global.OnOffType.ON);
      updateGlobalState('relayState10', global.OnOffType.ON);
      runCycle(fakeGlobal);
      expect(fakeGlobal.zones.length).toEqual(4);
      expect(zoneCheck.check).toHaveBeenCalledTimes(3);
      zoneCheck.check.mockRestore();
    });
  });
});
