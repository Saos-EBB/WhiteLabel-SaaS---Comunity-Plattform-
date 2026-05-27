import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Request,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { BeefService } from './beef.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { CreateBeefDto } from './dto/create-beef.dto';
import { RespondBeefDto } from './dto/respond-beef.dto';
import { VoteBeefDto } from './dto/vote-beef.dto';
import { CommentBeefDto } from './dto/comment-beef.dto';

@Controller('hidden/beef')
@UseGuards(JwtGuard)
export class BeefController {
    constructor(private readonly beefService: BeefService) { }

    @Post()
    create(@Request() req: any, @Body() dto: CreateBeefDto) {
        return this.beefService.create(req.user.sub, dto);
    }

    @Post(':id/respond')
    respond(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RespondBeefDto,
    ) {
        return this.beefService.respond(id, req.user.sub, dto);
    }

    @Get()
    listActive() {
        return this.beefService.listActive();
    }

    @Post(':id/vote')
    vote(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: VoteBeefDto,
    ) {
        return this.beefService.vote(id, req.user.sub, dto);
    }

    @Post(':id/comment')
    addComment(
        @Request() req: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CommentBeefDto,
    ) {
        return this.beefService.addComment(id, req.user.sub, dto);
    }

    @Get(':id/comments')
    getComments(@Param('id', ParseUUIDPipe) id: string) {
        return this.beefService.getComments(id);
    }

    @Get(':id/votes')
    getVotes(@Param('id', ParseUUIDPipe) id: string) {
        return this.beefService.getVotes(id);
    }

    @Patch(':id/approve')
    approve(@Param('id', ParseUUIDPipe) id: string) {
        return this.beefService.approve(id);
    }
}
