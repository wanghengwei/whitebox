syntax = "proto3";

import "common.proto";

service Broker {
    
    rpc Connect (ConnectParams) returns (Result);

    {{range .}}
    rpc {{.Metadata.Name}} (ConnectionIdentity) returns (Result);
    {{end}}
}
