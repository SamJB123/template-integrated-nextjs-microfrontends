# Infrastructure

The `infrastructure` folder contains technical implementations and external system integrations that support your application.

## Purpose

This folder houses all the "under the hood" technical components that provide capabilities to your application but aren't directly exposed to the outside world. It includes connections to external systems, technical utilities, and implementations of interfaces defined elsewhere.

## Contents

- **Database Access**: ORM configurations, query builders, connection pools
- **External Service Clients**: API clients for third-party services (like Directus)
- **File Storage**: S3, local filesystem, or other storage mechanisms
- **Caching Solutions**: Redis, in-memory, or other caching implementations
- **Message Queues**: Queue clients and processors
- **Logging**: Logging implementations
- **Email/Notifications**: Email senders, push notification services
- **Repository Implementations**: Concrete implementations of domain repositories

## Principles

- Focus on technical implementation details
- Isolate external dependencies
- Create abstractions that shield the rest of the application from technical details
- Define clear boundaries with error handling
- Implement interfaces defined in the domain layer
- Keep business logic out of this layer

## Example

```typescript
// infrastructure/directus/client.ts
import { Directus } from '@directus/sdk';
import { DirectusSchema } from './types';

let directusClient: Directus<DirectusSchema> | null = null;

export async function getDirectusClient(): Promise<Directus<DirectusSchema>> {
  if (directusClient !== null) {
    return directusClient;
  }

  directusClient = new Directus<DirectusSchema>(process.env.DIRECTUS_URL!);
  
  // Handle authentication with static token or credentials
  if (process.env.DIRECTUS_TOKEN) {
    directusClient.auth.static(process.env.DIRECTUS_TOKEN);
  } else {
    await directusClient.auth.login({
      email: process.env.DIRECTUS_EMAIL!,
      password: process.env.DIRECTUS_PASSWORD!,
    });
  }
  
  return directusClient;
}

// infrastructure/storage/files.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  
  return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}
```

Infrastructure components should expose clean interfaces to the rest of the application while hiding technical complexities of external systems and services.
