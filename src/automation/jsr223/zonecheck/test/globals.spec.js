require('./fixtures/globals');

describe('globals', () => {
  it('getItems with regex returns the correct items', () => {
    expect(
      global.itemRegistry.getItems('Climate_Controller_Relay.*').toArray(),
    ).toHaveLength(4);
    expect(
      global.itemRegistry.getItems('ClimateSHT10Array_.*').toArray(),
    ).toHaveLength(2);
    expect(
      global.itemRegistry
        .getItems('Climate_Controller_Relay\\d{2}')
        .toArray()[0]
        .getName(),
    ).toEqual('Climate_Controller_Relay10');
  });
});
