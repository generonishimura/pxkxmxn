import { IItemEffect } from './item-effect.interface';
import { CharcoalEffect } from './effects/charcoal-effect';
import { LeftoversEffect } from './effects/leftovers-effect';
import { TYPE_BOOST_ITEMS, TypeBoostItemEffect } from './effects/type-boost-item-effect';
import { CategoryBoostItemEffect } from './effects/category-boost-item-effect';
import { ExpertBeltEffect } from './effects/expert-belt-effect';
import { LifeOrbEffect } from './effects/life-orb-effect';
import { MetronomeItemEffect } from './effects/metronome-item-effect';
import { NormalGemEffect } from './effects/normal-gem-effect';
import { LightBallEffect } from './effects/light-ball-effect';
import {
  BrightPowderEffect,
  WideLensEffect,
  ZoomLensEffect,
} from './effects/accuracy-boost-item-effect';
import { LeekEffect, ScopeLensEffect } from './effects/critical-hit-item-effect';
import { FocusSashEffect } from './effects/focus-sash-effect';
import { FocusBandEffect } from './effects/focus-band-effect';
import { RockyHelmetEffect } from './effects/rocky-helmet-effect';
import { KingsRockEffect } from './effects/kings-rock-effect';
import { ShellBellEffect } from './effects/shell-bell-effect';
import { AirBalloonEffect } from './effects/air-balloon-effect';
import { EjectButtonEffect } from './effects/eject-button-effect';
import { RedCardEffect } from './effects/red-card-effect';
// 素早さ・場の状態・交代の持ち物（Issue #264 一部）
import { ChoiceScarfEffect } from './effects/choice-scarf-effect';
import { QuickClawEffect } from './effects/quick-claw-effect';
import { IronBallEffect } from './effects/iron-ball-effect';
import { LightClayEffect } from './effects/light-clay-effect';
import {
  DampRockEffect,
  HeatRockEffect,
  IcyRockEffect,
  SmoothRockEffect,
} from './effects/base-weather-rock-item-effect';
import { TerrainExtenderEffect } from './effects/terrain-extender-effect';
import { BigRootEffect } from './effects/big-root-effect';
import { BindingBandEffect } from './effects/binding-band-effect';
import {
  ElectricSeedEffect,
  GrassySeedEffect,
  MistySeedEffect,
  PsychicSeedEffect,
} from './effects/base-terrain-seed-item-effect';
import { ShedShellEffect } from './effects/shed-shell-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { StatusCureBerryEffect } from './effects/status-cure-berry-effect';
import { createOranBerryEffect, createSitrusBerryEffect } from './effects/hp-restore-berry-effect';
import { LeppaBerryEffect } from './effects/leppa-berry-effect';
import { ResistBerryEffect } from './effects/resist-berry-effect';

/**
 * 効果抜群の技のダメージを半分にするきのみと、そのタイプ
 */
const SUPER_EFFECTIVE_RESIST_BERRIES: ReadonlyArray<readonly [string, string]> = [
  ['オッカのみ', 'ほのお'],
  ['イトケのみ', 'みず'],
  ['ソクノのみ', 'でんき'],
  ['リンドのみ', 'くさ'],
  ['ヤチェのみ', 'こおり'],
  ['ヨプのみ', 'かくとう'],
  ['ビアーのみ', 'どく'],
  ['シュカのみ', 'じめん'],
  ['バコウのみ', 'ひこう'],
  ['ウタンのみ', 'エスパー'],
  ['タンガのみ', 'むし'],
  ['ヨロギのみ', 'いわ'],
  ['カシブのみ', 'ゴースト'],
  ['ハバンのみ', 'ドラゴン'],
  ['ナモのみ', 'あく'],
  ['リリバのみ', 'はがね'],
  ['ロゼルのみ', 'フェアリー'],
];

/**
 * 持ち物のレジストリ
 * 持ち物の日本語名をキーにして、持ち物の効果を引く（技・特性のレジストリと同じ作り）
 *
 * キーは PokeAPI の ja-Hrkt 名と同じにする（書き間違えると、その持ち物は何もしない）
 */
export class ItemRegistry {
  private static registry: Map<string, IItemEffect> = new Map();

