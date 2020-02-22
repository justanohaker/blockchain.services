import { Test, TestingModule } from '@nestjs/testing';
import { EthProvider } from './eth.provider';

describe('EthProvider', () => {
  let provider: EthProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EthProvider],
    }).compile();

    provider = module.get<EthProvider>(EthProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
