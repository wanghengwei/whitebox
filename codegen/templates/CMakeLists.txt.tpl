add_library(autogen
{{range .}}
{{.Spec.EventName}}.h
{{.Spec.EventName}}.cpp
{{end}}
)
target_link_libraries(autogen proto)
target_include_directories(autogen INTERFACE ${CMAKE_CURRENT_SOURCE_DIR})
