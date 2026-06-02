import { Global, Module } from '@nestjs/common';
import { TypedEventBus } from './events/app-events';

@Global()
@Module({
    providers: [TypedEventBus],
    exports: [TypedEventBus],
})
export class SharedModule {}
