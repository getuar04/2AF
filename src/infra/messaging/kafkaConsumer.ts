import { Consumer, Kafka, EachMessagePayload } from "kafkajs";
import { env } from "../config/env";

let kafkaConsumer: Consumer | null = null;

export interface AuthEvent {
  eventName: string;
  payload: Record<string, unknown>;
}

type EventHandler = (event: AuthEvent) => Promise<void>;

const handlers: Map<string, EventHandler[]> = new Map();

// Regjistro handler për një tip eventi specifik
export function onAuthEvent(eventName: string, handler: EventHandler): void {
  const existing = handlers.get(eventName) ?? [];
  handlers.set(eventName, [...existing, handler]);
}

async function processMessage({ message }: EachMessagePayload): Promise<void> {
  if (!message.value) return;

  let event: AuthEvent;
  try {
    event = JSON.parse(message.value.toString()) as AuthEvent;
  } catch {
    console.error("[KafkaConsumer] Mesazh i paparsueshëm:", message.value.toString());
    return;
  }

  const eventHandlers = handlers.get(event.eventName) ?? [];
  const wildcardHandlers = handlers.get("*") ?? [];
  const allHandlers = [...eventHandlers, ...wildcardHandlers];

  if (allHandlers.length === 0) {
    console.log(`[KafkaConsumer] Nuk ka handler për event: ${event.eventName}`);
    return;
  }

  await Promise.allSettled(
    allHandlers.map(async (h) => {
      try {
        await h(event);
      } catch (err) {
        console.error(`[KafkaConsumer] Handler gaboi për ${event.eventName}:`, err);
      }
    }),
  );
}

export async function startKafkaConsumer(groupId: string): Promise<void> {
  if (!env.kafka.enabled) {
    console.log("[KafkaConsumer] Kafka i çaktivizuar — consumer nuk nisi.");
    return;
  }

  const kafka = new Kafka({
    clientId: `${env.kafka.clientId}-consumer`,
    brokers: env.kafka.brokers,
  });

  kafkaConsumer = kafka.consumer({ groupId });

  await kafkaConsumer.connect();
  console.log("[KafkaConsumer] I lidhur me Kafka.");

  await kafkaConsumer.subscribe({
    topic: env.kafka.authTopic,
    fromBeginning: false,
  });

  await kafkaConsumer.run({ eachMessage: processMessage });
  console.log(`[KafkaConsumer] Duke dëgjuar topic: ${env.kafka.authTopic}`);
}

export async function disconnectKafkaConsumer(): Promise<void> {
  if (kafkaConsumer) {
    await kafkaConsumer.disconnect();
    kafkaConsumer = null;
    console.log("[KafkaConsumer] I shkëputur.");
  }
}
