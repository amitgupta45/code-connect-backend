import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prismaService: PrismaService) {
    }

    async signIn(usr:{
        name:string;
        email:string
    }){
        try {
            const user = await this.prismaService.user.findUnique({
            where:{
                email:usr.email
            }
            });

            if(!user){
                const createUser = await this.prismaService.user.create({
                    data:{
                        name:usr.name,
                        email:usr.email
                    }
                });
               
                return createUser;
            }

            return user;
        } catch (error) {
            throw new InternalServerErrorException("Error while creating user");
            
        }


    }


}
