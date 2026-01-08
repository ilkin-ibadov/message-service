import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserBlock } from './block.entity'
import { BlockService } from './block.service'
import { BlockController } from './block.controller'

@Module({
    imports: [TypeOrmModule.forFeature([UserBlock])],
    providers: [BlockService],
    controllers: [BlockController],
    exports: [BlockService],
})
export class BlockModule { }
