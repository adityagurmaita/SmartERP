import { MongoMemoryServer } from "mongodb-memory-server";
const mongo = await MongoMemoryServer.create();
await mongo.stop();
console.log("Demo MongoDB binary cached");
