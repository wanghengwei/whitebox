import grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';

const PROJ_NAME = process.env.PROJ || "mgc";

const PROTO_PATH = `broker.proto`;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    // keepCase: true,
    // longs: String,
    // enums: String,
    // defaults: true,
    // oneofs: true,
    includeDirs: [`${__dirname}/../${PROJ_NAME}/protos`, `${__dirname}/../broker_common/protos`],
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const commonService = new protoDescriptor.CommonService('localhost:12345', grpc.credentials.createInsecure());
const brokerService = new protoDescriptor.Broker('localhost:12345', grpc.credentials.createInsecure());

export {commonService, brokerService};

// const proto = grpc.load(`${__dirname}/../mgc/protos/broker.proto`);
// const brokerService = new proto.Broker('localhost:12345', grpc.credentials.createInsecure());
// export default new proto.Broker('localhost:12345', grpc.credentials.createInsecure());
