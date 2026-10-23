import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExecuteTurnDto } from './execute-turn.dto';

describe('ExecuteTurnDto', () => {
  const toDto = (trainer1Action: Record<string, unknown>): ExecuteTurnDto =>
    plainToInstance(ExecuteTurnDto, {
      trainer1Action,
      trainer2Action: { trainerId: 2, moveId: 1 },
    });

  it('技といっしょに megaEvolve: true を受け付ける', async () => {
    // Arrange
    const dto = toDto({ trainerId: 1, moveId: 1, megaEvolve: true });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('megaEvolve は省略できる', async () => {
    // Arrange
    const dto = toDto({ trainerId: 1, moveId: 1 });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('megaEvolve が真偽値でなければ弾く', async () => {
    // Arrange
    const dto = toDto({ trainerId: 1, moveId: 1, megaEvolve: 'yes' });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].children?.[0].property).toBe('megaEvolve');
  });
});
