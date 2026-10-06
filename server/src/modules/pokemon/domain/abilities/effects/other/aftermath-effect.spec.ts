import { AftermathEffect } from './aftermath-effect';
import { HitResult } from '../../../battle-events/hit-result';
import { AbilityRegistry } from '../../ability-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('AftermathEffect', () => {
  const createHit = (isContact: boolean): HitResult => ({
    damage: 10,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
  });

  const createStatus = (id: number, currentHp: number, maxHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

  const createContext = (battleRepository: IBattleRepository): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository,
    moveCategory: 'Physical',
  });

  it('接触技でひんしになったとき、攻撃側に最大HPの1/4のダメージを与える', async () => {
    // Arrange
    const effect = new AftermathEffect();
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;

    // Act
    const result = await effect.onDamagingHit(
      createStatus(1, 0, 100),
      createStatus(2, 200, 200),
      createHit(true),
      createContext(battleRepository),
    );

    // Assert
    expect(result).toBe('ゆうばく activated!');
    expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 150 });
  });

  it('接触技を受けてもひんしにならなかった場合、何もしない', async () => {
    // Arrange
    const effect = new AftermathEffect();
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;

    // Act
    const result = await effect.onDamagingHit(
      createStatus(1, 1, 100),
      createStatus(2, 200, 200),
      createHit(true),
      createContext(battleRepository),
    );

    // Assert
    expect(result).toBeNull();
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('接触しない技でひんしになった場合、何もしない', async () => {
    // Arrange
    const effect = new AftermathEffect();
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;

    // Act
    const result = await effect.onDamagingHit(
      createStatus(1, 0, 100),
      createStatus(2, 200, 200),
      createHit(false),
      createContext(battleRepository),
    );

    // Assert
    expect(result).toBeNull();
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('攻撃側の特性が しめりけ なら、ひんしになってもダメージを与えない', async () => {
    // Arrange
    const effect = new AftermathEffect();
    const battleRepository = {
      updateBattlePokemonStatus: jest.fn(),
    } as unknown as jest.Mocked<IBattleRepository>;
    const battleContext: BattleContext = {
      ...createContext(battleRepository),
      attackerAbilityName: 'しめりけ',
    };

    // Act
    const result = await effect.onDamagingHit(
      createStatus(1, 0, 100),
      createStatus(2, 200, 200),
      createHit(true),
      battleContext,
    );

    // Assert
    expect(result).toBeNull();
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('AbilityRegistryに「ゆうばく」として登録されている', () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('ゆうばく');

    // Assert
    expect(effect).toBeInstanceOf(AftermathEffect);
  });
});
