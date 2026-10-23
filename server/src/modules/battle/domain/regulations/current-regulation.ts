import { Regulation } from './regulation';
import { REGULATION_M_C } from './regulation-m-c';

/**
 * 今のランクバトルのレギュレーション（バトルを始めるときに、手持ちがこれに合うかを確かめる）
 * レギュレーションが変わったら、ここを差し替える
 */
export const CURRENT_REGULATION: Regulation = REGULATION_M_C;
