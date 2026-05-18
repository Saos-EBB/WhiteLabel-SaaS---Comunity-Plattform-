import {
    Controller,
    Post,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    UseFilters,
    BadRequestException,
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { MediaService } from './media.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Catch()
class MediaDebugFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<any>();
        const status = exception instanceof HttpException ? exception.getStatus() : 500;
        res.status(status).json(
            exception instanceof HttpException
                ? exception.getResponse()
                : { statusCode: 500, message: 'Internal server error' },
        );
    }
}

@Controller('media')
@UseFilters(new MediaDebugFilter())
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Post('upload/profile-photo')
    @UseGuards(JwtGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: (_req, file, cb) => {
                if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Nur JPEG, PNG und WebP erlaubt'), false);
                }
            },
        }),
    )
    async uploadProfilePhoto(
        @Request() req: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('Keine Datei hochgeladen');
        return this.mediaService.uploadProfilePhoto(req.user.sub, file);
    }
}
