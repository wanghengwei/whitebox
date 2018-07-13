cmake_minimum_required(VERSION 3.11)

set(PROTO_SOURCES
    x51.grpc.pb.cc
    x51.grpc.pb.h
    x51.pb.cc
    x51.pb.h
)
add_custom_command(OUTPUT ${PROTO_SOURCES}
    COMMAND protoc -I ${CMAKE_SOURCE_DIR}/../protos --grpc_out=${CMAKE_BINARY_DIR} --plugin=protoc-gen-grpc=/usr/local/bin/grpc_cpp_plugin ${CMAKE_SOURCE_DIR}/../protos/x51.proto
    COMMAND protoc -I ${CMAKE_SOURCE_DIR}/../protos --cpp_out=${CMAKE_BINARY_DIR} ${CMAKE_SOURCE_DIR}/../protos/x51.proto
)

add_executable(broker main.cpp ${PROTO_SOURCES})
target_link_libraries(broker grpc_unsecure grpc++_unsecure protobuf)
target_include_directories(broker PRIVATE ${CMAKE_BINARY_DIR})