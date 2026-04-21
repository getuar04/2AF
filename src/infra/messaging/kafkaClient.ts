import { Kafka, Producer } from "kafkajs";
import { env } from "../config/env";

let kafkaProducer: Producer | null = null;
let kafkaAvailable = false;

function createKafkaProducer(): Producer {
  const kafka = new Kafka({
    clientId: env.kafka.clientId,
    brokers: env.kafka.brokers, // 👈 FIX (jo broker)
  });

  return kafka.producer();
}

export async function getKafkaProducer(): Promise<Producer | null> {
  if (!env.kafka.enabled) {
    return null;
  }

  if (!kafkaProducer) {
    kafkaProducer = createKafkaProducer();

    try {
      await kafkaProducer.connect();
      kafkaAvailable = true;
      console.log("Kafka producer connected");
    } catch (error) {
      kafkaAvailable = false;
      kafkaProducer = null;
      throw error;
    }
  }

  return kafkaProducer;
}

export function isKafkaAvailable(): boolean {
  return kafkaAvailable;
}

export async function disconnectKafka(): Promise<void> {
  if (kafkaProducer) {
    await kafkaProducer.disconnect();
    kafkaProducer = null;
    kafkaAvailable = false;
  }
}
