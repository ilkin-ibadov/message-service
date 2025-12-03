import { DataSourceOptions } from "typeorm";
import { User } from "./modules/user/user.entity"
import { EmailVerification } from "./modules/user/email-verification.entity"
import { PasswordReset } from "./modules/user/password-reset.entity"
import { UserSession } from "./modules/user/session.entity"

export const typeOrmConfig: DataSourceOptions = {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "auth-service",
    entities: [User, EmailVerification, PasswordReset, UserSession],
    synchronize: true,
    logging: false
}