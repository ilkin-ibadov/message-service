import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('user_blocks')
@Index(['blockerId', 'blockedId'], { unique: true })
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  blockerId: string

  @Column({ type: 'uuid' })
  blockedId: string

  @CreateDateColumn()
  createdAt: Date
}
