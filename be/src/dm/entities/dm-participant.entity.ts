import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Unique,
} from 'typeorm';
import { DmConversation } from './dm-conversation.entity';
import { User } from 'src/user/entities/user.entity';

/**
 * Tracks which users participate in a DM conversation.
 * Unique constraint prevents a user from being added twice to the same conversation.
 */
@Entity('dm_participants')
@Unique(['conversationId', 'userId'])
export class DmParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => DmConversation, (c) => c.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: DmConversation;

    @Column()
    conversationId: string;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @CreateDateColumn()
    createdAt: Date;
}
