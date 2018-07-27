cmake_minimum_required(VERSION 3.11)

# protos
set(PROTO_SOURCES
    ${CMAKE_BINARY_DIR}/x51.grpc.pb.cc
    ${CMAKE_BINARY_DIR}/x51.grpc.pb.h
    ${CMAKE_BINARY_DIR}/x51.pb.cc
    ${CMAKE_BINARY_DIR}/x51.pb.h
    ${CMAKE_BINARY_DIR}/common.grpc.pb.cc
    ${CMAKE_BINARY_DIR}/common.grpc.pb.h
    ${CMAKE_BINARY_DIR}/common.pb.cc
    ${CMAKE_BINARY_DIR}/common.pb.h
)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin)

add_custom_command(OUTPUT ${PROTO_SOURCES}
    COMMAND protoc -I ${CMAKE_SOURCE_DIR}/protos --grpc_out=${CMAKE_BINARY_DIR} --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN} ${CMAKE_SOURCE_DIR}/protos/*.proto
    COMMAND protoc -I ${CMAKE_SOURCE_DIR}/protos --cpp_out=${CMAKE_BINARY_DIR} ${CMAKE_SOURCE_DIR}/protos/*.proto
    DEPENDS ${CMAKE_SOURCE_DIR}/protos/*.proto
)

add_library(proto ${PROTO_SOURCES})
target_include_directories(proto INTERFACE ${CMAKE_BINARY_DIR})


# generated module
add_subdirectory(autogen)


# main module
add_executable(broker 
    main.cpp
    connector_impl.cpp
    connector_manager.cpp
    connect_async_call.cpp
)
target_link_libraries(broker autogen grpc++_unsecure protobuf fruit dl pthread)
target_compile_options(broker PRIVATE -Wno-format)