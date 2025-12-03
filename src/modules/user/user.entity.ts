import { CommonEntity } from 'src/common/entities/common.entity';
import {
  Entity,
  Column,
  Unique,
} from 'typeorm';

@Entity({ name: 'users' })
@Unique(['email'])
export class User extends CommonEntity {

  @Column() email: string;

  @Column() passwordHash: string;

  @Column({ nullable: true }) name?: string;

  @Column({ default: false }) isVerified: boolean;

  @Column({ default: false }) isPrivate: boolean;
}
