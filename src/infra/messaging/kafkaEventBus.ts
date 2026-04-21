import { DomainEvent, EventBus } from "../../app/ports/eventBus";
import { env } from "../config/env";
import { getKafkaProducer } from "./kafkaClient";

export class KafkaEventBus implements EventBus {
  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    if (!env.kafka.enabled) {
      console.log(`[Kafka disabled] Skipping event: ${event.eventName}`);
      return;
    }

    const producer = await getKafkaProducer();

    if (!producer) {
      console.log(`[Kafka unavailable] Skipping event: ${event.eventName}`);
      return;
    }

    await producer.send({
      topic: env.kafka.authTopic,
      messages: [
        {
          key: event.eventName,
          value: JSON.stringify(event),
        },
      ],
    });

    console.log(`[Kafka] Published event: ${event.eventName}`);
  }
}
