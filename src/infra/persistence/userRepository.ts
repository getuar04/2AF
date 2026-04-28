// Ky skedar ekziston vetëm për backward compatibility.
// Implementimi aktual është MemoryUserRepository ose PostgresUserRepository.
// Shiko: infra/persistence/memory/memoryUserRepository.ts
export { MemoryUserRepository as UserRepositoryImpl } from "./memory/memoryUserRepository";
