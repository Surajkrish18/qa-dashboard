import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// AWS Configuration
const config = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  },
};

// Create DynamoDB client
const dynamoDBClient = new DynamoDBClient(config);

// Create DynamoDB Document client for easier operations
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Table name from environment variables
export const TABLE_NAME = import.meta.env.VITE_DYNAMODB_TABLE_NAME || 'clientcentral-tickets';