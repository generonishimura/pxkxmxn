/**
 * 技に関するユーティリティ関数
 */

/**
 * 技が特殊効果を持つかどうかを判定
 * @param move 技の情報（descriptionとcategoryを含む）
 * @returns 特殊効果を持つ場合true、持たない場合false
 */
export function hasSpecialEffect(move: {
  description: string | null;
  category: string;
}): boolean {
  const description = move.description?.toLowerCase() || '';
  return (
    description.includes('burn') ||
    description.includes('paralyze') ||
    description.includes('freeze') ||
    description.includes('poison') ||
    description.includes('sleep') ||
    description.includes('flinch') ||
    description.includes('stat') ||
    description.includes('weather') ||
    description.includes('recoil') ||
    description.includes('multi-hit') ||
    description.includes('priority') ||
    move.category === 'Status' // 変化技は全て特殊効果を持つ可能性がある
  );
}

