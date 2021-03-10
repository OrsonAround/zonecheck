const {
  logger,
  createFreshZone,
  updateGlobalState,
} = require('./fixtures/globals');

const zoneCheck = {};
const { checkTemp } = require('../checkTemp').attach(zoneCheck);

describe('checkTemp', () => {
  it('logs out the current temp', () => {
    const zone = createFreshZone();
    updateGlobalState('currentTemp', 33);
    checkTemp(zone);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Current Temperature: 33'),
    );
  });
});
