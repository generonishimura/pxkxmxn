import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { MEGA_EVOLUTIONS } from '../logic/mega-evolutions';
import { CURRENT_REGULATION } from './current-regulation';
import { REGULATION_M_C } from './regulation-m-c';

describe('REGULATION_M_C', () => {
  /** 全国図鑑の最大の番号（DB の pokemons にある最大の番号） */
  const MAX_NATIONAL_DEX = 1025;

  it('使えるポケモンは、全国図鑑の番号で 231 種類（Serebii の M-A・M-B・M-C の追加分の和と、MetaVGC の一覧が同じ数）', () => {
    // Act
    const count = REGULATION_M_C.allowedNationalDex.size;

    // Assert
    expect(count).toBe(231);
  });

  it('使えるポケモンの全国図鑑の番号は、すべて 1〜1025 の整数', () => {
    // Act
    const outOfRange = [...REGULATION_M_C.allowedNationalDex].filter(
      dex => !Number.isInteger(dex) || dex < 1 || dex > MAX_NATIONAL_DEX,
    );

    // Assert
    expect(outOfRange).toEqual([]);
  });

  it.each([
    [812, 'ゴリランダー（M-C で追加）'],
    [998, 'セグレイブ（M-C で追加）'],
    [1000, 'サーフゴー（M-B で追加）'],
    [727, 'ガオガエン（M-A から）'],
    [670, 'フラエッテ（えいえんのはなだけ。DB はフォルムを分けないので番号で許す）'],
  ])('全国図鑑の %i（%s）は使える', dex => {
    // Act
    const allowed = REGULATION_M_C.allowedNationalDex.has(dex);

    // Assert
    expect(allowed).toBe(true);
  });

  it.each([
    [150, 'ミュウツー'],
    [1007, 'コライドン'],
    [1, 'フシギダネ（進化前）'],
  ])('全国図鑑の %i（%s）は使えない', dex => {
    // Act
    const allowed = REGULATION_M_C.allowedNationalDex.has(dex);

    // Assert
    expect(allowed).toBe(false);
  });

  it('使える持ち物は 166 個（持ち物 57・きのみ 28・メガストーン 81。Serebii と MetaVGC で同じ数）', () => {
    // Act
    const count = REGULATION_M_C.allowedItems.size;

    // Assert
    expect(count).toBe(166);
  });

  it('使える持ち物は、すべて ItemRegistry にあるか、MEGA_EVOLUTIONS のメガストーン', () => {
    // Arrange
    const known = new Set([
      ...ItemRegistry.names(),
      ...MEGA_EVOLUTIONS.map(mega => mega.stoneName),
    ]);

    // Act
    const unknown = [...REGULATION_M_C.allowedItems].filter(item => !known.has(item));

    // Assert
    expect(unknown).toEqual([]);
  });

  it('メガストーンのあるポケモンは、すべて使えるポケモンに入っている', () => {
    // Act
    const missing = MEGA_EVOLUTIONS.filter(
      mega => !REGULATION_M_C.allowedNationalDex.has(mega.nationalDex),
    ).map(mega => mega.speciesName);

    // Assert
    expect(missing).toEqual([]);
  });

  it('今のレギュレーションは M-C', () => {
    // Assert
    expect(CURRENT_REGULATION).toBe(REGULATION_M_C);
    expect(CURRENT_REGULATION.name).toBe('M-C');
  });
});
