#include "errors.h"

class WhiteboxErrorCategory : public std::error_category {
public:
    const char* name() const noexcept override {
        return whitebox::ERROR_CATEGORY;
    }

    std::string message(int err) const override {
        switch (whitebox::errc(err))
        {
        case whitebox::errc::OK:
            return "OK";
        case whitebox::errc::CONNECT_FAILED:
            return "Connect failed";
        case whitebox::errc::CANNOT_FIND_ROBOT:
            return "Cannot find robot";
        case whitebox::errc::CANNOT_FIND_CONNECTION:
            return "Cannot find connection";
        default:
            return "Unknown error";
        }
    }
};

namespace whitebox {
    std::error_code make_error_code(::whitebox::errc err) {
        static WhiteboxErrorCategory c;
        return std::error_code{int(err), c};
    }
}
