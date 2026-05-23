import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { MediaUpload, FileType, FileContext, ModerationStatus } from './entities/media-upload.entity';
import { Profile } from '../profile/entities/profile.entity';
import { ProfanityService } from '../moderation/profanity.service';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class MediaService {
    constructor(
        @InjectRepository(MediaUpload)
        private readonly mediaRepository: Repository<MediaUpload>,
        @InjectRepository(Profile)
        private readonly profileRepository: Repository<Profile>,
        private readonly profanityService: ProfanityService,
    ) {}

    private validateMagicBytes(buffer: Buffer): boolean {
        if (buffer.length < 12) return false;

        // JPEG: FF D8 FF
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
            buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
        ) return true;

        // WebP: RIFF at bytes 0–3, WEBP at bytes 8–11
        if (
            buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
        ) return true;

        return false;
    }

    async uploadProfilePhoto(
        userId: string,
        file: Express.Multer.File,
    ): Promise<{ file_url: string; id: string }> {
        try {
            if (file.size > MAX_SIZE_BYTES) {
                throw new BadRequestException('Datei zu groß. Maximal 5 MB erlaubt.');
            }

            if (!this.validateMagicBytes(file.buffer)) {
                throw new BadRequestException('Ungültiges Dateiformat');
            }

            const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
            fs.mkdirSync(uploadDir, { recursive: true });

            const filename = `${userId}-${Date.now()}.webp`;
            const filepath = path.join(uploadDir, filename);

            await sharp(file.buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(filepath);

            const fileSizeKb = Math.ceil(fs.statSync(filepath).size / 1024);
            const fileUrl = `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/uploads/profiles/${filename}`;

            const media = this.mediaRepository.create({
                uploaded_by: userId,
                file_url: fileUrl,
                file_type: FileType.IMAGE,
                context: FileContext.PROFILE,
                moderation_status: ModerationStatus.PENDING,
                is_encrypted: false,
                file_size_kb: fileSizeKb,
                conversation_id: null,
                org_id: null,
                file_use_for: 'profile_photo',
            });
            const saved = await this.mediaRepository.save(media);

            await this.profileRepository.update({ user_id: userId }, { photo_id: saved.id });

            this.profanityService.createImageTicket(userId, saved.id).catch(() => {});

            return { file_url: fileUrl, id: saved.id };
        } catch (err) {
            throw err;
        }
    }
}
