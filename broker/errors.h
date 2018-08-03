#pragma once
#include <system_error>
#include <type_traits>
#include <boost/exception/all.hpp>

namespace whitebox {

    using errmsg = boost::error_info<struct tag_errmsg, std::string>;

    enum class errc {
        OK, // OK
        CONNECT_FAILED, // 连接失败
        CANNOT_FIND_ROBOT, // 找不到机器人对象
        CANNOT_FIND_CONNECTION, // 找不到连接
        TIMEOUT, // 超时
        BAD_CAST, // 值转换失败
    };

    std::error_code make_error_code(::whitebox::errc err);

    const char* const ERROR_CATEGORY = "WhiteboxError";
}

namespace std {
    template<>
    struct is_error_code_enum<::whitebox::errc> : public std::true_type {};
}
