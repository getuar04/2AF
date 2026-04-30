/**
 * tests/unit/infra/messaging/kafkaClient.spec.ts
 *
 * Unit tests for kafkaClient — mbulon të gjitha degët:
 *   - getKafkaProducer kur kafka.enabled = false
 *   - getKafkaProducer kur lidhja rregullt (singleton)
 *   - getKafkaProducer kur connect() dështon
 *   - isKafkaAvailable
 *   - disconnectKafka kur producer ekziston
 *   - disconnectKafka kur producer është null
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockProducer = { connect: mockConnect, disconnect: mockDisconnect };
const mockProducerFactory = jest.fn().mockReturnValue(mockProducer);

const mockKafkaConstructor = jest.fn().mockImplementation(() => ({
  producer: mockProducerFactory,
}));

jest.mock("kafkajs", () => ({
  Kafka: mockKafkaConstructor,
}));

// env mock — vlerë default: kafka i aktivizuar
const mockEnv = {
  kafka: {
    enabled: true,
    clientId: "test-client",
    brokers: ["localhost:9092"],
    authTopic: "auth-events",
  },
};

jest.mock("../../../src/infra/config/env", () => ({
  get env() {
    return mockEnv;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Re-import modulin pas çdo testi që state-i singleton të riset.
 * jest.resetModules() + require() e bën këtë pa restartuar procesin.
 */
function freshModule() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../../../src/infra/messaging/kafkaClient") as {
    getKafkaProducer: () => Promise<unknown>;
    isKafkaAvailable: () => boolean;
    disconnectKafka: () => Promise<void>;
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("kafkaClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.kafka.enabled = true;
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
  });

  // ── getKafkaProducer ───────────────────────────────────────────────────────

  describe("getKafkaProducer()", () => {
    it("duhet të kthejë null kur kafka.enabled është false", async () => {
      mockEnv.kafka.enabled = false;
      const { getKafkaProducer } = freshModule();

      const result = await getKafkaProducer();

      expect(result).toBeNull();
      expect(mockKafkaConstructor).not.toHaveBeenCalled();
    });

    it("duhet të krijojë producer dhe të lidhë kur i pari thirrje", async () => {
      const { getKafkaProducer, isKafkaAvailable } = freshModule();

      const producer = await getKafkaProducer();

      expect(mockKafkaConstructor).toHaveBeenCalledWith({
        clientId: mockEnv.kafka.clientId,
        brokers: mockEnv.kafka.brokers,
      });
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(producer).toBe(mockProducer);
      expect(isKafkaAvailable()).toBe(true);
    });

    it("duhet të kthejë të njëjtin producer (singleton) në thirrjet e njëpasnjëshme", async () => {
      const { getKafkaProducer } = freshModule();

      const first = await getKafkaProducer();
      const second = await getKafkaProducer();

      expect(mockConnect).toHaveBeenCalledTimes(1); // lidhje vetëm njëherë
      expect(first).toBe(second);
    });

    it("duhet të hedhë error dhe të pastrojë state-in kur connect() dështon", async () => {
      const connectError = new Error("Kafka broker unreachable");
      mockConnect.mockRejectedValueOnce(connectError);

      const { getKafkaProducer, isKafkaAvailable } = freshModule();

      await expect(getKafkaProducer()).rejects.toThrow(
        "Kafka broker unreachable",
      );
      expect(isKafkaAvailable()).toBe(false);
    });

    it("duhet të provojë të lidhë sërish pas një dështimi", async () => {
      mockConnect
        .mockRejectedValueOnce(new Error("first fail"))
        .mockResolvedValueOnce(undefined);

      const { getKafkaProducer } = freshModule();

      // thirrja e parë dështon
      await expect(getKafkaProducer()).rejects.toThrow("first fail");

      // thirrja e dytë duhet të ketë sukses (producer u pastrua)
      const producer = await getKafkaProducer();
      expect(producer).toBe(mockProducer);
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  // ── isKafkaAvailable ───────────────────────────────────────────────────────

  describe("isKafkaAvailable()", () => {
    it("duhet të kthejë false para lidhjes", () => {
      const { isKafkaAvailable } = freshModule();
      expect(isKafkaAvailable()).toBe(false);
    });

    it("duhet të kthejë true pas lidhjes me sukses", async () => {
      const { getKafkaProducer, isKafkaAvailable } = freshModule();
      await getKafkaProducer();
      expect(isKafkaAvailable()).toBe(true);
    });
  });

  // ── disconnectKafka ────────────────────────────────────────────────────────

  describe("disconnectKafka()", () => {
    it("duhet të shkëputë producer-in dhe të pastrojë state-in", async () => {
      const { getKafkaProducer, disconnectKafka, isKafkaAvailable } =
        freshModule();

      await getKafkaProducer();
      expect(isKafkaAvailable()).toBe(true);

      await disconnectKafka();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      expect(isKafkaAvailable()).toBe(false);
    });

    it("duhet të lejojë lidhje të re pas disconnect", async () => {
      const { getKafkaProducer, disconnectKafka } = freshModule();

      await getKafkaProducer();
      await disconnectKafka();
      await getKafkaProducer();

      expect(mockConnect).toHaveBeenCalledTimes(2);
    });

    it("duhet të mos bëjë asgjë kur nuk ka producer aktiv (thirrje e sigurt)", async () => {
      const { disconnectKafka } = freshModule();

      await expect(disconnectKafka()).resolves.not.toThrow();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });
});
