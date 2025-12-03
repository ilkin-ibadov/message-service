import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { CommonEntity } from 'src/common/entities/common.entity';

@Entity({ name: 'user_sessions' })
export class UserSession extends CommonEntity {

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column() userId: string;

  // store hash of refresh token
  @Column() refreshTokenHash: string;

  @Column({ nullable: true }) ip?: string;
  @Column({ nullable: true }) device?: string;
  @Column({ nullable: true }) country?: string;

  @Column({ type: 'timestamptz', nullable: true }) expiresAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt?: Date;

  @Index()
  @Column({ default: false }) revoked: boolean;
}
