import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm"
import { User } from "./user.entity"
import { CommonEntity } from "src/common/entities/common.entity";

@Entity({ name: 'email_verifications' })
export class EmailVerification extends CommonEntity {
    @Index()
    @Column() tokenHash: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ type: 'timestamptz' }) expiresAt: Date;

    @Column({ nullable: true }) usedAt?: Date
}
