#pragma once

class AsyncCall {
public:
    enum class State {
        CREATE, PROCESS, FINISH,
    };
public:
    virtual ~AsyncCall() {}
    
    virtual void proceed() = 0;
};
