import { spawn } from 'child_process';
import { GenericContainer, Wait, DockerComposeEnvironment } from 'testcontainers';

//const debug = require('debug')('test:sipp');
let network: string;
let output = '';
let idx = 1;

function clearOutput() {
  output = '';
}

function addOutput(str: string) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) < 128) output += str.charAt(i);
  }
}

export const sippUac = (file: string) => {
  const cmd = 'docker';
  const args = [
    'run', '--rm', '--pull=false', '--net', `${network}`,
    '-v', `${__dirname}/scenarios:/tmp/scenarios`,
    'drachtio/sipp', 'sipp', '-sf', `/tmp/scenarios/${file}`,
    '-m', '1',
    '-sleep', '250ms',
    '-nostdin',
    '-cid_str', `%u-%p@%s-${idx++}`,
    'drachtio-sut'
  ];

  clearOutput();

  return new Promise<void>((resolve, reject) => {
    const child_process = spawn(cmd, args, {stdio: ['inherit', 'pipe', 'pipe']});

    child_process.on('exit', (code, signal) => {
      if (code === 0) {
        return resolve();
      }
      console.log(`sipp exited with non-zero code ${code} signal ${signal}`);
      reject(code);
    });
    child_process.on('error', (error) => {
      console.log(`error spawing child process for docker: ${args}`);
    });

    child_process.stdout.on('data', (data) => {
      //debug(`stdout: ${data}`);
      addOutput(data.toString());
    });
    child_process.stderr.on('data', (data) => {
      //debug(`stdout: ${data}`);
      addOutput(data.toString());
    });
  });
};

export class DockerCompose {
  private readonly composeFilePath: string;

  constructor(composeFilePath: string) {
    this.composeFilePath = composeFilePath;
  }

  public async up(): Promise<DockerComposeEnvironment> {
    const up = spawn('docker-compose', [
      '-f',
      this.composeFilePath,
      'up',
      '-d',
    ]);
    return new Promise((resolve, reject) => {
      up.on('exit', (code) => {
        if (code === 0) {
          resolve(new DockerComposeEnvironment());
        } else {
          reject(new Error(`docker-compose up failed with code ${code}`));
        }
      });
    });
  }
}
export { DockerComposeEnvironment };
