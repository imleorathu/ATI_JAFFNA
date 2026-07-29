import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const sourceName = "ATI_JAFFNA";
const targetName = "ATI_Jaffna";
const backupName = `${targetName}_CASE_BACKUP_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
const configuredUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_Jaffna";
const client = new MongoClient(configuredUri);

async function copyDatabase(sourceDb, targetDb) {
  const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();

  for (const { name } of collections) {
    const sourceCollection = sourceDb.collection(name);
    const targetCollection = targetDb.collection(name);
    const documents = await sourceCollection.find({}).toArray();
    if (documents.length) await targetCollection.insertMany(documents);
    else await targetDb.createCollection(name);

    const indexes = await sourceCollection.indexes();
    for (const index of indexes.filter(({ name: indexName }) => indexName !== "_id_")) {
      const { key, name: indexName, v, ns, background, ...options } = index;
      await targetCollection.createIndex(key, { ...options, name: indexName });
    }
  }

  return collections.map(({ name }) => name);
}

async function counts(db, collectionNames) {
  return Object.fromEntries(
    await Promise.all(collectionNames.map(async (name) => [name, await db.collection(name).countDocuments()]))
  );
}

function assertSameCounts(expected, actual, label) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`${label} count verification failed.`);
  }
}

try {
  await client.connect();
  const existing = (await client.db().admin().listDatabases()).databases.map(({ name }) => name);
  if (!existing.includes(sourceName)) {
    if (existing.includes(targetName)) {
      console.log(`${targetName} already exists; no case migration is needed.`);
      process.exitCode = 0;
    } else {
      throw new Error(`Source database ${sourceName} was not found.`);
    }
  } else {
    const sourceDb = client.db(sourceName);
    const backupDb = client.db(backupName);
    const collectionNames = await copyDatabase(sourceDb, backupDb);
    const sourceCounts = await counts(sourceDb, collectionNames);
    assertSameCounts(sourceCounts, await counts(backupDb, collectionNames), "Backup");

    await sourceDb.dropDatabase();

    const targetDb = client.db(targetName);
    await copyDatabase(backupDb, targetDb);
    assertSameCounts(sourceCounts, await counts(targetDb, collectionNames), "Target");

    const total = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);
    console.log(`Migrated ${total} documents in ${collectionNames.length} collections from ${sourceName} to ${targetName}.`);
    console.log(`Verified backup and target. Backup retained as ${backupName}.`);
  }
} finally {
  await client.close();
}
