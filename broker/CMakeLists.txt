cmake_minimum_required(VERSION 3.11)

set(PROTO_SOURCES
    x51.grpc.pb.cc
    x51.grpc.pb.h
    x51.pb.cc
    x51.pb.h
)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin)
add_custom_command(OUTPUT ${PROTO_SOURCES}
    COMMAND protoc -I ${CMAKE_SOURCE_DIR}/../protos --grpc_out=${CMAKE_BINARY_DIR} --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN} ${CMAKE_SOURCE_DIR}/../protos/x51.proto
    COMMAND protoc -I ${CMAKE_SOURCE_DIR}/../protos --cpp_out=${CMAKE_BINARY_DIR} ${CMAKE_SOURCE_DIR}/../protos/x51.proto
    DEPENDS ${CMAKE_SOURCE_DIR}/../protos/x51.proto
)

add_executable(broker main.cpp ${PROTO_SOURCES})
target_link_libraries(broker grpc++_unsecure protobuf)
target_include_directories(broker PRIVATE ${CMAKE_BINARY_DIR})