const {
  logger,
  updateGlobalState,
  createFreshZone,
  Things,
} = require('./fixtures/globals');

require('../index');

const zoneCheck = {};
require('../index').attach(zoneCheck);
require('../util').attach(zoneCheck);

const {
  check,
  runCycle,
  addPropertiesToZone,
  checkRequiredThings,
  adaptPropertyValue,
} = zoneCheck;

describe('zonecheck', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runCycle', () => {
    it('calls zoneCheck four times', () => {
      jest.spyOn(zoneCheck, 'check').mockImplementation(() => {});
      const fakeGlobal = {};
      updateGlobalState('ZA_Enabled', global.OnOffType.ON);
      updateGlobalState('ZB_Enabled', global.OnOffType.ON);
      updateGlobalState('ZC_Enabled', global.OnOffType.ON);
      updateGlobalState('ZD_Enabled', global.OnOffType.ON);
      updateGlobalState('ZE_Enabled', global.OnOffType.ON);
      runCycle(fakeGlobal);
      expect(fakeGlobal.zones.length).toEqual(5);
      expect(zoneCheck.check).toHaveBeenCalledTimes(5);
      zoneCheck.check.mockRestore();
    });

    it('calls zoneCheck three times if one is off', () => {
      jest.spyOn(zoneCheck, 'check').mockImplementation(() => {});
      const fakeGlobal = {};
      updateGlobalState('ZA_Enabled', global.OnOffType.OFF);
      updateGlobalState('ZB_Enabled', global.OnOffType.ON);
      updateGlobalState('ZC_Enabled', global.OnOffType.ON);
      updateGlobalState('ZD_Enabled', global.OnOffType.ON);
      updateGlobalState('ZE_Enabled', global.OnOffType.ON);
      runCycle(fakeGlobal);
      expect(fakeGlobal.zones.length).toEqual(5);
      expect(zoneCheck.check).toHaveBeenCalledTimes(4);
      zoneCheck.check.mockRestore();
    });
  });

  describe('check', () => {
    it('checks the pump', () => {
      const pumpCheckSpy = jest.spyOn(zoneCheck, 'pumpCheck');
      const zone = createFreshZone();
      check(zone);
      expect(pumpCheckSpy).toHaveBeenCalled();
    });
  });

  describe('addPropertiesToZone', () => {
    it('adds a property to a zone', () => {
      const zone = createFreshZone();
      addPropertiesToZone(zone);
      expect('enabled' in zone).toBe(true);
      expect('waterPump' in zone).toBe(true);
    });
  });

  it('does not warn for an online item', () => {
    Things.getThingStatusInfo = jest.fn((name) => {
      if (name === 'zigbee:device:984e3b3df4:60a423fffe98d486') {
        return {
          getStatus: () => 'ONLINE',
        };
      }
      return false;
    });
    checkRequiredThings();
    expect(logger.warn).toHaveBeenCalledTimes(5);
  });

  it('converts prop values nicely', () => {
    let testVal = 'NULL';
    let testType = 'Switch';
    const item = {
      getState: () => testVal,
      getType: () => testType,
    };
    expect(adaptPropertyValue(item)).toBeNull();
    testVal = 'ON';
    testType = 'Switch';
    expect(adaptPropertyValue(item)).toBe(true);
    testVal = '9.99';
    testType = 'Number';
    expect(adaptPropertyValue(item)).toBe(9.99);
    testVal = '9.99';
    testType = 'String';
    expect(adaptPropertyValue(item)).toBe('9.99');
  });
});
