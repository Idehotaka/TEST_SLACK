import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DmConversation } from './entities/dm-conversation.entity';
import { DmParticipant } from './entities/dm-participant.entity';
import { DmMessage } from './entities/dm-message.entity';
import { DmService } from './dm.service';
import { DmController } from './dm.controller';
import { DmGateway } from './dm.gateway';
import { Workspace } from 'src/workspace/entities/workspace.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            DmConversation,
            DmParticipant,
            DmMessage,
            Workspace,
            User,
        ]),
    ],
    controllers: [DmController],
    providers: [DmService, DmGateway],
})
export class DmModule {}
