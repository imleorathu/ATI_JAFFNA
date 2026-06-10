import { MongoClient } from "mongodb";

const sourceName = "ATI_JAFFNA";
const targetName = "ATI_Jaffna";
const backupName = `${targetName}_CASE_BACKUP_${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
const client = new MongoClient("mongodb://127.0.0.1:27017");

async function copyDatabase(sourceDb, targetDb) {
  const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();

  for (const { name } of collections) {
    const sourceCollection = sourceDb.collection(name);
    const targetCollection = targetDb.collection(name);
    const documents = await sourceCollection.find({}).toArray();
    if (documents.length) await targetCollection.insertMany(documents);

    const indexes = await sourceCollection.indexes();
    for (const index of indexes.filter(({ name: indexName }) => indexName !== "_id_")) {
      const { key, name: indexName, ...options } = index;
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
    throw new Error(`Source database ${sourceName} was not found.`);
  }
  if (existing.includes(targetName)) {
    throw new Error(`Target database ${targetName} already exists.`);
  }

  const sourceDb = client.db(sourceName);
  const backupDb = client.db(backupName);
  const collectionNames = await copyDatabase(sourceDb, backupDb);
  const sourceCounts = await counts(sourceDb, collectionNames);
  assertSameCounts(sourceCounts, await counts(backupDb, collectionNames), "Backup");

  await sourceDb.dropDatabase();

  const targetDb = client.db(targetName);
  await copyDatabase(backupDb, targetDb);
  assertSameCounts(sourceCounts, await counts(targetDb, collectionNames), "Target");

  console.log(`Migrated ${sourceName} to ${targetName}.`);
  console.log(`Verified ${collectionNames.length} collections. Backup retained as ${backupName}.`);
} finally {
  await client.close();
}
