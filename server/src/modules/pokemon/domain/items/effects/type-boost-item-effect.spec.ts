import { ItemRegistry } from '../item-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('タイプの技を強くする持ち物', () => {
  const holder = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const contextFor = (moveTypeName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  beforeEach(() => {
    ItemRegistry.initialize();
  });

  // 持ち物の名前（PokeAPI の ja-Hrkt 名）と、威力を上げる技のタイプ
  const items: ReadonlyArray<readonly [string, string]> = [
    ['くろおび', 'かくとう'],
    ['くろいメガネ', 'あく'],
    ['もくたん', 'ほのお'],
    ['りゅうのキバ', 'ドラゴン'],
    ['ようせいのハネ', 'フェアリー'],
    ['かたいいし', 'いわ'],
    ['じしゃく', 'でんき'],
    ['メタルコート', 'はがね'],
    ['きせきのタネ', 'くさ'],
    ['しんぴのしずく', 'みず'],
    ['とけないこおり', 'こおり'],
    ['どくバリ', 'どく'],
    ['するどいくちばし', 'ひこう'],
    ['シルクのスカーフ', 'ノーマル'],
    ['ぎんのこな', 'むし'],
    ['やわらかいすな', 'じめん'],
    ['のろいのおふだ', 'ゴースト'],
    ['まがったスプーン', 'エスパー'],
  ];

  it.each(items)('%s は %sタイプの技の威力を 1.2 倍（4915/4096）にする', (itemName, typeName) => {
    // Arrange
    const effect = ItemRegistry.get(itemName);

    // Act
    const power = effect?.modifyBasePower?.(holder, 100, contextFor(typeName));

    // Assert
    expect(power).toBe(120);
  });

  it.each(items)('%s は %sタイプ以外の技の威力を変えない', (itemName, typeName) => {
    // Arrange
    const effect = ItemRegistry.get(itemName);
    const otherType = typeName === 'ノーマル' ? 'ほのお' : 'ノーマル';

    // Act
    const power = effect?.modifyBasePower?.(holder, 100, contextFor(otherType));

    // Assert
    expect(power).toBeUndefined();
  });
});
