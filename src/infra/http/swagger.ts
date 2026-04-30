import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "2AF Authentication Service",
      version: "1.0.0",
      description:
        "Backend microservice autentikimi me 2FA (TOTP/Google Authenticator), JWT, refresh token rotation dhe session management.",
    },
    servers: [{ url: "http://localhost:5000", description: "Local" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // ── Request bodies ──────────────────────────────────────────────────
        RegisterRequest: {
          type: "object",
          required: ["fullName", "email", "password"],
          properties: {
            fullName: {
              type: "string",
              example: "Getuar Jakupi",
              minLength: 2,
            },
            email: {
              type: "string",
              format: "email",
              example: "getuar@test.com",
            },
            password: { type: "string", minLength: 8, example: "Password123" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "getuar@test.com",
            },
            password: { type: "string", example: "Password123" },
          },
        },
        LoginTwoFactorRequest: {
          type: "object",
          required: ["email", "code", "challengeId"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "getuar@test.com",
            },
            code: {
              type: "string",
              minLength: 6,
              maxLength: 6,
              example: "123456",
            },
            challengeId: {
              type: "string",
              example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            },
          },
        },
        ConfirmTwoFactorRequest: {
          type: "object",
          required: ["code", "setupToken"],
          properties: {
            code: {
              type: "string",
              minLength: 6,
              maxLength: 6,
              example: "123456",
            },
            setupToken: {
              type: "string",
              example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            },
          },
        },
        DisableTwoFactorRequest: {
          type: "object",
          required: ["password"],
          properties: {
            password: { type: "string", example: "Password123" },
          },
        },
        RefreshTokenRequest: {
          type: "object",
          properties: {
            refreshToken: {
              type: "string",
              description:
                "Opsionale — lexohet nga cookie HttpOnly nëse nuk jepet në body.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },

        // ── Response bodies ─────────────────────────────────────────────────
        RegisterResponse: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            },
            fullName: { type: "string", example: "Getuar Jakupi" },
            email: {
              type: "string",
              format: "email",
              example: "getuar@test.com",
            },
            role: { type: "string", enum: ["user", "admin"], example: "user" },
            isTwoFactorEnabled: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        LoginSuccessResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["SUCCESS"], example: "SUCCESS" },
            accessToken: {
              type: "string",
              description: "JWT access token — skadon pas 15 minutash.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        LoginRequire2FAResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["REQUIRE_2FA"],
              example: "REQUIRE_2FA",
            },
            challengeId: {
              type: "string",
              description: "ID i sfidës — duhet dërguar te /auth/login/2fa.",
              example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            },
          },
        },
        TwoFactorInitResponse: {
          type: "object",
          properties: {
            qrCodeDataUrl: {
              type: "string",
              description: "Data URL e QR kodit për Google Authenticator.",
              example: "data:image/png;base64,iVBORw0KGgo...",
            },
            manualEntryKey: {
              type: "string",
              description: "Çelësi manual për raste kur QR nuk skanoj.",
              example: "JBSWY3DPEHPK3PXP",
            },
            setupToken: {
              type: "string",
              description:
                "Token i sesionit të setup — duhet dërguar te /auth/2fa/confirm.",
              example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            },
          },
        },
        TwoFactorConfirmResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Two-factor authentication enabled successfully.",
            },
          },
        },
        TwoFactorDisableResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Two-factor authentication disabled successfully.",
            },
          },
        },
        RefreshResponse: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              description:
                "Access token i ri — refresh token i ri vendoset në cookie HttpOnly.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        LogoutResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Logged out successfully." },
          },
        },
        LogoutAllResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Logged out from all devices successfully.",
            },
          },
        },
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            action: {
              type: "string",
              enum: [
                "LOGIN",
                "REGISTER",
                "LOGOUT",
                "LOGOUT_ALL_DEVICES",
                "ENABLE_2FA_INIT",
                "ENABLE_2FA_CONFIRM",
                "DISABLE_2FA",
                "VERIFY_LOGIN_2FA",
                "REFRESH_TOKEN",
              ],
            },
            status: { type: "string", enum: ["SUCCESS", "FAILED", "INFO"] },
            ip: { type: "string", nullable: true, example: "203.0.113.5" },
            userAgent: {
              type: "string",
              nullable: true,
              example: "Mozilla/5.0...",
            },
            metadata: { type: "object", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuditLogsResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/AuditLog" },
            },
            total: { type: "integer", example: 42 },
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
          },
        },
        RedisHealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "error"], example: "ok" },
            connected: { type: "boolean", example: true },
          },
        },
        CacheDebugResponse: {
          type: "object",
          properties: {
            type: { type: "string", example: "LOGIN_CHALLENGE" },
            key: { type: "string", example: "2fa:login:a1b2c3d4" },
            exists: { type: "boolean", example: true },
            ttlSeconds: { type: "integer", nullable: true, example: 280 },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                message: { type: "string", example: "Invalid credentials." },
                code: { type: "string", example: "INVALID_CREDENTIALS" },
              },
            },
          },
        },
      },
    },
    paths: {
      // ── System ─────────────────────────────────────────────────────────────
      "/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          description:
            "Kontrollon statusin e shërbimit dhe lidhjet me PostgreSQL, Redis, MongoDB.",
          responses: {
            200: {
              description: "Shërbimi është aktiv",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["ok"], example: "ok" },
                      postgres: {
                        type: "string",
                        enum: ["ok", "error"],
                        example: "ok",
                      },
                      redis: {
                        type: "string",
                        enum: ["ok", "error"],
                        example: "ok",
                      },
                      mongodb: {
                        type: "string",
                        enum: ["ok", "error"],
                        example: "ok",
                      },
                    },
                  },
                },
              },
            },
            503: {
              description: "Një ose më shumë shërbime janë down",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },

      // ── Auth ───────────────────────────────────────────────────────────────
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Regjistrim",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "User i regjistruar me sukses",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RegisterResponse" },
                },
              },
            },
            400: {
              description: "Validim i gabuar (email, emër ose fjalëkalim)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    invalidEmail: {
                      summary: "Email i pavlefshëm",
                      value: {
                        error: {
                          message: "Invalid email format.",
                          code: "INVALID_EMAIL",
                        },
                      },
                    },
                    weakPassword: {
                      summary: "Fjalëkalim i dobët",
                      value: {
                        error: {
                          message: "Password must be at least 8 characters.",
                          code: "WEAK_PASSWORD",
                        },
                      },
                    },
                    invalidName: {
                      summary: "Emër i shkurtër",
                      value: {
                        error: {
                          message: "Full name must be at least 2 characters.",
                          code: "INVALID_FULL_NAME",
                        },
                      },
                    },
                  },
                },
              },
            },
            409: {
              description: "Email ekziston tashmë",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Email already exists.",
                      code: "EMAIL_ALREADY_EXISTS",
                    },
                  },
                },
              },
            },
            429: { description: "Shumë tentativa — rate limit i kaluar" },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          description:
            "Nëse user ka 2FA aktiv, kthen HTTP 202 me `status: REQUIRE_2FA` dhe `challengeId`. " +
            "Nëse jo, kthen 200 me `accessToken` dhe vendos `refreshToken` në cookie HttpOnly.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description:
                "Login i suksesshëm — refreshToken vendoset si cookie HttpOnly",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
                },
              },
            },
            202: {
              description:
                "2FA e kërkuar — dërgo challengeId te /auth/login/2fa",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/LoginRequire2FAResponse",
                  },
                },
              },
            },
            401: {
              description: "Kredenciale të gabuara",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Invalid credentials.",
                      code: "INVALID_CREDENTIALS",
                    },
                  },
                },
              },
            },
            429: { description: "Shumë tentativa — rate limit i kaluar" },
          },
        },
      },
      "/auth/login/2fa": {
        post: {
          tags: ["Auth"],
          summary: "Verifikim 2FA gjatë login",
          description:
            "Dërgon kodin TOTP dhe challengeId të marrë nga /auth/login. Ktheh accessToken nëse kodi është i saktë.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginTwoFactorRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login i suksesshëm me 2FA",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
                },
              },
            },
            400: {
              description: "Challenge i skaduar ose email nuk përputhet",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    expired: {
                      summary: "Challenge skaduar",
                      value: {
                        error: {
                          message: "Login challenge expired.",
                          code: "LOGIN_CHALLENGE_EXPIRED",
                        },
                      },
                    },
                    mismatch: {
                      summary: "Email nuk përputhet",
                      value: {
                        error: {
                          message: "Email does not match challenge.",
                          code: "CHALLENGE_EMAIL_MISMATCH",
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: "Kod 2FA i gabuar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Invalid 2FA code.",
                      code: "INVALID_2FA_CODE",
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Rinovim token (Refresh Token Rotation)",
          description:
            "Lexon `refreshToken` nga cookie HttpOnly ose nga body. " +
            "Lëshon accessToken të ri dhe refresh token të ri (vendoset si cookie). " +
            "Token-i i vjetër invalidohet menjëherë (anti-reuse).",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
              },
            },
          },
          responses: {
            200: {
              description:
                "AccessToken i ri — refreshToken i ri vendoset si cookie HttpOnly",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RefreshResponse" },
                },
              },
            },
            401: {
              description:
                "Token i skaduar, i ripërdorur ose session i invaliduar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    missing: {
                      summary: "Token mungon",
                      value: {
                        error: {
                          message: "Refresh token missing.",
                          code: "REFRESH_TOKEN_MISSING",
                        },
                      },
                    },
                    reused: {
                      summary: "Token i ripërdorur",
                      value: {
                        error: {
                          message: "Refresh token has already been used.",
                          code: "REFRESH_TOKEN_REUSED",
                        },
                      },
                    },
                    invalidated: {
                      summary:
                        "Session i invaliduar (logout nga të gjitha pajisjet)",
                      value: {
                        error: {
                          message: "Session has been invalidated.",
                          code: "SESSION_INVALIDATED",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout nga pajisja aktuale",
          description:
            "Vendos access token-in aktual në blacklist dhe fshin cookie-n e refresh token.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Logout i suksesshëm",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LogoutResponse" },
                },
              },
            },
            401: {
              description: "Unauthorized — token mungon ose i pavlefshëm",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/auth/logout-all": {
        post: {
          tags: ["Auth"],
          summary: "Logout nga të gjitha pajisjet",
          description:
            "Resetton session generation key në Redis. " +
            "Të gjitha refresh token-at e lëshuar para këtij momenti bëhen të pavlefshëm.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Logout nga të gjitha pajisjet",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LogoutAllResponse" },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },

      // ── 2FA ────────────────────────────────────────────────────────────────
      "/auth/2fa/init": {
        post: {
          tags: ["2FA"],
          summary: "Fillo setup 2FA",
          description:
            "Gjeneron sekretin TOTP, QR kodin dhe setupToken. " +
            "setupToken duhet dërguar te /auth/2fa/confirm brenda 10 minutash.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "QR kodi dhe setupToken i gjeneruar",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/TwoFactorInitResponse",
                  },
                },
              },
            },
            400: {
              description: "2FA tashmë aktive",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Two-factor authentication is already enabled.",
                      code: "TWO_FACTOR_ALREADY_ENABLED",
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/auth/2fa/confirm": {
        post: {
          tags: ["2FA"],
          summary: "Konfirmo setup 2FA",
          description:
            "Verifikon kodin TOTP nga Google Authenticator dhe aktivizon 2FA-n nëse kodi është i saktë.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ConfirmTwoFactorRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "2FA aktivizuar me sukses",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/TwoFactorConfirmResponse",
                  },
                },
              },
            },
            400: {
              description: "Setup session skaduar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Setup session expired.",
                      code: "SETUP_SESSION_EXPIRED",
                    },
                  },
                },
              },
            },
            401: {
              description: "Kod 2FA i gabuar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Invalid 2FA code.",
                      code: "INVALID_2FA_CODE",
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/auth/2fa/disable": {
        post: {
          tags: ["2FA"],
          summary: "Çaktivizo 2FA",
          description:
            "Kërkon fjalëkalimin aktual për konfirmim. Fshin sekretin TOTP dhe pastron cache-in e lidhur.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DisableTwoFactorRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "2FA çaktivizuar me sukses",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/TwoFactorDisableResponse",
                  },
                },
              },
            },
            400: {
              description: "2FA nuk është aktive",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Two-factor authentication is not enabled.",
                      code: "TWO_FACTOR_NOT_ENABLED",
                    },
                  },
                },
              },
            },
            401: {
              description: "Fjalëkalim i gabuar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Invalid password.",
                      code: "INVALID_PASSWORD",
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── Admin ──────────────────────────────────────────────────────────────
      "/admin/audit-logs": {
        get: {
          tags: ["Admin"],
          summary: "Audit logs me filtra dhe paginim",
          description:
            "Kërkon rol `admin`. Kthen listën e audit logs me mundësi filtrimi dhe paginimi.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "email",
              in: "query",
              description: "Filtro sipas email-it të userit",
              schema: { type: "string", format: "email" },
            },
            {
              name: "action",
              in: "query",
              description: "Filtro sipas aksionit",
              schema: {
                type: "string",
                enum: [
                  "LOGIN",
                  "REGISTER",
                  "LOGOUT",
                  "LOGOUT_ALL_DEVICES",
                  "ENABLE_2FA_INIT",
                  "ENABLE_2FA_CONFIRM",
                  "DISABLE_2FA",
                  "VERIFY_LOGIN_2FA",
                  "REFRESH_TOKEN",
                ],
              },
            },
            {
              name: "status",
              in: "query",
              description: "Filtro sipas statusit",
              schema: { type: "string", enum: ["SUCCESS", "FAILED", "INFO"] },
            },
            {
              name: "fromDate",
              in: "query",
              description: "Data fillimit (ISO 8601)",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "toDate",
              in: "query",
              description: "Data mbarimit (ISO 8601)",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "page",
              in: "query",
              description: "Faqja (default: 1)",
              schema: { type: "integer", default: 1, minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              description: "Rekordet për faqe (default: 20)",
              schema: {
                type: "integer",
                default: 20,
                minimum: 1,
                maximum: 100,
              },
            },
          ],
          responses: {
            200: {
              description: "Lista e audit logs me paginim",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuditLogsResponse" },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            403: {
              description: "Admin access i kërkuar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  example: {
                    error: {
                      message: "Admin access required.",
                      code: "FORBIDDEN",
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── Admin Debug ────────────────────────────────────────────────────────
      "/admin/debug/redis/health": {
        get: {
          tags: ["Admin Debug"],
          summary: "Status Redis",
          description:
            "Kërkon rol `admin` dhe header `x-internal-api-key`. Teston lidhjen me Redis.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "x-internal-api-key",
              in: "header",
              required: true,
              description: "API key e brendshme",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Redis status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RedisHealthResponse" },
                },
              },
            },
            403: {
              description: "Admin access i kërkuar ose API key e gabuar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/admin/debug/login-challenge/{challengeId}": {
        get: {
          tags: ["Admin Debug"],
          summary: "Debug login challenge",
          description:
            "Kontrollon nëse një challenge 2FA ekziston në Redis dhe sa kohë ka deri sa skadon.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "challengeId",
              in: "path",
              required: true,
              description: "ID e challenge-it",
              schema: { type: "string" },
            },
            {
              name: "x-internal-api-key",
              in: "header",
              required: true,
              description: "API key e brendshme",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Challenge info",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CacheDebugResponse" },
                  examples: {
                    exists: {
                      summary: "Challenge ekziston",
                      value: {
                        type: "LOGIN_CHALLENGE",
                        key: "2fa:login:a1b2c3d4",
                        exists: true,
                        ttlSeconds: 280,
                      },
                    },
                    missing: {
                      summary: "Challenge nuk ekziston",
                      value: {
                        type: "LOGIN_CHALLENGE",
                        key: "2fa:login:missing",
                        exists: false,
                        ttlSeconds: null,
                      },
                    },
                  },
                },
              },
            },
            403: {
              description: "Admin access i kërkuar ose API key e gabuar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/admin/debug/2fa-setup/{userId}/{token}": {
        get: {
          tags: ["Admin Debug"],
          summary: "Debug 2FA setup session",
          description:
            "Kontrollon nëse një setup session 2FA ekziston në Redis për userId dhe setupToken të dhënë.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              description: "ID e userit",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "token",
              in: "path",
              required: true,
              description: "Setup token",
              schema: { type: "string" },
            },
            {
              name: "x-internal-api-key",
              in: "header",
              required: true,
              description: "API key e brendshme",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "2FA setup session info",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CacheDebugResponse" },
                  examples: {
                    exists: {
                      summary: "Setup session ekziston",
                      value: {
                        type: "TWO_FACTOR_SETUP",
                        key: "2fa:setup:user-id:token123",
                        exists: true,
                        ttlSeconds: 540,
                      },
                    },
                    missing: {
                      summary: "Setup session nuk ekziston ose skaduar",
                      value: {
                        type: "TWO_FACTOR_SETUP",
                        key: "2fa:setup:user-id:token123",
                        exists: false,
                        ttlSeconds: null,
                      },
                    },
                  },
                },
              },
            },
            403: {
              description: "Admin access i kërkuar ose API key e gabuar",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
