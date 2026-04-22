import { EnableTwoFactor } from "./app/usecases/enableTwoFactor";
import { LoginUser } from "./app/usecases/loginUser";
import { RegisterUser } from "./app/usecases/registerUser";
import { VerifyLoginTwoFactor } from "./app/usecases/verifyLoginTwoFactor";
import { RefreshToken } from "./app/usecases/refreshToken";
import { GetAuditLogs } from "./app/usecases/getAuditLogs";
import { MemoryCacheProvider } from "./infra/cache/memoryCacheProvider";
import { RedisCacheProvider } from "./infra/cache/redisCacheProvider";
import { env } from "./infra/config/env";
import { AuthController } from "./infra/http/controllers/authController";
import { AdminController } from "./infra/http/controllers/adminController";
import { KafkaEventBus } from "./infra/messaging/kafkaEventBus";
import { NoopEventBus } from "./infra/messaging/noopEventBus";
import { MemoryAuthAuditRepository } from "./infra/persistence/memory/memoryAuthAuditRepository";
import { MemoryUserRepository } from "./infra/persistence/memory/memoryUserRepository";
import { MongoAuthAuditRepository } from "./infra/persistence/mongodb/mongoAuthAuditRepository";
import { PostgresUserRepository } from "./infra/persistence/postgres/postgresUserRepository";
import { QrCodeProvider } from "./infra/qrcode/qrCodeProvider";
import { BcryptPasswordHasher } from "./infra/security/bcryptPasswordHasher";
import { JwtTokenProvider } from "./infra/security/jwtTokenProvider";
import { SpeakeasyTwoFactorProvider } from "./infra/security/speakeasyTwoFactorProvider";
import { UuidGenerator } from "./infra/utils/uuidGenerator";

const memoryMode = env.app.runtimeMode === "memory";

const userRepository = memoryMode ? new MemoryUserRepository() : new PostgresUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const tokenProvider = new JwtTokenProvider();
const twoFactorProvider = new SpeakeasyTwoFactorProvider();
const qrCodeProvider = new QrCodeProvider();
const cacheProvider = memoryMode ? new MemoryCacheProvider() : new RedisCacheProvider();
const authAuditRepository = memoryMode ? new MemoryAuthAuditRepository() : new MongoAuthAuditRepository();
const eventBus = memoryMode ? new NoopEventBus() : new KafkaEventBus();
const idGenerator = new UuidGenerator();

const registerUserUseCase = new RegisterUser(
  userRepository,
  passwordHasher,
  authAuditRepository,
  eventBus,
  idGenerator,
  env.app.adminEmails
);

const enableTwoFactorUseCase = new EnableTwoFactor(
  userRepository,
  twoFactorProvider,
  qrCodeProvider,
  cacheProvider,
  authAuditRepository,
  eventBus,
  idGenerator,
  env.security.twoFaExpiresSeconds
);

const loginUserUseCase = new LoginUser(
  userRepository,
  passwordHasher,
  tokenProvider,
  cacheProvider,
  authAuditRepository,
  eventBus,
  idGenerator,
  env.security.twoFaExpiresSeconds
);

const verifyLoginTwoFactorUseCase = new VerifyLoginTwoFactor(
  userRepository,
  twoFactorProvider,
  tokenProvider,
  cacheProvider,
  authAuditRepository,
  eventBus,
  idGenerator
);

const refreshTokenUseCase = new RefreshToken(
  tokenProvider,
  userRepository,
  authAuditRepository,
  idGenerator
);

const getAuditLogsUseCase = new GetAuditLogs(authAuditRepository);

export const authController = new AuthController(
  registerUserUseCase,
  enableTwoFactorUseCase,
  loginUserUseCase,
  verifyLoginTwoFactorUseCase,
  refreshTokenUseCase
);

export const adminController = new AdminController(getAuditLogsUseCase);
