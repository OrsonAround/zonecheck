require('./fixtures/globals');

describe('globals', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getItems with regex returns the correct items', () => {
    expect(
      global.itemRegistry.getItems('Z[A-E]_Enabled').toArray(),
    ).toHaveLength(5);
    expect(
      global.itemRegistry.getItems('ClimateSHT10Array_.*').toArray(),
    ).toHaveLength(2);
    expect(
      global.itemRegistry
        .getItems('ClimateControl_Relay\\d{2}')
        .toArray()[0]
        .getName(),
    ).toEqual('ClimateControl_Relay10');
  });
});
