package ent

import (
	"os"
	"path"
	"text/template"

	"github.com/Masterminds/sprig"
)

func executeTemplate(tpl string, root string, outfile string, data interface{}) error {
	f, err := os.Create(path.Join(root, outfile))
	if err != nil {
		return err
	}
	defer f.Close()

	return template.Must(template.New("").Funcs(sprig.TxtFuncMap()).Parse(tpl)).Execute(f, data)
}
