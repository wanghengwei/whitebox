#include "logging.h"
#include <boost/log/trivial.hpp>
#include <boost/log/expressions.hpp>
// 这里会变化
#include <video_platform_impl/share/netengine/BiboFrame/BiboInterfaces.h>

void setLogLevel() {
    // 设置x51的log
    // static const std::map<std::string, int> x51LevelMap = {
    //     {"Debug2", 900},
    //     {"Debug", 800},
    //     {"Info", 700},
    //     {"Error", 400},
    //     {"Critical", 300},
    //     {"Fatal", 200}
    // };
    GetLogInterface()->SetSystemPriority(700);
    boost::log::core::get()->set_filter(
        boost::log::trivial::severity >= boost::log::trivial::info
    );
}
