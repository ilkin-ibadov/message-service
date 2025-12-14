import { DataSourceOptions } from "typeorm";
import { Post } from "./modules/post/post.entity";
import { UserReplica } from "./modules/user-replica/user-replica.entity";

export const typeOrmConfig: DataSourceOptions = {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "posts-service",
    entities: [Post, UserReplica],
    synchronize: true,
    logging: false,
};
