#pragma once

// 是负责处理某类远程rpc请求的类。每种grpc请求都对应一个这种类型。不会特别多，每个动作有一个吧，也不是很少就是了
// 远程每来一个请求就会new一个新的实例。
class AsyncCall {
public:
    enum class State {
        CREATE, PROCESS, FINISH,
    };
public:
    virtual ~AsyncCall() {}
    
    virtual void proceed() = 0;
};
