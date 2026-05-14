import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { MediaUpload, FileType, FileContext, ModerationStatus } from './entities/media-upload.entity';
import { Profile } from '../profile/entities/profile.entity';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

console.log('[MediaService] Sharp loaded:', typeof sharp);

@Injectable()
export class MediaService {
    constructor(
        @InjectRepository(MediaUpload)
        private readonly mediaRepository: Repository<MediaUpload>,
        @InjectRepository(Profile)
        private readonly profileRepository: Repository<Profile>,
    ) {}

    async uploadProfilePhoto(
        userId: string,
        file: Express.Multer.File,
    ): Promise<{ file_url: string; id: string }> {
        try {
            console.log('[MediaService] uploadProfilePhoto reached, userId:', userId);
            if (file.size > MAX_SIZE_BYTES) {
                throw new BadRequestException('Datei zu groß. Maximal 5 MB erlaubt.');
            }

            const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
            console.log('[MediaService] uploadDir:', uploadDir);
            fs.mkdirSync(uploadDir, { recursive: true });

            const filename = `${userId}-${Date.now()}.webp`;
            const filepath = path.join(uploadDir, filename);

            await sharp(file.buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(filepath);

            const fileSizeKb = Math.ceil(fs.statSync(filepath).size / 1024);
            const fileUrl = `http://localhost:3000/uploads/profiles/${filename}`;

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

            console.log('[MediaService] success, returning:', { file_url: fileUrl, id: saved.id });
            return { file_url: fileUrl, id: saved.id };
        } catch (err) {
            console.error('[MediaService] uploadProfilePhoto failed:', err);
            throw err;
        }
    }
}