  /**
   * レジストリを初期化する（再初期化のときは、登録をすべて消してから登録し直す）
   */
  static initialize(): void {
    this.registry.clear();
    this.registry.set('もくたん', new CharcoalEffect());
    for (const [itemName, typeName] of TYPE_BOOST_ITEMS) {
      this.registry.set(itemName, new TypeBoostItemEffect(typeName));
    }
    // 威力・ダメージを上げる持ち物
    this.registry.set('ちからのハチマキ', new CategoryBoostItemEffect('Physical'));
    this.registry.set('ものしりメガネ', new CategoryBoostItemEffect('Special'));
    this.registry.set('たつじんのおび', new ExpertBeltEffect());
    this.registry.set('いのちのたま', new LifeOrbEffect());
    this.registry.set('メトロノーム', new MetronomeItemEffect());
    this.registry.set('ノーマルジュエル', new NormalGemEffect());
    this.registry.set('でんきだま', new LightBallEffect());
    // 命中・急所に関わる持ち物
    this.registry.set('こうかくレンズ', new WideLensEffect());
    this.registry.set('フォーカスレンズ', new ZoomLensEffect());
    this.registry.set('ひかりのこな', new BrightPowderEffect());
    this.registry.set('ピントレンズ', new ScopeLensEffect());
    this.registry.set('ながねぎ', new LeekEffect());
    this.registry.set('たべのこし', new LeftoversEffect());
    this.registry.set('きあいのタスキ', new FocusSashEffect());
    this.registry.set('きあいのハチマキ', new FocusBandEffect());
    this.registry.set('ゴツゴツメット', new RockyHelmetEffect());
    this.registry.set('おうじゃのしるし', new KingsRockEffect());
    this.registry.set('かいがらのすず', new ShellBellEffect());
    this.registry.set('ふうせん', new AirBalloonEffect());
    this.registry.set('だっしゅつボタン', new EjectButtonEffect());
    this.registry.set('レッドカード', new RedCardEffect());
    // 素早さ・場の状態・交代の持ち物（Issue #264 一部）
    this.registry.set('こだわりスカーフ', new ChoiceScarfEffect());
    this.registry.set('せんせいのツメ', new QuickClawEffect());
    this.registry.set('くろいてっきゅう', new IronBallEffect());
    this.registry.set('ひかりのねんど', new LightClayEffect());
    this.registry.set('あついいわ', new HeatRockEffect());
    this.registry.set('つめたいいわ', new IcyRockEffect());
    this.registry.set('さらさらいわ', new SmoothRockEffect());
    this.registry.set('しめったいわ', new DampRockEffect());
    this.registry.set('グランドコート', new TerrainExtenderEffect());
    this.registry.set('おおきなねっこ', new BigRootEffect());
    this.registry.set('しめつけバンド', new BindingBandEffect());
    this.registry.set('エレキシード', new ElectricSeedEffect());
    this.registry.set('グラスシード', new GrassySeedEffect());
    this.registry.set('ミストシード', new MistySeedEffect());
    this.registry.set('サイコシード', new PsychicSeedEffect());
    this.registry.set('きれいなぬけがら', new ShedShellEffect());

    // 状態異常・こんらんを治すきのみ
    this.registry.set('クラボのみ', new StatusCureBerryEffect([StatusCondition.Paralysis], false));
    this.registry.set('カゴのみ', new StatusCureBerryEffect([StatusCondition.Sleep], false));
    this.registry.set(
      'モモンのみ',
      new StatusCureBerryEffect([StatusCondition.Poison, StatusCondition.BadPoison], false),
    );
    this.registry.set('チーゴのみ', new StatusCureBerryEffect([StatusCondition.Burn], false));
    this.registry.set('ナナシのみ', new StatusCureBerryEffect([StatusCondition.Freeze], false));
    this.registry.set('キーのみ', new StatusCureBerryEffect([], true));
    this.registry.set(
      'ラムのみ',
      new StatusCureBerryEffect(
        [
          StatusCondition.Paralysis,
          StatusCondition.Sleep,
          StatusCondition.Poison,
          StatusCondition.BadPoison,
          StatusCondition.Burn,
          StatusCondition.Freeze,
        ],
        true,
      ),
    );

    // HP・PP を回復するきのみ
    this.registry.set('オレンのみ', createOranBerryEffect());
    this.registry.set('オボンのみ', createSitrusBerryEffect());
    this.registry.set('ヒメリのみ', new LeppaBerryEffect());

    // ダメージを半分にするきのみ
    this.registry.set('ホズのみ', new ResistBerryEffect('ノーマル', false));
    for (const [itemName, typeName] of SUPER_EFFECTIVE_RESIST_BERRIES) {
      this.registry.set(itemName, new ResistBerryEffect(typeName, true));
    }
  }

  /**
   * 持ち物の効果を引く。登録していない持ち物は undefined
   */
  static get(itemName: string): IItemEffect | undefined {
    if (this.registry.size === 0) {
      this.initialize();
    }
    return this.registry.get(itemName);
  }

  /**
   * 持ち物の効果を登録する（テストで、決まった効果の持ち物を足すのに使う）
   */
  static register(itemName: string, effect: IItemEffect): void {
    this.registry.set(itemName, effect);
  }

  /**
   * 登録しているすべての持ち物の名前
   */
  static names(): string[] {
    if (this.registry.size === 0) {
      this.initialize();
    }
    return [...this.registry.keys()];
  }
}
