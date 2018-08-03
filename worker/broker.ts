import grpc from 'grpc';

export const proto = grpc.load(`${__dirname}/../protos/x51.proto`);
export default new proto.Broker('localhost:12345', grpc.credentials.createInsecure());
