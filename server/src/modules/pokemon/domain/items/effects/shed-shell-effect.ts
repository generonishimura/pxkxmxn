import { IItemEffect } from '../item-effect.interface';

/**
 * きれいなぬけがら（Shed Shell）
 * 逃げられない状態（くろいまなざしなど）・バインド状態・ねをはる・相手の特性（かげふみ・ありじごく・じりょく）・
 * フェアリーロックでも交代できる（本家の onTrapPokemon で trapped を消すのと同じ）
 *
 * 判定はエンジン（PokemonSwitcherService.findSwitchBlocker が escapesTrapping を読む）
 */
export class ShedShellEffect implements IItemEffect {
  readonly escapesTrapping = true;
}
