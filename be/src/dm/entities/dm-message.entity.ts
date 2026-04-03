import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { DmConversation } from './dm-conversation.entity';
import { User } from 'src/user/entities/user.entity';

@Entity('dm_messages')
export class DmMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => DmConversation, (c) => c.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: DmConversation;

    @Column()
    conversationId: string;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'senderId' })
    sender: User;

    @Column()
    senderId: string;

    @Column('text')
    content: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
