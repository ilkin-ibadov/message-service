import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('conversations')
@Index(['senderId', 'receiverId'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // first participant
  @Column({ type: 'uuid' })
  senderId: string

  // second participant
  @Column({ type: 'uuid' })
  receiverId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
