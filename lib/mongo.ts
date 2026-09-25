import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as { mongo?: MongoClient };

function url() {
  const value = process.env.MONGO_URL;
  if (!value) throw new Error("Falta MONGO_URL.");
  return value;
}

export async function mongoDb(): Promise<Db> {
  if (!globalForMongo.mongo) {
    globalForMongo.mongo = new MongoClient(url());
    await globalForMongo.mongo.connect();
  }
  return globalForMongo.mongo.db();
}

export async function cerrarMongo() {
  if (!globalForMongo.mongo) return;
  await globalForMongo.mongo.close();
  globalForMongo.mongo = undefined;
}
