syntax = "proto3";

import "common.proto";

service Broker {
    {{range .}}
    rpc {{.ActionType | trimSuffix "Event"}}{{.Spec.EventName}} (ConnectionIdentity) returns (Result);
    {{end}}
}
