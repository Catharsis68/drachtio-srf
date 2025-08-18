import { GenericContainer, Wait, PullPolicy, StreamLog } from 'testcontainers';
import path from 'path';

export default async () => {
  const container = await new GenericContainer('drachtio/drachtio-server:latest')
    .withExposedPorts(5060)
    .withBindMounts([{ source: path.resolve(__dirname, 'scenarios'), target: '/tmp/scenarios' }])
    .withWaitStrategy(Wait.forLogMessage('starting sip stack on sip:*;transport=udp,tcp'))
    .withPullPolicy(PullPolicy.defaultPolicy())
    .withLogConsumer((stream) => stream.pipe(process.stdout))
    .start();

  process.env.DRACHTIO_HOST = container.getHost();
  process.env.DRACHTIO_PORT = container.getMappedPort(5060).toString();
};
