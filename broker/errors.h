#pragma once
#include <system_error>
#include <type_traits>

namespace whitebox {
    enum class errc {
        OK, //OK
        CONNECT_FAILED, //连接失败
    };

    const char* const ERROR_CATEGORY = "WhiteboxError";
}

namespace std {
    template<>
    struct is_error_code_enum<::whitebox::errc> : public std::true_type {};

    std::error_code make_error_code(::whitebox::errc err);
}
