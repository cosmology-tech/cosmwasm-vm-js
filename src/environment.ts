export interface IEnvironment {
  call_function(name: string, args: object[]): object;
}

export class Environment {
  constructor() {}

  call_function(name: string, args: object[] = []): object {
    if (name.length === 0) {
      throw new Error('Empty function name');
    }

    if (args.length === 0) {
      console.log('No arguments passed');
    }


    return {};
  }
}
