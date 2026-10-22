import { FlareBlitzEffect } from './flare-blitz-effect';
import { VoltTackleEffect } from './volt-tackle-effect';
import { WaveCrashEffect } from './wave-crash-effect';
import { MoveRegistry } from '../move-registry';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { IMoveEffect } from '../move-effect.interface';
import { createBattlePokemonStatus, createBattleContext } from './__tests__/test-helpers';

/**
 * 反動ダメージ + 状態異常の追加効果をもつ技（フレアドライブ・ボルテッカー）と、
 * 反動のみのウェーブタックルの検証
 */
describe('反動つき技の効果', () => {
  let attacker: BattlePokemonStatus;
  let defender: BattlePokemonStatus;
  let repo: jest.Mocked<IBattleRepository>;

  beforeAll(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  const createStatusContext = (): BattleContext => ({
    ...createBattleContext({ battleRepository: repo }),
    trainedPokemonRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 2,
        pokemon: { id: 1, primaryType: { name: 'ノーマル' }, secondaryType: null },
        ability: null,
      }),
    } as unknown as BattleContext['trainedPokemonRepository'],
  });

  beforeEach(() => {
    attacker = createBattlePokemonStatus({
      id: 1,
      trainedPokemonId: 1,
      trainerId: 1,
      currentHp: 100,
      maxHp: 100,
    });
    defender = createBattlePokemonStatus({ id: 2, trainedPokemonId: 2, trainerId: 2 });
    repo = {
      findBattlePokemonStatusById: jest.fn().mockResolvedValue({ ...attacker, currentHp: 100 }),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(attacker),
    } as unknown as jest.Mocked<IBattleRepository>;
  });

  const cases: { name: string; effect: IMoveEffect }[] = [
    { name: 'フレアドライブ', effect: new FlareBlitzEffect() },
    { name: 'ボルテッカー', effect: new VoltTackleEffect() },
    { name: 'ウェーブタックル', effect: new WaveCrashEffect() },
  ];

  describe.each(cases)('$name', ({ effect }) => {
    it('hasRecoil が true（すてみの対象）', () => {
      expect(effect.hasRecoil).toBe(true);
    });

    it('与えたダメージの33/100を四捨五入して反動を受ける', async () => {
      const ctx = createBattleContext({ battleRepository: repo });
      const result = await effect.afterDamage!(attacker, defender, 50, ctx); // 16.5 -> 17
      expect(repo.updateBattlePokemonStatus).toHaveBeenCalledWith(1, { currentHp: 83 });
      expect(result).toBe('反動で17ダメージを受けた');
    });

    it('1/3 ではなく 33/100 で計算する', async () => {
      const ctx = createBattleContext({ battleRepository: repo });
      await effect.afterDamage!(attacker, defender, 152, ctx); // 50.16 -> 50
      expect(repo.updateBattlePokemonStatus).toHaveBeenCalledWith(1, { currentHp: 50 });
    });

    it('ダメージが0なら反動を受けない', async () => {
      const ctx = createBattleContext({ battleRepository: repo });
      const result = await effect.afterDamage!(attacker, defender, 0, ctx);
      expect(result).toBeNull();
      expect(repo.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('いしあたま・マジックガードなら反動を受けない', async () => {
      for (const abilityName of ['いしあたま', 'マジックガード']) {
        const ctx: BattleContext = {
          ...createBattleContext({ battleRepository: repo }),
          attackerAbilityName: abilityName,
        };
        const result = await effect.afterDamage!(attacker, defender, 90, ctx);
        expect(result).toBeNull();
      }
      expect(repo.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });

  describe('状態異常の追加効果が残っている', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('フレアドライブは10%でやけどを付与する', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const ctx = createStatusContext();
      const result = await new FlareBlitzEffect().onHit!(attacker, defender, ctx);
      expect(result).toContain('was burned!');
      expect(repo.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        statusCondition: StatusCondition.Burn,
      });
    });

    it('ボルテッカーは10%でまひを付与する', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const ctx = createStatusContext();
      const result = await new VoltTackleEffect().onHit!(attacker, defender, ctx);
      expect(result).toContain('was paralyzed!');
      expect(repo.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        statusCondition: StatusCondition.Paralysis,
      });
    });

    it('確率外なら付与しない', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const ctx = createStatusContext();
      expect(await new FlareBlitzEffect().onHit!(attacker, defender, ctx)).toBeNull();
    });
  });

  it('ウェーブタックルがレジストリに登録されている', () => {
    expect(MoveRegistry.get('ウェーブタックル')).toBeInstanceOf(WaveCrashEffect);
  });
});
