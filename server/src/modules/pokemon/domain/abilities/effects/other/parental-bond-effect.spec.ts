import { ParentalBondEffect } from './parental-bond-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ParentalBondEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (
    moveName: string,
    moveCategory: 'Physical' | 'Special' | 'Status' = 'Physical',
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveName,
    moveCategory,
  });

  let effect: ParentalBondEffect;

  beforeEach(() => {
    effect = new ParentalBondEffect();
  });

  it('物理技にダメージ0.25倍の追加ヒットを1回加える', () => {
    // Act
    const result = effect.getAdditionalHitDamageRatios(pokemon, createCtx('のしかかり'));

    // Assert
    expect(result).toEqual([0.25]);
  });

  it('特殊技にも追加ヒットを加える', () => {
    // Act
    const result = effect.getAdditionalHitDamageRatios(
      pokemon,
      createCtx('ハイパーボイス', 'Special'),
    );

    // Assert
    expect(result).toEqual([0.25]);
  });

  it('変化技には追加ヒットを加えない', () => {
    // Act
    const result = effect.getAdditionalHitDamageRatios(
      pokemon,
      createCtx('つるぎのまい', 'Status'),
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it.each([
    'だいばくはつ',
    'じばく',
    'ミストバースト',
    'いのちがけ',
    'がむしゃら',
    'なげつける',
    'ころがる',
    'アイスボール',
    'さわぐ',
  ])('2回当たらない技（%s）には追加ヒットを加えない', moveName => {
    // Act
    const result = effect.getAdditionalHitDamageRatios(pokemon, createCtx(moveName));

    // Assert
    expect(result).toBeUndefined();
  });

  it.each([
    'ソーラービーム',
    'ソーラーブレード',
    'そらをとぶ',
    'あなをほる',
    'ダイビング',
    'とびはねる',
    'ゴーストダイブ',
    'シャドーダイブ',
    'フリーフォール',
    'ロケットずつき',
    'ゴッドバード',
    'かまいたち',
    'フリーズボルト',
    'コールドフレア',
    'メテオビーム',
    'エレクトロビーム',
  ])('ためる技（%s）には追加ヒットを加えない', moveName => {
    // Act
    const result = effect.getAdditionalHitDamageRatios(pokemon, createCtx(moveName));

    // Assert
    expect(result).toBeUndefined();
  });

  it.each(['みらいよち', 'はめつのねがい'])(
    '時間差で当たる技（%s）には追加ヒットを加えない',
    moveName => {
      // Act
      const result = effect.getAdditionalHitDamageRatios(pokemon, createCtx(moveName, 'Special'));

      // Assert
      expect(result).toBeUndefined();
    },
  );

  it('コンテキストがない場合は追加ヒットを加えない', () => {
    // Act
    const result = effect.getAdditionalHitDamageRatios(pokemon, undefined);

    // Assert
    expect(result).toBeUndefined();
  });
});
