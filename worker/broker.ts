import grpc from 'grpc';

const x51 = grpc.load(`${__dirname}/../protos/x51.proto`);
export default new x51.Broker('localhost:12345', grpc.credentials.createInsecure());
