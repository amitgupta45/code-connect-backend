import { HttpException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { time } from 'console';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}
  async createProblem(problem: {
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


  }) {
    try {
      const TestCasesWithId = [];

      for (let i = 0; i < problem.testCases.length; i++) {
        const id = uuidv4();
        TestCasesWithId.push({ ...problem.testCases[i], id: id });
      }

      

      const newProblem = await this.prisma.problem.create({
        data: {
          description: problem.description,
          functionSignature: problem.functionSignature,
          title: problem.title,
          testCases: TestCasesWithId,
          executionFunction: problem.executionFunction,
          category: problem.category,
          difficulty: problem.difficulty,
          status: problem.status,
          language: problem.language,

        },
      });

      if (!newProblem)
        throw new InternalServerErrorException('Problem Not Created');

      return newProblem;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async getProblems(userId:string) {
    try {
      const problems = await this.prisma.problem.findMany({});

   

      //find the problems that are solved by the user
      console.log(userId);
    if(userId){
       const isTheProblemSolvedByCurrentUser = problems.map((problem) => {
        return {
          ...problem,
          isCompleted: problem.completedBy.includes(userId),
        }
      });
      return isTheProblemSolvedByCurrentUser;
    }
      return problems;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async evaluateCodeByJudge0(data: {
    code: string;
    problemId: string;
    languageCode: string;

   testCases:{
    input: string;
    expectedOutput: string;
   }[]
  }) {
    try {

      const reqTest = data.testCases.map((item) => item.input).join('\n').trim();
      const combinedInput = `${(data.testCases.length)}\n${reqTest}`;

      const reqExpOut = data.testCases.map((item) => item.expectedOutput).join('\n');

      console.log(combinedInput,reqExpOut)


      
      const response = await fetch(
        'http://152.42.159.99:2358/submissions/?base64_encoded=false&wait=true',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            source_code: data.code,
            language_id: data.languageCode,
            stdin: combinedInput,
            expected_output: reqExpOut,
          }),
        },
      );

      const jsonResponse = await response.json();

      console.log(jsonResponse);



      //compare the output with expected output

      let TestCasePassed = [];

      const output = jsonResponse.stdout?.trim();
      const expectedOutput = reqExpOut;

      const outputArr = output?.split('\n');
      const expectedOutputArr = expectedOutput?.split('\n');

      if(outputArr?.length>0){

      for (let i = 0; i < outputArr.length; i++) {
        if (outputArr[i] === expectedOutputArr[i]) {
          TestCasePassed.push({
        
            output: outputArr[i],
            expectedOutput: expectedOutputArr[i],
            passed: true,
          });
        } else {
          TestCasePassed.push({
            
         
            output: outputArr[i],
            expectedOutput: expectedOutputArr[i],
            passed: false,
          });
        }
      }
    }

      console.log(TestCasePassed);

      return {
        TestCasePassed: TestCasePassed,
        time: jsonResponse.time,
        token: jsonResponse.token,
        compile_output: jsonResponse.compile_output,
        status: jsonResponse.status,
      };

      
     
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async runCode(data: {
    code: string;
    problemId: string;
    languageCode: string;
  }) {
    try {
      const problem = await this.prisma.problem.findUnique({
        where: {
          id: data.problemId,
        },
      });

      if (!problem) throw new InternalServerErrorException('Problem Not Found');

      const testCases = problem.testCases;

      console.log(testCases);


     return await this.evaluateCodeByJudge0({
        code: data.code,
        problemId: data.problemId,
        languageCode: data.languageCode,
       testCases: testCases,
      });

    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async getProblemById(problemId: string) {
    try {
      const problem = await this.prisma.problem.findUnique({
        where: {
          id: problemId,
        },
      });

      if (!problem) throw new InternalServerErrorException('Problem Not Found');

      return problem;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }


  async submitCode(data: {

    code: string;
    problemId: string;
    languageCode: string;
    userId: string;
  }) {
    try {
      const problem = await this.prisma.problem.findUnique({
        where: {
          id: data.problemId,
        },
      });

      if (!problem) throw new InternalServerErrorException('Problem Not Found');

      const testCases = problem.testCases;

      const result = await this.evaluateCodeByJudge0({
        code: data.code,
        problemId: data.problemId,
        languageCode: data.languageCode,
        testCases: testCases,
      });

      if(result.status.id==6){
        throw new HttpException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          error: 'Compilation Error',
        }, HttpStatus.UNPROCESSABLE_ENTITY, {
          cause: "Compilation Error"
        });

      
      }

      // TestCasePassed: TestCasePassed,
      // time: jsonResponse.time,
      // token: jsonResponse.token,
      // compile_output: jsonResponse.compile_output,
      // status: jsonResponse.status,

      const noOfTestCasesPassed = result.TestCasePassed.filter(
        (item) => item.passed === true,
      ).length;

      const isSubmissionExist = await this.prisma.submission.findFirst({
        where: {
          userId: data.userId,
          problemId: data.problemId,
        },
      });

      if(isSubmissionExist){
        await this.prisma.submission.update({
          where:{
            id:isSubmissionExist.id
          },
          data:{
            code:data.code,
            status:this.getStatusMapToMessage(result.status.id),
            noOfTestCasesPassed:noOfTestCasesPassed
          }
        })
      }

      const newSubmission = await this.prisma.submission.create({
        data: {
          code: data.code,
          problemId: data.problemId,
          language: data.languageCode,
          status: this.getStatusMapToMessage(result.status.id), 
          noOfTestCasesPassed: noOfTestCasesPassed,
          userId: data.userId,
        },
      });

      await this.prisma.problem.update({
        where:{
          id:data.problemId
        },
        data:{
          completedBy:{
            push:data.userId
          }
        }
      })

      return newSubmission;

    } catch (error) {

      if(error.status==422){
        throw new HttpException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          error: 'Compilation Error',
        }, HttpStatus.UNPROCESSABLE_ENTITY, {
          cause: "Compilation Error"
        });
        
      }
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');

    }

  }

  getStatusMapToMessage(status: number) {
    switch (status) {
      case 1:
        return 'In Queue';
      case 2:
        return 'Processing';
      case 3:
        return 'All Test Cases Passed Successfully';
      case 4:
        return 'Some Test Cases Failed';
      case 5:
        return 'Runtime Error';
      case 6:
        return 'Compilation Error';
      case 7:
        return 'Time Limit Exceeded';
      case 8:
        return 'Memory Limit Exceeded';
      case 9:
        return 'Output Limit Exceeded';
      case 10:
        return 'Presentation Error';

      default:
        return 'Unknown Status';
    }
  }


  async getProblemsPreview(problemId: string) {
    try {
      const problem = await this.prisma.problem.findUnique({
        where: {
          id: problemId,
        
        },
       include:{
      
       }
      });

      if (!problem) throw new InternalServerErrorException('Problem Not Found');

      return problem;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async deleteProblem(problemId: string) {
    try {
      const problem = await this.prisma.problem.delete({
        where: {
          id: problemId,
        },
      });

      await this.prisma.submission.deleteMany({
        where: {
          problemId: problemId,
        },
      });

      return problem;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal Server Error');
    }

  }

  }