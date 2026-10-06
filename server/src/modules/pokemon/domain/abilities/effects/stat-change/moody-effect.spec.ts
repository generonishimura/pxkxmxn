import { MoodyEffect } from './moody-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('MoodyEffect', () => {
  type Ranks = {
    attack?: number;
    defense?: number;
    specialAttack?: number;
    specialDefense?: number;
    speed?: number;
  };

  const createPokemon = (ranks: Ranks = {}): BattlePokemonStatus =>
    new BattlePokemonStatus(
      1,
      1,
      1,
      1,
      true,
      100,
      100,
      ranks.attack ?? 0,
      ranks.defense ?? 0,
      ranks.specialAttack ?? 0,
      ranks.specialDefense ?? 0,
      ranks.speed ?? 0,
      0,
      0,
      null,
    );

  const createCtx = (): BattleContext => {
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle,
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  it('ターン終了時にランダムな能力を +2、別の能力を -1 する', async () => {
    // Arrange: 乱数 0 → 上げる候補の先頭（攻撃）、下げる候補の先頭（防御）
    const effect = new MoodyEffect(() => 0);
    const pokemon = createPokemon();
    const ctx = createCtx();

    // Act
    await effect.onTurnEnd(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      attackRank: 2,
      defenseRank: -1,
    });
  });

  it('乱数に応じて上げる能力と下げる能力を選ぶ', async () => {
    // Arrange: 乱数 0.99 → 上げる候補の末尾（素早さ）、下げる候補の末尾（特防）
    const effect = new MoodyEffect(() => 0.99);
    const pokemon = createPokemon();
    const ctx = createCtx();

    // Act
    await effect.onTurnEnd(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      speedRank: 2,
      specialDefenseRank: -1,
    });
  });

  it('+6 の能力は上げる候補から外す', async () => {
    // Arrange
    const effect = new MoodyEffect(() => 0);
    const pokemon = createPokemon({ attack: 6 });
    const ctx = createCtx();

    // Act
    await effect.onTurnEnd(pokemon, ctx);

    // Assert: 防御が +2、下げる候補の先頭は攻撃
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      defenseRank: 2,
      attackRank: 5,
    });
  });

  it('-6 の能力は下げる候補から外す', async () => {
    // Arrange
    const effect = new MoodyEffect(() => 0);
    const pokemon = createPokemon({ defense: -6 });
    const ctx = createCtx();

    // Act
    await effect.onTurnEnd(pokemon, ctx);

    // Assert: 攻撃 +2、防御は -6 なので特攻が -1
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      attackRank: 2,
      specialAttackRank: -1,
    });
  });

  it('上昇後のランクは +6 で止める', async () => {
    // Arrange
    const effect = new MoodyEffect(() => 0);
    const pokemon = createPokemon({ attack: 5 });
    const ctx = createCtx();

    // Act
    await effect.onTurnEnd(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      attackRank: 6,
      defenseRank: -1,
    });
  });

  it('全能力が +6 なら下げるだけ', async () => {
    // Arrange
    const effect = new MoodyEffect(() => 0);
    const pokemon = createPokemon({
      attack: 6,
      defense: 6,
      specialAttack: 6,
      specialDefense: 6,
      speed: 6,
    });
    const ctx = createCtx();

    // Act
    await effect.onTurnEnd(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      attackRank: 5,
    });
  });

  it('全能力が -6 なら上げるだけ', async () => {
    // Arrange
    const effect = new MoodyEffect(() => 0);
    const pokemon = createPokemon({
      attack: -6,
      defense: -6,
      specialAttack: -6,
      specialDefense: -6,
      speed: -6,
    });
    const ctx = createCtx();

    // Act
    await effect.onTurnEnd(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(pokemon.id, {
      attackRank: -4,
    });
  });

  it('battleRepository が無い場合は何もしない', async () => {
    // Arrange
    const effect = new MoodyEffect(() => 0);
    const pokemon = createPokemon();
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    // Act & Assert
    await expect(effect.onTurnEnd(pokemon, ctx)).resolves.toBeUndefined();
  });
});
