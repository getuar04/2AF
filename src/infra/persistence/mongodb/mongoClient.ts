import { Collection, Db, Document, MongoClient } from "mongodb";
import { env } from "../../config/env";

let client: MongoClient | null = null;
let db: Db | null = null;

function inferDbNameFromUri(uri: string): string {
  const tail = uri.split("/").pop() || "activityLog";
  return tail.split("?")[0] || "activityLog";
}

export async function getMongoDatabase(): Promise<Db> {
  if (!client) {
    client = new MongoClient(env.mongodb.url);
    await client.connect();
    db = client.db(env.mongodb.dbName || inferDbNameFromUri(env.mongodb.url));
  }
  if (!db) throw new Error("Mongo database not initialized");
  return db;
}

export async function getMongoCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const database = await getMongoDatabase();
  return database.collection<T>(name);
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
