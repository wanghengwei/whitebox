package ent

import "fmt"

type Metadata struct {
	Name           string   `yaml:"name"`
	IncludeHeaders []string `yaml:"include_headers"`
	FullName       string
}

func (m *Metadata) fill(o Entity, defaultName string) {
	if len(m.Name) == 0 {
		m.Name = defaultName
	}

	m.FullName = fmt.Sprintf("%s%s%s", o.Class(), o.Order(), m.Name)
}

type HeaderCpp struct {
	HeaderFileName string
	CppFileName    string
}

func (h *HeaderCpp) OutputFileNames() []string {
	return []string{
		h.HeaderFileName,
		h.CppFileName,
	}
}

func (h *HeaderCpp) init(m *Metadata) {
	h.HeaderFileName = fmt.Sprintf("%s.h", m.FullName)
	h.CppFileName = fmt.Sprintf("%s.cpp", m.FullName)
}
