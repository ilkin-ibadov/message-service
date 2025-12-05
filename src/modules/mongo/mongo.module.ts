import { Global, Module } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { MongoService } from './mongo.service';

@Global()
@Module({
  providers: [
    {
      provide: 'MONGO',
      useFactory: async () => {
        const uri = process.env.MONGO_URI!;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');
        return mongoose;
      },
    },
    MongoService,
  ],
  exports: ['MONGO', MongoService],
})
export class MongoModule {}
