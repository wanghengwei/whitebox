cmake_minimum_required(VERSION 3.11)

project(whitebox)

include(ExternalProject)


# third party libs
## fruit
ExternalProject_Add(ep_fruit
    URL http://dl.tac.com/libs/fruit/v3.1.1.zip
    # SOURCE_DIR ${CMAKE_SOURCE_DIR}/_deps/fruit
    # INSTALL_DIR ${CMAKE_SOURCE_DIR}/_stage
    CMAKE_ARGS -DCMAKE_BUILD_TYPE=$<CONFIG> -DCMAKE_INSTALL_PREFIX=<INSTALL_DIR> -DBUILD_SHARED_LIBS=OFF
)

# include_directories(${CMAKE_SOURCE_DIR}/_stage/include)

# find_library(FRUIT_LIB fruit)
ExternalProject_Get_Property(ep_fruit INSTALL_DIR)
include_directories(${INSTALL_DIR}/include)
link_directories(${INSTALL_DIR}/lib)


add_subdirectory(mgc)

add_subdirectory(broker)