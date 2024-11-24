import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly userService: UsersService) {

    }

    @Post('checkEmail')
    async createUsers(
        @Body()
        user: {
            name: string;
            email: string;
        },
    ) {
        return this.userService.signIn(user);
    }
}
