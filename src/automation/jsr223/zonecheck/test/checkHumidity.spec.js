const { logger, createFreshZone } = require('./fixtures/globals');

const zoneCheck = {};
const {
  checkHumidity,
  onHumidityTooLow,
  createCycleTimer,
  createFanTimer,
  createDelayFanTimer,
  createMistTimer,
} = require('../checkHumidity').attach(zoneCheck);

describe('checkHumidity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loggs in range', () => {
    const zone = createFreshZone();
    zone.humidity = 33;
    zone.desiredHumid = 33;
    checkHumidity(zone);
    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching('in range'));
  });

  it('calls onHumidityTooLow if too low', () => {
    const spy = jest.spyOn(zoneCheck, 'onHumidityTooLow');
    const zone = createFreshZone();
    zone.humidity = 22;
    zone.desiredHumid = 33;
    checkHumidity(zone);
    expect(spy).toHaveBeenCalled();
  });
  it('turns off the relay when humidity too high', () => {
    const zone = createFreshZone();
    zone.humidity = 44;
    zone.desiredHumid = 33;
    zone.relay = true;
    checkHumidity(zone);
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      'TZ_Relay',
      global.OnOffType.OFF,
    );
  });
  describe('onHumidityTooLow', () => {
    it('skips if it does not need a cycle', () => {
      const spy = jest.spyOn(zoneCheck, 'createCycleTimer');
      const zone = createFreshZone();
      zone.cycleTimer = 'hello';
      onHumidityTooLow(zone);
      expect(spy).not.toHaveBeenCalled();
    });

    it('turns on the relays and the waterpumps', () => {
      const zone = createFreshZone();
      onHumidityTooLow(zone);

      expect(global.events.sendCommand).toHaveBeenCalledWith(
        'TZ_Relay',
        global.OnOffType.ON,
      );
      expect(global.events.sendCommand).toHaveBeenCalledWith(
        'ZALL_WaterPump',
        global.OnOffType.ON,
      );
    });

    it('attaches a cycleTimer and a mistTimer', () => {
      const zone = createFreshZone();
      onHumidityTooLow(zone);
      expect(zone.cycleTimer).not.toBeNull();
      expect(zone.mistTimer).not.toBeNull();
    });

    it('shuts off the fans if there is cool fan running', () => {
      const cancel = jest.fn();
      const zone = createFreshZone();
      zone.coolFansTimer = { cancel };
      onHumidityTooLow(zone);
      expect(cancel).toHaveBeenCalled();
      expect(global.events.sendCommand).toHaveBeenCalledWith(
        'TZ_FanSwitch',
        global.OnOffType.OFF,
      );
    });
  });

  describe('Timers', () => {
    it('createCycleTimer deletes its reference', () => {
      const zone = createFreshZone();
      createCycleTimer(zone);
      zone.cycleTimer.callback();
      expect(zone.cycleTimer).toBeNull();
    });

    it('turns off the fan after fan timer', () => {
      const zone = createFreshZone();
      createFanTimer(zone);
      zone.fanTimer.callback();
      expect(zone.fanTimer).toBeNull();
      expect(global.events.sendCommand).toHaveBeenCalledWith(
        'TZ_FanSwitch',
        global.OnOffType.OFF,
      );
    });

    it('turns on the fan after delay fan timer', () => {
      const zone = createFreshZone();
      createDelayFanTimer(zone);
      zone.delayFanTimer.callback();
      expect(zone.delayFanTimer).toBeNull();
      expect(global.events.sendCommand).toHaveBeenCalledWith(
        'TZ_FanSwitch',
        global.OnOffType.ON,
      );
    });

    it('turns on the relay and a fan delay with the mister timer', () => {
      const spy = jest.spyOn(zoneCheck, 'createDelayFanTimer');
      const zone = createFreshZone();
      createMistTimer(zone);
      zone.mistTimer.callback();
      expect(zone.mistTimer).toBeNull();
      expect(global.events.sendCommand).toHaveBeenCalledWith(
        'TZ_Relay',
        global.OnOffType.OFF,
      );
      expect(spy).toHaveBeenCalled();
    });
  });
});
