import { Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../../kafka/kafka.service';
import { IdempotencyService } from '../../kafka/idempotency/idempotency.service';
import { UserReplicaService } from '../../user-replica/user-replica.service';

@Injectable()
export class UserReplicaConsumer implements OnModuleInit {
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly idempotency: IdempotencyService,
    private readonly userReplicaService: UserReplicaService,
  ) { }

  async onModuleInit() {
    this.kafkaService.registerHandler(
      'auth.user.created',
      (event) => this.userReplicaService.onUserCreated(event.payload),
    );

    await this.kafkaService.startConsumer();

    console.log("User replica consumer started")
    const topics = [
      'auth.user.created'
    ];

    for (const topic of topics) {
      this.kafkaService.registerHandler('auth.user.created', async (event) => {
        if (!event) return;

        const alreadyProcessed = await this.idempotency.isProcessed(
          event.eventId,
          'auth.user.created',
        );

        console.log("Already processed state: ", alreadyProcessed)

        if (alreadyProcessed) return;

        const { payload } = event.payload

        await this.userReplicaService.onUserCreated(payload);

        // switch (topic) {
        //   case 'auth.user.created':
        //     await this.userReplicaService.onUserCreated(event.payload);
        //     break;

        //   case 'auth.user.updated':
        //     await this.userReplicaService.onUserUpdated(event.payload);
        //     break;

        //   case 'auth.user.username.changed':
        //     await this.userReplicaService.onUsernameChanged(event.payload);
        //     break;
        // }

        await this.idempotency.markProcessed(event.eventId, 'auth.user.created');
      });
    }
  }
}
