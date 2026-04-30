/**
 * tests/unit/infra/messaging/kafkaEventBus.spec.ts
 *
 * Unit tests për KafkaEventBus — mbulon:
 *   - publish() kur kafka.enabled = false (skip)
 *   - publish() kur getKafkaProducer kthen null (skip)
 *   - publish() kur dërgon me sukses
 *   - publish() kur producer.send() hedh error
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSend = jest.fn();
const mockProducer = { send: mockSend };

const mockGetKafkaProducer = jest.fn();

jest.mock("../../../src/infra/messaging/kafkaClient", () => ({
  getKafkaProducer: mockGetKafkaProducer,
}));

const mockEnv = {
  kafka: {
    enabled: true,
    authTopic: "auth-events",
  },
};

jest.mock("../../../src/infra/config/env", () => ({
  get env() {
    return mockEnv;
  },
}));

// ── Import pas mock-eve ───────────────────────────────────────────────────────

import { KafkaEventBus } from "../../../src/infra/messaging/kafkaEventBus";
import { DomainEvent } from "../../../src/app/ports/eventBus";

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeEvent(name = "UserRegistered"): DomainEvent<{ userId: string }> {
  return {
    eventName: name,
    payload: { userId: "user-123" },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("KafkaEventBus", () => {
  let bus: KafkaEventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.kafka.enabled = true;
    bus = new KafkaEventBus();
  });

  describe("publish()", () => {
    it("duhet të kapërcejë dërgimin kur kafka.enabled është false", async () => {
      mockEnv.kafka.enabled = false;

      await bus.publish(makeEvent());

      expect(mockGetKafkaProducer).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("duhet të kapërcejë dërgimin kur producer është null (Kafka e padisponueshme)", async () => {
      mockGetKafkaProducer.mockResolvedValue(null);

      await bus.publish(makeEvent());

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("duhet të dërgojë eventin te Kafka me parametrat e saktë", async () => {
      mockGetKafkaProducer.mockResolvedValue(mockProducer);
      mockSend.mockResolvedValue(undefined);

      const event = makeEvent("UserLoggedIn");
      await bus.publish(event);

      expect(mockSend).toHaveBeenCalledWith({
        topic: mockEnv.kafka.authTopic,
        messages: [
          {
            key: "UserLoggedIn",
            value: JSON.stringify(event),
          },
        ],
      });
    });

    it("duhet të hedh error kur producer.send() dështon", async () => {
      mockGetKafkaProducer.mockResolvedValue(mockProducer);
      mockSend.mockRejectedValue(new Error("Kafka send failed"));

      await expect(bus.publish(makeEvent())).rejects.toThrow(
        "Kafka send failed",
      );
    });

    it("duhet të serializo payload-in si JSON në fushën value", async () => {
      mockGetKafkaProducer.mockResolvedValue(mockProducer);
      mockSend.mockResolvedValue(undefined);

      const event = makeEvent("TwoFactorEnabled");
      await bus.publish(event);

      const sentMessage = mockSend.mock.calls[0][0].messages[0];
      const parsed = JSON.parse(sentMessage.value);
      expect(parsed.eventName).toBe("TwoFactorEnabled");
      expect(parsed.payload).toEqual({ userId: "user-123" });
    });

    it("duhet të thirr getKafkaProducer() për çdo publish", async () => {
      mockGetKafkaProducer.mockResolvedValue(mockProducer);
      mockSend.mockResolvedValue(undefined);

      await bus.publish(makeEvent("Event1"));
      await bus.publish(makeEvent("Event2"));

      expect(mockGetKafkaProducer).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});
