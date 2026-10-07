import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { resolveTypeNames } from '@/modules/pokemon/domain/battle-events/battle-traits';
import { setTypes } from '@/modules/pokemon/domain/battle-events/type-change';

/**
 * ぎたい（Mimicry）特性の効果
 * 場に出たとき（onEntry）とフィールドが変わったとき（onTerrainChange）に、フィールドに合わせてタイプを変える
 * （本家の onStart → onTerrainChange）
 * - エレキフィールド→でんき、グラスフィールド→くさ、ミストフィールド→フェアリー、サイコフィールド→エスパー（setTypes）
 * - フィールドがなければ、タイプの上書き（typeOverride）と足されたタイプ（addedType）を消して、もとのタイプに戻す
 *   （本家の setType(baseSpecies.types)。みずびたしなどで変わったタイプも戻る。へんしん中なら、へんしん前のタイプに戻る）
 * - 今のタイプがすでに同じなら何もしない
 */
export class MimicryEffect implements IAbilityEffect {
  /**
   * フィールドごとのタイプ
   */
  private static readonly TERRAIN_TYPE_NAMES: ReadonlyMap<Field, string> = new Map([
    [Field.ElectricTerrain, 'でんき'],
    [Field.GrassyTerrain, 'くさ'],
    [Field.MistyTerrain, 'フェアリー'],
    [Field.PsychicTerrain, 'エスパー'],
  ]);

  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext) {
      return;
    }
    // 場に出たときのコンテキストのバトルは古いことがあるので、フィールドを読み直す
    const battle =
      (await battleContext.battleRepository?.findById(battleContext.battle.id)) ??
      battleContext.battle;
    await this.applyTerrainType(pokemon, battle.field, battleContext);
  }

  async onTerrainChange(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext) {
      return;
    }
    await this.applyTerrainType(
      holder,
      battleContext.field ?? battleContext.battle.field,
      battleContext,
    );
  }

  /**
   * フィールドに合わせてタイプを変える（フィールドがなければ、もとのタイプに戻す）
   */
  private async applyTerrainType(
    holder: BattlePokemonStatus,
    field: Field | null | undefined,
    battleContext: BattleContext,
  ): Promise<void> {
    const typeName = field ? MimicryEffect.TERRAIN_TYPE_NAMES.get(field) : undefined;
    if (typeName === undefined) {
      const { typeOverride, addedType } = holder.volatileState;
      if (!typeOverride && !addedType) {
        return;
      }
      await battleContext.battleRepository?.patchVolatileState(holder.id, {
        typeOverride: null,
        addedType: null,
      });
      return;
    }
    if ((await resolveTypeNames(holder, battleContext)).join() === typeName) {
      return;
    }
    await setTypes(holder, [typeName], battleContext);
  }
}
