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
