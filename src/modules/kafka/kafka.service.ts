import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Kafka, Producer, Consumer } from 'kafkajs'

interface KafkaHandler {
  topic: string
  groupId: string
  handler: (payload: any) => Promise<void>
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka
  private producer: Producer
  private consumers: Consumer[] = []

  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'message-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    })

    this.producer = this.kafka.producer()

    this.consumer = this.kafka.consumer({ groupId: 'message-service-group' });
  }

  async onModuleInit() {
    await this.producer.connect()
    console.log('Message: Kafka producer connected');

    await this.consumer.connect();
    console.log('Message: Kafka consumer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect()
    for (const consumer of this.consumers) {
      await consumer.disconnect()
    }
  }

  // PRODUCER
  async emit(topic: string, payload: any): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
        },
      ],
    })
  }

  //CONSUMER
  async subscribe({ topic, groupId, handler }: KafkaHandler) {
    const consumer = this.kafka.consumer({ groupId })

    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: false })

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return

        const payload = JSON.parse(message.value.toString())
        await handler(payload)
      },
    })

    this.consumers.push(consumer)
  }

  async startConsumer() {
    for (const { topic } of this.handlers) {
      await this.consumer.subscribe({ topic, fromBeginning: true });
      console.log(`Post: Kafka subscribed to topic: ${topic}`);
    }

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        console.log('Post: Kafka message received', {
          topic,
          value: message.value?.toString(),
        });

        if (!message.value) return;

        const handlerObj = this.handlers.find(h => h.topic === topic);
        if (!handlerObj) {
          console.warn(`No handler for topic ${topic}`);
          return;
        }

        const parsed = JSON.parse(message.value.toString());
        await handlerObj.callback(parsed);
      },
    });
  }

  registerHandler(topic: string, callback: (payload: any) => Promise<void>) {
    console.log("Post: Kafka register handler called", topic, callback)
    this.handlers.push({ topic, callback });
  }
}
