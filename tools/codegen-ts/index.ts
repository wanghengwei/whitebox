import { configure, renderString } from 'nunjucks';

const CMAKELISTS_TEMPLATE = `
add_library(autogen
	{% for file in files %}
	{{ file }}
	{% endfor %}
	)
	target_link_libraries(autogen proto fmt)
	target_include_directories(autogen 
		INTERFACE \${CMAKE_CURRENT_SOURCE_DIR} 
		PRIVATE \${MGC_INCLUDE_DIRS}
	)
	target_compile_options(autogen
		PUBLIC
			-Wno-deprecated-declarations
	)
	target_compile_definitions(autogen PUBLIC BOOST_ALL_DYN_LINK)
	
`;

configure({});

let data = {
    files: [
        "aaa.cpp",
        "bbb.cpp",
    ]
};

let res = renderString(CMAKELISTS_TEMPLATE, data);
console.log(res);
