import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "js", "json"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/app/usecases/**/*.ts",
    "src/app/services/**/*.ts",
    "src/domain/**/*.ts",
    "src/infra/messaging/**/*.ts",
    "!src/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  clearMocks: true,
  verbose: true,
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 55,
      functions: 70,
      lines: 70,
    },
  },
};

export default config;
