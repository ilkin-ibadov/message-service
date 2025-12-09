import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn
} from 'typeorm';

@Entity('post_replies')
export class PostReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  postId: string; // parent post

  @Column('uuid')
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  mediaItems: Array<{
    mediaId: string;
    url: string;
    type: 'image' | 'video';
  }>;

  @Column('uuid', { array: true, default: [] })
  mentions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
