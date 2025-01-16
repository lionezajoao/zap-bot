import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    UploadPartCommand
} from '@aws-sdk/client-s3';
import { AwsS3Store } from 'wwebjs-aws-s3';
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" })

export default class SessionHandler {
    constructor() {
        this.s3 = new S3Client({
            endpoint: process.env.S3_ENDPOINT,
            region: "nyc3",
            credentials: {
              accessKeyId: process.env.S3_ID,
              secretAccessKey: process.env.S3_SECRET
            },
            httpOptions: {
                timeout: 600000,
            },
        });
        this.bucket = process.env.SESSION_BUCKET;
        this.store = null;
    }

    async setStore() {

        const putObjectCommand = PutObjectCommand;
        const headObjectCommand = HeadObjectCommand;
        const getObjectCommand = GetObjectCommand;
        const deleteObjectCommand = DeleteObjectCommand;

        this.store = new AwsS3Store({
            s3Client: this.s3,
            bucketName: this.bucket,
            remoteDataPath: "sessions",
            putObjectCommand,
            headObjectCommand,
            getObjectCommand,
            deleteObjectCommand,
        });
    }

};