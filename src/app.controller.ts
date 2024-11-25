import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
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
      functionSignature: string;
      testCases: {
        input: string; 
        expectedOutput: string;
      }[];
  
      executionFunction: string; 
      status: string;
      category: string;
      difficulty: string;
      language: string;

    },
  ) {

    console.log(problem);
    return this.appService.createProblem(problem);

  }


  @Get("/getProblems")
  async getProblems(@Query("userId") userId: string) {
    return this.appService.getProblems(userId);
  }

  @Get('getProblemsPreview')
  async getProblemsPreview(@Query("problemId") problemId: string) {
    return this.appService.getProblemsPreview(problemId);
  }


  @Get("/getProblemById")
  async getProblemById(@Query("problemId") problemId: string) {
    return this.appService.getProblemById(problemId);
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

  // id String @id @default(auto()) @map("_id") @db.ObjectId
  // userId String
  // problemId String
  // code String
  // language String
  // status String
  // noOfTestCasesPassed Int
  // createdAt DateTime @default(now())
  // updatedAt DateTime @updatedAt

  @Post("/submitCode")
  async submitCode(
    @Body()
    data: {
      code: string;
      problemId: string;
      languageCode: string;
      userId: string;
     
    },
  ) {
    return this.appService.submitCode(data);
  }

  @Delete("/deleteProblem")
  async deleteProblem(@Query("problemId") problemId: string) {
    return this.appService.deleteProblem(problemId);
  }
}
