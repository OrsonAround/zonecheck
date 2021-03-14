const {
  logger,
  updateGlobalState,
  updateGlobalStateItemType,
} = require('./fixtures/globals');

require('../index');

const zoneCheck = {};
require('../util').attach(zoneCheck);

const {
  allRelaysAreOff, getPump, pumpCheck, camelize,
} = zoneCheck;

describe('zonecheck utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('camelize', () => {
    expect(camelize('Child')).toEqual('child');
    expect(camelize('FanSwitch')).toEqual('fanSwitch');
    expect(camelize('oneTwoThree')).toEqual('oneTwoThree');
  });

  it('allRelaysAreOff true', () => {
    updateGlobalState('ZA_Relay', global.OnOffType.OFF);
    updateGlobalState('ZB_Relay', global.OnOffType.OFF);
    expect(allRelaysAreOff()).toBe(true);
  });

  it('allRelaysAreOff false', () => {
    updateGlobalState('ZA_Relay', global.OnOffType.ON);
    updateGlobalState('ZB_Relay', global.OnOffType.OFF);
    expect(allRelaysAreOff()).toBe(false);
  });

  it('gets the pump', () => {
    expect(getPump()).toEqual(
      expect.objectContaining({ name: 'ZALL_WaterPump' }),
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
    updateGlobalState('ZA_Relay', global.OnOffType.OFF);
    updateGlobalState('ZB_Relay', global.OnOffType.OFF);
    updateGlobalState('ZALL_WaterPump', global.OnOffType.ON);
    pumpCheck();
    expect(global.events.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ZALL_WaterPump' }),
      global.OnOffType.OFF,
    );
  });

  it('leaves the pump alone if one of the relays is on', () => {
    updateGlobalState('ZA_Relay', global.OnOffType.ON);
    updateGlobalState('ZB_Relay', global.OnOffType.OFF);
    updateGlobalState('ZALL_WaterPump', global.OnOffType.ON);
    pumpCheck();
    expect(global.events.sendCommand).not.toHaveBeenCalled();
  });

  it('allRelaysAreOff throws an error when there are no relays', () => {
    const items = global.itemRegistry.getItemsByTagAndType('Switch', 'Relay');
    items.forEach((x) => {
      updateGlobalStateItemType(x.getName(), 'NotSwitch');
    });
    expect(allRelaysAreOff).toThrow('no registry items matched');

    items.forEach((x) => {
      updateGlobalStateItemType(x.getName(), 'Switch');
    });
  });
});
