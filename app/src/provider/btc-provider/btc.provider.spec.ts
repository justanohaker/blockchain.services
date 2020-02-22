import { Test, TestingModule } from '@nestjs/testing';
import { BtcProvider } from './btc.provider';

describe('BtcProvider', () => {
  let provider: BtcProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BtcProvider],
    }).compile();

    provider = module.get<BtcProvider>(BtcProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
