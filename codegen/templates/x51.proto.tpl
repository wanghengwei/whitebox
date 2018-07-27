syntax = "proto3";

import "common.proto";

service Broker {
    
    rpc Connect (ConnectParams) returns (Result);

    {{range .}}
    rpc {{.ActionType | trimSuffix "Event"}}{{.Spec.EventName}} (ConnectionIdentity) returns (Result);
    {{end}}
}
