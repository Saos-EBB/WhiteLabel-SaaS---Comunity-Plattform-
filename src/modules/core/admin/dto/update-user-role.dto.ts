import { IsEnum } from 'class-validator';

export enum UserRole {
    USER  = 'user',
    ADMIN = 'admin',
    ORG   = 'org',
}

export class UpdateUserRoleDto {
    @IsEnum(UserRole)
    role!: UserRole;
}
