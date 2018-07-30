cmake_minimum_required(VERSION 3.11)

project(whitebox)

include(ExternalProject)
include(FetchContent)

# 第三方库都在这里安装
## fruit
ExternalProject_Add(ep_fruit
    URL http://dl.tac.com/libs/fruit/v3.1.1.zip
    # SOURCE_DIR ${CMAKE_SOURCE_DIR}/_deps/fruit
    # INSTALL_DIR ${CMAKE_SOURCE_DIR}/_stage
    CMAKE_ARGS -DCMAKE_BUILD_TYPE=$<CONFIG> -DCMAKE_INSTALL_PREFIX=<INSTALL_DIR> -DBUILD_SHARED_LIBS=OFF
)

ExternalProject_Get_Property(ep_fruit INSTALL_DIR)
include_directories(${INSTALL_DIR}/include)
link_directories(${INSTALL_DIR}/lib)

## fmt
FetchContent_Declare(fmt
    URL http://dl.tac.com/libs/fmt/fmt-5.1.0.zip
    # SOURCE_DIR ${CMAKE_SOURCE_DIR}/_deps/fmt
)
FetchContent_GetProperties(fmt)
if(NOT fmt_POPULATED)
    FetchContent_Populate(fmt)
    add_subdirectory(${fmt_SOURCE_DIR})
endif()

## Boost
find_package(Boost REQUIRED COMPONENTS log)
include_directories(${Boost_INCLUDE_DIRS})

# 梦工厂的代码
add_subdirectory(mgc)

# 收发消息代理服务
add_subdirectory(broker)