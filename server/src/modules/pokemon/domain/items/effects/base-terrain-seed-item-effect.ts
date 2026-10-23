import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyStatChanges } from '../../battle-events/stat-change';
import { consumeItem } from '../../battle-events/item-lookup';

/**
 * 決まったフィールドのときに使い、能力ランクを 1 段階上げる持ち物の基底クラス
 * エレキシード・グラスシード（防御）、ミストシード・サイコシード（特防）で使う
 *
 * - 場に出たとき（onEntry）と、場にいる間にフィールドが変わったとき（onTerrainChange）に、
 *   フィールドが合っていれば能力ランクを上げて、持ち物を使い切る（本家の useItem と同じく、上げたあとに消す）
 * - フィールドは最新のバトルで判定する
 * 注: 本家は、ランクがもう +6 で上がらなくても使い切る。ここでも同じく使い切る
 */
export abstract class BaseTerrainSeedItemEffect implements IItemEffect {
  /**
   * 使うフィールド
   */
  protected abstract readonly terrain: Field;

  /**
   * 上げる能力
   */
  protected abstract readonly statType: 'defense' | 'specialDefense';

  /**
   * 持ち物の名前（能力ランクを変えた原因として渡す）
   */
  protected abstract readonly itemName: string;

  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.activate(holder, battleContext);
  }

  async onTerrainChange(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.activate(holder, battleContext);
  }

  private async activate(
    holder: BattlePokemonStatus,
    battleContext: BattleContext | undefined,
  ): Promise<void> {
    const repository = battleContext?.battleRepository;
    if (!battleContext || !repository || holder.currentHp <= 0) {
      return;
    }
    const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
    if (battle.field !== this.terrain) {
      return;
    }
    await applyStatChanges(holder, [{ statType: this.statType, rankChange: 1 }], battleContext, {
      source: { pokemon: holder, kind: 'other', name: this.itemName },
    });
    const latest = (await repository.findBattlePokemonStatusById(holder.id)) ?? holder;
    await consumeItem(latest, battleContext);
  }
}

/**
 * エレキシード（Electric Seed）: エレキフィールドで防御 +1
 */
export class ElectricSeedEffect extends BaseTerrainSeedItemEffect {
  protected readonly terrain = Field.ElectricTerrain;
  protected readonly statType = 'defense';
  protected readonly itemName = 'エレキシード';
}

/**
 * グラスシード（Grassy Seed）: グラスフィールドで防御 +1
 */
export class GrassySeedEffect extends BaseTerrainSeedItemEffect {
  protected readonly terrain = Field.GrassyTerrain;
  protected readonly statType = 'defense';
  protected readonly itemName = 'グラスシード';
}

/**
 * ミストシード（Misty Seed）: ミストフィールドで特防 +1
 */
export class MistySeedEffect extends BaseTerrainSeedItemEffect {
  protected readonly terrain = Field.MistyTerrain;
  protected readonly statType = 'specialDefense';
  protected readonly itemName = 'ミストシード';
}

/**
 * サイコシード（Psychic Seed）: サイコフィールドで特防 +1
 */
export class PsychicSeedEffect extends BaseTerrainSeedItemEffect {
  protected readonly terrain = Field.PsychicTerrain;
  protected readonly statType = 'specialDefense';
  protected readonly itemName = 'サイコシード';
}
