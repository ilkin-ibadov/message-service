import { DataSourceOptions } from "typeorm";
import { Message } from "./modules/message/message.entity";
import { MessageStatus } from "./modules/message/message-status.entity";

export const typeOrmConfig: DataSourceOptions = {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "posts-service",
    entities: [Message, MessageStatus],
    synchronize: true,
    logging: false,
};
