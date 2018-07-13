var rxjs = require('rxjs');
var ops = require('rxjs/operators');

var PROTO_PATH = __dirname + '/../protos/x51.proto';

var grpc = require('grpc');
var broker_proto = grpc.load(PROTO_PATH).x51;

function main() {
    var client = new broker_proto.Broker('localhost:11111', grpc.credentials.createInsecure());
    console.log('Connect BEGIN');

    // console.log(client.Connect);

    let foo = (ip, port, cb) => {
        client.Connect({ip: ip, port: port}, cb);
    }

    rxjs.bindCallback(foo)('172.17.100.80', 8080).subscribe(console.log, console.error, console.log('DONE'));
    // client.Connect({ip: "172.17.100.80", port: 8080}, (err, resp) => {
    //     console.log('Connect END');
    //     if (err != null) {
    //         console.error(err);
    //         return;
    //     }

    //     console.log('Response: ', resp);
    // });
}

main();
