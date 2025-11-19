import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StartBattleUseCase } from '../application/use-cases/start-battle.use-case';
import { ExecuteTurnUseCase } from '../application/use-cases/execute-turn.use-case';
import { IBattleRepository, BATTLE_REPOSITORY_TOKEN } from '../domain/battle.repository.interface';
import { Inject, Logger } from '@nestjs/common';

/**
 * BattleGateway
 * WebSocket通信を処理し、ユースケースを呼び出す
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class BattleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BattleGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly startBattleUseCase: StartBattleUseCase,
    private readonly executeTurnUseCase: ExecuteTurnUseCase,
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * バトル開始
   * クライアントから 'battle:start' イベントを受け取る
   */
  @SubscribeMessage('battle:start')
  async handleBattleStart(
    @MessageBody()
    data: {
      trainer1Id: number;
      trainer2Id: number;
      team1Id: number;
      team2Id: number;
    },
  ) {
    try {
      const battle = await this.startBattleUseCase.execute(
        data.trainer1Id,
        data.trainer2Id,
        data.team1Id,
        data.team2Id,
      );

      // バトル状態を取得
      const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(
        battle.id,
      );

      // クライアントに結果を送信
      return {
        event: 'battle:started',
        data: {
          battle,
          pokemonStatuses: battleStatuses,
        },
      };
    } catch (error) {
      return {
        event: 'battle:start:error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * ターン実行
   * クライアントから 'battle:turn' イベントを受け取る
   */
  @SubscribeMessage('battle:turn')
  async handleBattleTurn(
    @MessageBody()
    data: {
      battleId: number;
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
    try {
      const result = await this.executeTurnUseCase.execute({
        battleId: data.battleId,
        trainer1Action: data.trainer1Action,
        trainer2Action: data.trainer2Action,
      });

      // バトル状態を取得
      const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(
        result.battle.id,
      );

      // クライアントに結果を送信
      return {
        event: 'battle:turn:result',
        data: {
          ...result,
          pokemonStatuses: battleStatuses,
        },
      };
    } catch (error) {
      return {
        event: 'battle:turn:error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * バトル状態取得
   * クライアントから 'battle:status' イベントを受け取る
   */
  @SubscribeMessage('battle:status')
  async handleBattleStatus(@MessageBody() data: { battleId: number }) {
    try {
      const battle = await this.battleRepository.findById(data.battleId);
      if (!battle) {
        return {
          event: 'battle:status:error',
          data: {
            error: 'Battle not found',
          },
        };
      }

      const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(
        data.battleId,
      );

      return {
        event: 'battle:status:result',
        data: {
          battle,
          pokemonStatuses: battleStatuses,
        },
      };
    } catch (error) {
      return {
        event: 'battle:status:error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
