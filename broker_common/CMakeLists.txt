cmake_minimum_required(VERSION 3.11)

include(ExternalProject)
include(FetchContent)

# 第三方库都在这里安装
## fruit
ExternalProject_Add(ep_fruit
    URL http://dl.tac.com/libs/fruit/v3.1.1.zip
    SOURCE_DIR ${CMAKE_BINARY_DIR}/_deps/fruit-src
    INSTALL_DIR ${CMAKE_BINARY_DIR}/_deps/fruit
    CMAKE_ARGS -DCMAKE_BUILD_TYPE=$<CONFIG> -DCMAKE_INSTALL_PREFIX=<INSTALL_DIR> -DBUILD_SHARED_LIBS=OFF
)
ExternalProject_Get_Property(ep_fruit INSTALL_DIR)
add_library(fruit INTERFACE IMPORTED)
target_include_directories(fruit INTERFACE ${INSTALL_DIR}/include)
find_library(fruit_lib fruit HINTS ${INSTALL_DIR}/lib)
message(${fruit_lib})
target_link_libraries(fruit INTERFACE ${fruit_lib})

## fmt
FetchContent_Declare(fmt
    URL http://dl.tac.com/libs/fmt/fmt-5.1.0.zip
)
FetchContent_GetProperties(fmt)
if(NOT fmt_POPULATED)
    FetchContent_Populate(fmt)
    add_subdirectory(${fmt_SOURCE_DIR} ${fmt_BINARY_DIR})
endif()

## Boost
find_package(Boost REQUIRED COMPONENTS log)
include_directories(${Boost_INCLUDE_DIRS})

# 通用 protos
set(PROTO_SOURCES
    ${CMAKE_CURRENT_BINARY_DIR}/common.grpc.pb.cc
    ${CMAKE_CURRENT_BINARY_DIR}/common.grpc.pb.h
    ${CMAKE_CURRENT_BINARY_DIR}/common.pb.cc
    ${CMAKE_CURRENT_BINARY_DIR}/common.pb.h
)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin)
add_custom_command(OUTPUT ${PROTO_SOURCES}
    COMMAND protoc -I ${CMAKE_CURRENT_SOURCE_DIR}/protos --grpc_out=${CMAKE_CURRENT_BINARY_DIR} --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN} ${CMAKE_CURRENT_SOURCE_DIR}/protos/*.proto
    COMMAND protoc -I ${CMAKE_CURRENT_SOURCE_DIR}/protos --cpp_out=${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/protos/*.proto
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/protos/*.proto
)
add_library(proto_common ${PROTO_SOURCES})
target_include_directories(proto_common INTERFACE ${CMAKE_CURRENT_BINARY_DIR})

# 设置一下common proto的proto文件所在目录，以便别的地方可以获得到
set(PROTO_COMMON_PROTO_DIR ${CMAKE_CURRENT_SOURCE_DIR}/protos PARENT_SCOPE)
set(PROTO_COMMON_INCLUDE_DIR ${CMAKE_CURRENT_BINARY_DIR} PARENT_SCOPE)

# main module
add_library(broker_common
    main.cpp
    app.cpp
    errors.cpp
    # connector_impl.cpp
    # connector_manager.cpp
    # server.cpp
    robot_manager.cpp
    connect_async_call.cpp
    robot_setup_async_call.cpp
    robot_teardown_async_call.cpp
    # connection_impl.cpp
    robot.cpp
    logging.cpp

    ${PROTO_SOURCES}
)
target_link_libraries(broker_common grpc++_unsecure protobuf fruit dl pthread ${Boost_LIBRARIES} fmt)
# target_compile_options(broker_common PRIVATE -Wno-format -Wno-deprecated-declarations -include limits.h)
target_compile_definitions(broker_common PUBLIC BOOST_ALL_DYN_LINK)
target_include_directories(broker_common 
    PUBLIC 
        # ${PROJ_INCLUDE_DIRS}
        ${CMAKE_CURRENT_BINARY_DIR}
    INTERFACE
        ${CMAKE_CURRENT_SOURCE_DIR}
)
