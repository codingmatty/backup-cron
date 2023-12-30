# Postgres S3 backups

A simple NodeJS application to backup your PostgreSQL database to S3 via a cron.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/I4zGrH)

---

## Encryption (Optional)

__Reference: https://www.imagescape.com/blog/encrypted-postgres-backups/__

1. Generate a public/private key pair:

```
openssl req -x509 -nodes -days 1000000 -newkey rsa:4096 -keyout backup_key.pem\
 -subj "/C=US/ST=Illinois/L=Chicago/O=IT/CN=www.example.com" \
 -out backup_key.pem.pub
```

2. Add the public key as `ENCRYPTION_KEY_PUBLIC` environment variable to automatically trigger encryption for each backup.

3. To decrypt use the following command:
```
openssl smime -decrypt -in ./backup-$TIMESTAMP.tar.gz.enc -binary -inform DEM -inkey backup_key.pem > ./backup-$TIMESTAMP.tar.gz
```
