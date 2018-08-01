add_library(autogen
{{range .}}
{{.Metadata.Name}}.h
{{.Metadata.Name}}.cpp
{{end}}
)
target_link_libraries(autogen proto fmt)
target_include_directories(autogen 
    INTERFACE ${CMAKE_CURRENT_SOURCE_DIR} 
    PRIVATE ${MGC_INCLUDE_DIRS}
)
target_compile_options(autogen
    PUBLIC
        -Wno-deprecated-declarations
)
