import { exec, execSync } from "child_process";
import { PutObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { createReadStream } from "fs";

import { env } from "./env";

const uploadToS3 = async ({ name, path }: { name: string; path: string }) => {
  console.log("Uploading backup to S3...");

  const bucket = env.AWS_S3_BUCKET;

  const clientOptions: S3ClientConfig = {
    region: env.AWS_S3_REGION,
  };

  if (env.AWS_S3_ENDPOINT) {
    console.log(`Using custom endpoint: ${env.AWS_S3_ENDPOINT}`);
    clientOptions["endpoint"] = env.AWS_S3_ENDPOINT;
  }

  const Key = env.AWS_S3_KEY_PREFIX ? `${env.AWS_S3_KEY_PREFIX}/${name}` : name;

  const client = new S3Client(clientOptions);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key,
      Body: createReadStream(path),
    })
  );

  console.log("Backup uploaded to S3...");
};

const dumpToFile = async (path: string, encryptionKeyPath?: string) => {
  console.log("Dumping DB to file...");

  if (encryptionKeyPath) {
    console.log("Encryption key provided, encrypting backup...");
  }

  const cmd = encryptionKeyPath
    ? `pg_dump ${env.BACKUP_DATABASE_URL} -F t | gzip | openssl smime -encrypt -aes256 -binary -outform DEM -out ${path}.enc "${encryptionKeyPath}"`
    : `pg_dump ${env.BACKUP_DATABASE_URL} -F t | gzip > ${path}`;

  await new Promise((resolve, reject) => {
    exec(cmd, (error: any, stdout: unknown, stderr: any) => {
      if (error) {
        reject({ error: JSON.stringify(error), stderr });
        return;
      }

      resolve(undefined);
    });
  });

  console.log("DB dumped to file...");
};

export const backup = async () => {
  console.log("Initiating DB backup...");

  let date = new Date().toISOString();
  const timestamp = date.replace(/[:.]+/g, "-");
  const filename = `backup-${timestamp}.tar.gz`;
  const filepath = `/tmp/${filename}`;

  let encryptionKeyPath;
  if (env.ENCRYPTION_KEY_PUBLIC) {
    encryptionKeyPath = "/tmp/backup_encryption_key.pem.pub";
    execSync(`echo "${env.ENCRYPTION_KEY_PUBLIC}" > ${encryptionKeyPath}`);
  }

  await dumpToFile(filepath, encryptionKeyPath);
  await uploadToS3({ name: filename, path: filepath });

  console.log("DB backup complete...");
};
