import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { toBattlePokemonStatusResponses } from './battle-pokemon-status.response';

describe('toBattlePokemonStatusResponses', () => {
  const status = (volatileState: BattlePokemonStatus['volatileState']): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 10, 1, true, 80, 100, 1, 0, 0, 0, 0, 0, 0, null, volatileState);

  it('イリュージョンで化けている先（illusionStatusId）を応答から外す', () => {
    // Arrange
    const statuses = [status({ illusionStatusId: 3, substituteHp: 25 })];

    // Act
    const [response] = toBattlePokemonStatusResponses(statuses);

    // Assert
    expect(response.volatileState).toEqual({ substituteHp: 25 });
    expect(JSON.stringify(response)).not.toContain('illusionStatusId');
  });

  it('ほかの欄は entity と同じ値を返す', () => {
    // Arrange
    const statuses = [status({ transformedIntoStatusId: 2 })];

    // Act
    const [response] = toBattlePokemonStatusResponses(statuses);

    // Assert
    expect(response).toEqual({ ...statuses[0], volatileState: { transformedIntoStatusId: 2 } });
  });
});
