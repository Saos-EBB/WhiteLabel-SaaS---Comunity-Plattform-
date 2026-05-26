import { IsEnum } from 'class-validator';

export enum UserRole {
    USER  = 'user',
    ADMIN = 'admin',
    ORG   = 'org',
}

// Roles assignable by the owner — 'owner' is intentionally excluded
export enum AssignableRole {
    USER  = 'user',
    ADMIN = 'admin',
}

export class UpdateUserRoleDto {
    @IsEnum(AssignableRole)
    role!: AssignableRole;
}
