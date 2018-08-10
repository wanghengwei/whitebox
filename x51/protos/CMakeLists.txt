# 必须在添加此子目录前设置好变量 PROTO_COMMON_PROTO_DIR ，指向 broker里面的 common protos 目录
# 还必须设置 PROTO_COMMON_INCLUDE_DIR 

# 这个文件和mgc的一模一样，考虑弄个公共的

set(PROTO_SOURCES
    ${CMAKE_CURRENT_BINARY_DIR}/broker.grpc.pb.cc
    ${CMAKE_CURRENT_BINARY_DIR}/broker.grpc.pb.h
    ${CMAKE_CURRENT_BINARY_DIR}/broker.pb.cc
    ${CMAKE_CURRENT_BINARY_DIR}/broker.pb.h
)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin)

message(${PROTO_COMMON_PROTO_DIR})
message(${PROTO_COMMON_INCLUDE_DIR})
add_custom_command(OUTPUT ${PROTO_SOURCES}
    COMMAND protoc -I ${CMAKE_CURRENT_SOURCE_DIR} -I ${PROTO_COMMON_PROTO_DIR} --grpc_out=${CMAKE_CURRENT_BINARY_DIR} --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN} ${CMAKE_CURRENT_SOURCE_DIR}/*.proto
    COMMAND protoc -I ${CMAKE_CURRENT_SOURCE_DIR} -I ${PROTO_COMMON_PROTO_DIR} --cpp_out=${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/*.proto
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/*.proto
)

add_library(proto_broker ${PROTO_SOURCES})
target_include_directories(proto_broker INTERFACE ${CMAKE_CURRENT_BINARY_DIR})
target_link_libraries(proto_broker proto_common)

# 这个目录是 broker protos 自动生成的头文件所在目录。 broker 模块需要
# set(PROTO_BROKER_INCLUDE_DIR ${CMAKE_CURRENT_BINARY_DIR} PARENT_SCOPE)
