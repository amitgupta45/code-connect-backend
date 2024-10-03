import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';



@Controller("app")
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post("/createProblem")
  async createProblem(
    @Body()
    problem: {
      title: string;
      description: string;
      functionSignature: any;
      testCases: {
        input: string;
        expectedOutput: string;
      }[];
      executionFunction: any;
    },
  ) {

    return this.appService.createProblem(problem);

  }


  @Get("/getProblems")
  async getProblems() {
    return this.appService.getProblems();
  }

  @Post("/runCode")
  async runCode(
    @Body()
    data: {
      code: string;
      problemId: string;
      languageCode: string;
    },
  ) {
    return this.appService.runCode(data);
  }
}
