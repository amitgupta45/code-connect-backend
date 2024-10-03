import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { time } from 'console';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async createProblem(problem: {
    title: string;
    description: string;
    functionSignature: any;
    testCases: {
      input: string; 
      expectedOutput: string;
    }[];

    executionFunction: any; 
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

  async getProblems() {
    try {
      const problems = await this.prisma.problem.findMany({});
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
        'http://43.204.26.74:2358/submissions/?base64_encoded=false&wait=true',
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
}
