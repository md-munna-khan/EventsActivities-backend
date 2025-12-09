import { Admin, Client, Prisma, UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from 'bcryptjs';
import { Request } from "express";
import config from "../../../config";
import { uploadBufferToCloudinary, cloudinaryUpload } from "../../../config/cloudinary.config";
import { paginationHelper } from "../../../helpers/paginationHelper";
import prisma from "../../../shared/prisma";
import { IAuthUser } from "../../interfaces/common";
import { IPaginationOptions } from "../../interfaces/pagination";
import { userSearchAbleFields } from "./user.constant";

const createAdmin = async (req: Request): Promise<Admin> => {

    const file = req.file;

    let uploadedPublicId: string | undefined;
    if (file) {
        if ((file as any).buffer) {
            const uploaded = await uploadBufferToCloudinary((file as any).buffer, (file as any).originalname || 'profile');
            req.body.admin.profilePhoto = uploaded?.secure_url;
            uploadedPublicId = (uploaded as any)?.public_id;
        } else if ((file as any).path) {
            const uploaded = await cloudinaryUpload.uploader.upload((file as any).path, { resource_type: 'auto' });
            req.body.admin.profilePhoto = uploaded?.secure_url;
            uploadedPublicId = (uploaded as any)?.public_id;
        }
    }

    const hashedPassword: string = await bcrypt.hash(req.body.password, Number(config.salt_round))

    const userData = {
        email: req.body.admin.email,
        password: hashedPassword,
        role: UserRole.ADMIN
    }

    try {
        const result = await prisma.$transaction(async (transactionClient) => {
            await transactionClient.user.create({
                data: userData
            });

            const createdAdminData = await transactionClient.admin.create({
                data: req.body.admin
            });

            return createdAdminData;
        });

        return result;
    } catch (error) {
        if (uploadedPublicId) {
            try {
                await cloudinaryUpload.uploader.destroy(uploadedPublicId as string);
            } catch (cleanupErr) {
                // ignore cleanup errors
            }
        }
        throw error;
    }
};



const createClient = async (req: Request): Promise<Client> => {
    const file = req.file;

    let uploadedPublicId: string | undefined;
    if (file) {
        // If multer stored the file in memory (buffer available), upload buffer to Cloudinary
        if ((file as any).buffer) {
            const uploadedProfileImage = await uploadBufferToCloudinary((file as any).buffer, (file as any).originalname || 'profile');
            req.body.client.profilePhoto = uploadedProfileImage?.secure_url;
            uploadedPublicId = (uploadedProfileImage as any)?.public_id;
        } else if ((file as any).path) {
            const uploadedProfileImage = await cloudinaryUpload.uploader.upload((file as any).path, { resource_type: 'auto' });
            req.body.client.profilePhoto = uploadedProfileImage?.secure_url;
            uploadedPublicId = (uploadedProfileImage as any)?.public_id;
        }
    }

    const hashedPassword: string = await bcrypt.hash(req.body.password, Number(config.salt_round))

    const userData = {
        email: req.body.client.email,
        password: hashedPassword,
        role: UserRole.CLIENT
    }
    console.log(userData)

    try {
        const result = await prisma.$transaction(async (transactionClient) => {
            await transactionClient.user.create({
                data: {
                    ...userData,
                    needPasswordChange: false
                }
            });

            const createdClientData = await transactionClient.client.create({
                data: req.body.client
            });

            return createdClientData;
        });
console.log(result)
        return result;
    } catch (error) {
        if (uploadedPublicId) {
            // Try to remove the uploaded image from Cloudinary using the public_id
            try {
                await cloudinaryUpload.uploader.destroy(uploadedPublicId as string);
            } catch (err) {
                // If cleanup fails, log it but rethrow the original error below
                // console.error('Failed to delete uploaded image from Cloudinary', err);
            }
        }
        throw error;
    }
};



const getMyProfile = async (user: IAuthUser) => {
    const userInfo = await prisma.user.findUniqueOrThrow({
        where: {
            email: user?.email,
            status: UserStatus.ACTIVE,
        },
        select: {
            id: true,
            email: true,
            needPasswordChange: true,
            role: true,
            status: true,
        },
    });

    let profileInfo;

     if (userInfo.role === UserRole.ADMIN) {
        profileInfo = await prisma.admin.findUnique({
            where: {
                email: userInfo.email,
            },
            select: {
                id: true,
                name: true,
                email: true,
                profilePhoto: true,
                contactNumber: true,
                isDeleted: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    } else if (userInfo.role === UserRole.CLIENT) {
        profileInfo = await prisma.client.findUnique({
            where: {
                email: userInfo.email,
            },
            select: {
                id: true,
                name: true,
                email: true,
                profilePhoto: true,
                contactNumber: true,
               
                isDeleted: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    return { ...userInfo, ...profileInfo };
};


const updateMyProfile = async (user: IAuthUser, req: Request) => {
    const userInfo = await prisma.user.findUniqueOrThrow({
        where: {
            email: user?.email,
            status: UserStatus.ACTIVE
        }
    });


    const file = req.file;
    let uploadedPublicId: string | undefined;
    if (file) {
        if ((file as any).buffer) {
            const uploaded = await uploadBufferToCloudinary((file as any).buffer, (file as any).originalname || 'profile');
            req.body.profilePhoto = uploaded?.secure_url;
            uploadedPublicId = (uploaded as any)?.public_id;
        } else if ((file as any).path) {
            const uploaded = await cloudinaryUpload.uploader.upload((file as any).path, { resource_type: 'auto' });
            req.body.profilePhoto = uploaded?.secure_url;
            uploadedPublicId = (uploaded as any)?.public_id;
        }
    }

    let profileInfo;

    try {
        if (userInfo.role === UserRole.ADMIN) {
            profileInfo = await prisma.admin.update({
                where: {
                    email: userInfo.email
                },
                data: req.body
            })
        }

        else if (userInfo.role === UserRole.CLIENT) {
            profileInfo = await prisma.client.update({
                where: {
                    email: userInfo.email
                },
                data: req.body
            })
        }

        return { ...profileInfo };
    } catch (error) {
        if (uploadedPublicId) {
            try {
                await cloudinaryUpload.uploader.destroy(uploadedPublicId as string);
            } catch (cleanupErr) {
                // ignore cleanup errors
            }
        }
        throw error;
    }
}
const getAllFromDB = async (params: any, options: IPaginationOptions) => {
    const { page, limit, skip } = paginationHelper.calculatePagination(options);
    const { searchTerm, ...filterData } = params;

    const andConditions: Prisma.UserWhereInput[] = [];

    if (params.searchTerm) {
        andConditions.push({
            OR: userSearchAbleFields.map(field => ({
                [field]: {
                    contains: params.searchTerm,
                    mode: 'insensitive'
                }
            }))
        })
    };

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map(key => ({
                [key]: {
                    equals: (filterData as any)[key]
                }
            }))
        })
    };

    const whereConditions: Prisma.UserWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const result = await prisma.user.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: options.sortBy && options.sortOrder ? {
            [options.sortBy]: options.sortOrder
        } : {
            createdAt: 'desc'
        },
        select: {
            id: true,
            email: true,
            role: true,
            needPasswordChange: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            admin: true,
        }
    });

    const total = await prisma.user.count({
        where: whereConditions
    });

    return {
        meta: {
            page,
            limit,
            total
        },
        data: result
    };
};

const changeProfileStatus = async (id: string, status: UserRole) => {
    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            id
        }
    });

    const updateUserStatus = await prisma.user.update({
        where: {
            id
        },
        data: status
    });

    return updateUserStatus;
};
const deleteUser = async (id: string) => {
    const deletedUser = await prisma.user.delete({
        where: {    
            id
        }
    });
    return deletedUser;
};
export const userService = {
    createAdmin,
    createClient,
    getAllFromDB,
    changeProfileStatus,
    getMyProfile,
    updateMyProfile,
    deleteUser
}