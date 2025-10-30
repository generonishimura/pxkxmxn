import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { StartBattleUseCase } from '../application/use-cases/start-battle.use-case';
import { ExecuteTurnUseCase } from '../application/use-cases/execute-turn.use-case';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../domain/battle.repository.interface';
import { Inject } from '@nestjs/common';

/**
 * BattleController
 * HTTPリクエストを処理し、ユースケースを呼び出す
 */
@Controller('battle')
export class BattleController {
  constructor(
    private readonly startBattleUseCase: StartBattleUseCase,
    private readonly executeTurnUseCase: ExecuteTurnUseCase,
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
  ) {}

  /**
   * バトルを開始
   * POST /battle/start
   */
  @Post('start')
  async startBattle(
    @Body()
    body: {
      trainer1Id: number;
      trainer2Id: number;
      team1Id: number;
      team2Id: number;
    },
  ) {
    const battle = await this.startBattleUseCase.execute(
      body.trainer1Id,
      body.trainer2Id,
      body.team1Id,
      body.team2Id,
    );
    return battle;
  }

  /**
   * ターンを実行
   * POST /battle/:id/turn
   */
  @Post(':id/turn')
  async executeTurn(
    @Param('id', ParseIntPipe) battleId: number,
    @Body()
    body: {
      trainer1Action: {
        trainerId: number;
        moveId?: number;
        switchPokemonId?: number;
      };
      trainer2Action: {
        trainerId: number;
        moveId?: number;
        switchPokemonId?: number;
      };
    },
  ) {
    const result = await this.executeTurnUseCase.execute({
      battleId,
      trainer1Action: body.trainer1Action,
      trainer2Action: body.trainer2Action,
    });
    return result;
  }

  /**
   * バトル状態を取得
   * GET /battle/:id
   */
  @Get(':id')
  async getBattle(@Param('id', ParseIntPipe) id: number) {
    const battle = await this.battleRepository.findById(id);
    if (!battle) {
      return { message: 'Battle not found' };
    }

    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(id);

    return {
      battle,
      pokemonStatuses: battleStatuses,
    };
  }
}

